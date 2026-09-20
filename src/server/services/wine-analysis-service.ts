import type { AnalysisErrorCode, AnalysisStatus } from "@/domain/wine-types";
import type { WineRecord } from "../database/schema";
import { createLogger } from "../logging/logger";
import type { PhotoStorage } from "../photo-storage/photo-storage";
import { RecordNotFoundError } from "../repository/errors";
import type { WineChanges, WineRepository } from "../repository/wine-repository";
import type { WineResearch } from "../wine-intelligence/schemas";
import {
  WineIntelligenceError,
  type WineIdentity,
  type WineIntelligence,
} from "../wine-intelligence/wine-intelligence";
import { AiBudgetExceededError, type AiBudgetGuard } from "./ai-budget-guard";

const logger = createLogger("analysis");

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
    const startedAt = Date.now();
    logger.info("Analysis started", { wineId, mode, previousStatus: wineBefore.analysisStatus });

    try {
      wineRepository.updateWine(wineId, { analysisStatus: "analyzing", analysisError: null });
      const wineWithIdentity = mode === "full" ? await this.readLabel(wineBefore) : wineBefore;
      if (mode === "full" && this.markDuplicate(wineWithIdentity)) return;
      await this.researchAndStore(wineWithIdentity, isAlreadyComplete);
      const status = wineRepository.findWineById(wineId)?.analysisStatus;
      logger.info("Analysis finished", { wineId, status, durationMs: Date.now() - startedAt });
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
    const { producer, name, vintage } = labelFields;
    logger.info("Label read", { wineId: wine.id, producer, name, vintage, ...labelResult.usage });
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
    logger.info("Duplicate found, research skipped", {
      wineId: wine.id,
      duplicateOfWineId: existingWine.id,
      status: "awaitingConfirmation",
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
    const { aggregateScore, drinkFromYear, drinkUntilYear, confidence } = researchResult.value;
    logger.info("Research stored", {
      wineId: wine.id,
      aggregateScore,
      drinkFromYear,
      drinkUntilYear,
      confidence,
      ...researchResult.usage,
    });
  }

  private recordFailure(wineId: number, error: unknown, isAlreadyComplete: boolean): void {
    const errorCode = toErrorCode(error);
    const isRetryable = RETRYABLE_ERROR_CODES.has(errorCode);
    let nextStatus: AnalysisStatus = isRetryable ? "pending" : "failed";
    if (isAlreadyComplete) nextStatus = "complete";

    const fields = { wineId, code: errorCode, status: nextStatus, isRetryable };
    if (errorCode === "unexpected") logger.error("Analysis failed", { ...fields, error });
    else logger.warn("Analysis failed", fields);
    try {
      this.dependencies.wineRepository.updateWine(wineId, {
        analysisStatus: nextStatus,
        analysisError: errorCode,
      });
    } catch (updateError) {
      if (updateError instanceof RecordNotFoundError) return;
      logger.error("Failed to record wine analysis failure", { wineId, error: updateError });
    }
  }
}
