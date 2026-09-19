import type { AnalysisErrorCode, AnalysisStatus } from "@/domain/wine-types";
import type { WineRecord } from "../database/schema";
import type { PhotoStorage } from "../photo-storage/photo-storage";
import {
  RecordNotFoundError,
  type WineChanges,
  type WineRepository,
} from "../repository/wine-repository";
import type { WineResearch } from "../wine-intelligence/schemas";
import {
  WineIntelligenceError,
  type WineIdentity,
  type WineIntelligence,
} from "../wine-intelligence/wine-intelligence";
import { AiBudgetExceededError, type AiBudgetGuard } from "./ai-budget-guard";

export type AnalysisMode = "full" | "researchOnly";

export interface WineAnalysisDependencies {
  wineRepository: WineRepository;
  photoStorage: PhotoStorage;
  wineIntelligence: WineIntelligence;
  aiBudgetGuard: AiBudgetGuard;
}

const RETRYABLE_ERROR_CODES: ReadonlySet<AnalysisErrorCode> = new Set([
  "unavailable",
  "missingApiKey",
  "invalidApiKey",
  "budgetExceeded",
]);

class LabelUnreadableError extends Error {}

function toErrorCode(error: unknown): AnalysisErrorCode {
  if (error instanceof LabelUnreadableError) return "labelUnreadable";
  if (error instanceof AiBudgetExceededError) return "budgetExceeded";
  if (error instanceof WineIntelligenceError) return error.reason;
  return "unexpected";
}

function toIdentity(wine: WineRecord): WineIdentity {
  const { producer, name, vintage, country, region, appellation, grapeVarieties, wineType } = wine;
  return { producer, name, vintage, country, region, appellation, grapeVarieties, wineType };
}

/** Research only fills identity fields the label did not provide. */
function mergeResearch(wine: WineRecord, research: WineResearch): WineChanges {
  const { country, region, grapeVarieties, wineType, ...assessment } = research;
  return {
    ...assessment,
    country: wine.country ?? country,
    region: wine.region ?? region,
    grapeVarieties: wine.grapeVarieties.length > 0 ? wine.grapeVarieties : grapeVarieties,
    wineType: wine.wineType ?? wineType,
    analyzedAt: new Date(),
    analysisError: null,
  };
}

export class WineAnalysisService {
  constructor(private readonly dependencies: WineAnalysisDependencies) {}

  /** Never rejects: the outcome, including failures, is written to the wine row. */
  async analyzeWine(wineId: number, mode: AnalysisMode): Promise<void> {
    const { wineRepository } = this.dependencies;
    const wineBefore = wineRepository.findWineById(wineId);
    if (wineBefore === null) return;
    const isAlreadyComplete = wineBefore.analysisStatus === "complete";

    try {
      wineRepository.updateWine(wineId, { analysisStatus: "analyzing", analysisError: null });
      const wineWithIdentity = mode === "full" ? await this.readLabel(wineBefore) : wineBefore;
      if (mode === "full" && this.markDuplicate(wineWithIdentity)) return;
      await this.researchAndStore(wineWithIdentity, isAlreadyComplete);
    } catch (error) {
      this.recordFailure(wineId, error, isAlreadyComplete);
    }
  }

  private async readLabel(wine: WineRecord): Promise<WineRecord> {
    const { wineRepository, photoStorage, wineIntelligence, aiBudgetGuard } = this.dependencies;
    aiBudgetGuard.assertCallAllowed();
    const photoBytes = await photoStorage.readLabelPhoto(wine.photoFileName);
    const labelResult = await wineIntelligence.analyzeLabel({
      base64Data: photoBytes.toString("base64"),
      mediaType: "image/jpeg",
    });
    aiBudgetGuard.recordCall("analyzeLabel", labelResult.usage);

    const { isWineLabel, ...labelFields } = labelResult.value;
    if (!isWineLabel) throw new LabelUnreadableError();
    return wineRepository.updateWine(wine.id, labelFields);
  }

  private markDuplicate(wine: WineRecord): boolean {
    const { wineRepository } = this.dependencies;
    const existingWine = wineRepository.findCompleteWineByIdentity(wine, wine.id);
    if (existingWine === null) return false;

    wineRepository.updateWine(wine.id, {
      duplicateOfWineId: existingWine.id,
      analysisStatus: "awaitingConfirmation",
    });
    return true;
  }

  private async researchAndStore(wine: WineRecord, isAlreadyComplete: boolean): Promise<void> {
    const { wineRepository, wineIntelligence, aiBudgetGuard } = this.dependencies;
    aiBudgetGuard.assertCallAllowed();
    const researchResult = await wineIntelligence.researchWine(toIdentity(wine));
    aiBudgetGuard.recordCall("researchWine", researchResult.usage);

    const nextStatus: AnalysisStatus = isAlreadyComplete ? "complete" : "awaitingConfirmation";
    wineRepository.updateWine(wine.id, {
      ...mergeResearch(wine, researchResult.value),
      analysisStatus: nextStatus,
    });
  }

  private recordFailure(wineId: number, error: unknown, isAlreadyComplete: boolean): void {
    const errorCode = toErrorCode(error);
    if (errorCode === "unexpected") console.error("Wine analysis failed unexpectedly", error);

    let nextStatus: AnalysisStatus = RETRYABLE_ERROR_CODES.has(errorCode) ? "pending" : "failed";
    if (isAlreadyComplete) nextStatus = "complete";
    try {
      this.dependencies.wineRepository.updateWine(wineId, {
        analysisStatus: nextStatus,
        analysisError: errorCode,
      });
    } catch (updateError) {
      if (updateError instanceof RecordNotFoundError) return;
      console.error("Failed to record wine analysis failure", updateError);
    }
  }
}
