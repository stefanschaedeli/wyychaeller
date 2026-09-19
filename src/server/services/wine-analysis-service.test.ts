import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { PhotoStorage } from "../photo-storage/photo-storage";
import { AiUsageRepository } from "../repository/ai-usage-repository";
import { SettingsRepository } from "../repository/settings-repository";
import { WineRepository } from "../repository/wine-repository";
import { RecordedWineIntelligence } from "../wine-intelligence/recorded-wine-intelligence";
import { WineIntelligenceError } from "../wine-intelligence/wine-intelligence";
import { AiBudgetGuard } from "./ai-budget-guard";
import { WineAnalysisService } from "./wine-analysis-service";

let photoDirectory: string;
let wineRepository: WineRepository;
let settingsRepository: SettingsRepository;
let wineIntelligence: RecordedWineIntelligence;
let service: WineAnalysisService;
let photoStorage: PhotoStorage;

async function createWineWithPhoto(): Promise<number> {
  const imageBytes = await sharp({
    create: { width: 50, height: 50, channels: 3, background: "#ffffff" },
  })
    .jpeg()
    .toBuffer();
  return wineRepository.createPendingWine(await photoStorage.storeLabelPhoto(imageBytes)).id;
}

beforeEach(async () => {
  photoDirectory = await mkdtemp(path.join(tmpdir(), "weinkeller-analysis-"));
  const database = openDatabase(IN_MEMORY_DATABASE);
  wineRepository = new WineRepository(database);
  settingsRepository = new SettingsRepository(database);
  photoStorage = new PhotoStorage(photoDirectory);
  wineIntelligence = new RecordedWineIntelligence();
  const aiBudgetGuard = new AiBudgetGuard(
    new AiUsageRepository(database),
    settingsRepository,
    () => new Date(),
  );
  service = new WineAnalysisService({
    wineRepository,
    photoStorage,
    wineIntelligence,
    aiBudgetGuard,
  });
});

afterEach(async () => {
  await rm(photoDirectory, { recursive: true, force: true });
});

describe("WineAnalysisService.analyzeWine", () => {
  it("reads the label, researches the wine and waits for confirmation", async () => {
    const wineId = await createWineWithPhoto();

    await service.analyzeWine(wineId, "full");

    const wine = wineRepository.findWineById(wineId);
    expect(wine).toMatchObject({
      analysisStatus: "awaitingConfirmation",
      producer: "Marchesi Antinori",
      vintage: 2018,
      aggregateScore: 95,
      drinkUntilYear: 2038,
      confidence: "researched",
      analysisError: null,
    });
    expect(wine?.analyzedAt).toBeInstanceOf(Date);
  });

  it("detects duplicates before paying for research", async () => {
    const firstWineId = await createWineWithPhoto();
    await service.analyzeWine(firstWineId, "full");
    wineRepository.updateWine(firstWineId, { analysisStatus: "complete", bottleCount: 6 });
    const researchSpy = vi.spyOn(wineIntelligence, "researchWine");

    const secondWineId = await createWineWithPhoto();
    await service.analyzeWine(secondWineId, "full");

    expect(wineRepository.findWineById(secondWineId)).toMatchObject({
      analysisStatus: "awaitingConfirmation",
      duplicateOfWineId: firstWineId,
    });
    expect(researchSpy).not.toHaveBeenCalled();
  });

  it("marks photos without a wine label as failed", async () => {
    const wineId = await createWineWithPhoto();
    vi.spyOn(wineIntelligence, "analyzeLabel").mockResolvedValue({
      value: {
        isWineLabel: false,
        producer: null,
        name: null,
        vintage: null,
        country: null,
        region: null,
        appellation: null,
        grapeVarieties: [],
        wineType: null,
        alcoholPercent: null,
      },
      usage: { inputTokens: 1, outputTokens: 1 },
    });

    await service.analyzeWine(wineId, "full");

    expect(wineRepository.findWineById(wineId)).toMatchObject({
      analysisStatus: "failed",
      analysisError: "labelUnreadable",
    });
  });

  it("keeps the wine retryable when the AI service is unreachable", async () => {
    const wineId = await createWineWithPhoto();
    vi.spyOn(wineIntelligence, "analyzeLabel").mockRejectedValue(
      new WineIntelligenceError("unavailable"),
    );

    await service.analyzeWine(wineId, "full");

    expect(wineRepository.findWineById(wineId)).toMatchObject({
      analysisStatus: "pending",
      analysisError: "unavailable",
    });
  });

  it("stops before calling the AI when the monthly budget is used up", async () => {
    const wineId = await createWineWithPhoto();
    settingsRepository.setMonthlyAiCallLimit(1);
    await service.analyzeWine(await createWineWithPhoto(), "full");
    const labelSpy = vi.spyOn(wineIntelligence, "analyzeLabel");

    await service.analyzeWine(wineId, "full");

    expect(labelSpy).not.toHaveBeenCalled();
    expect(wineRepository.findWineById(wineId)?.analysisError).toBe("budgetExceeded");
  });

  it("re-rates a complete wine without losing data when research fails", async () => {
    const wineId = await createWineWithPhoto();
    await service.analyzeWine(wineId, "full");
    wineRepository.updateWine(wineId, { analysisStatus: "complete", bottleCount: 6 });
    vi.spyOn(wineIntelligence, "researchWine").mockRejectedValue(
      new WineIntelligenceError("invalidResponse"),
    );

    await service.analyzeWine(wineId, "researchOnly");

    expect(wineRepository.findWineById(wineId)).toMatchObject({
      analysisStatus: "complete",
      analysisError: "invalidResponse",
      aggregateScore: 95,
      bottleCount: 6,
    });
  });
});
