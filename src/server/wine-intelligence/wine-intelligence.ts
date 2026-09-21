import type { DrinkingMaturity, WineType } from "@/domain/wine-types";
import type { DishRecommendation, LabelReading, WineResearch } from "./schemas";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export function addUsage(first: TokenUsage, second: TokenUsage): TokenUsage {
  return {
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
  };
}

export interface IntelligenceResult<T> {
  value: T;
  usage: TokenUsage;
}

export interface LabelPhoto {
  base64Data: string;
  mediaType: "image/jpeg";
}

export interface WineIdentity {
  producer: string | null;
  name: string | null;
  vintage: number | null;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grapeVarieties: string[];
  wineType: WineType | null;
}

export interface CellarWineSummary extends WineIdentity {
  wineId: number;
  bottleCount: number;
  styleClassification: string | null;
  foodPairings: string[];
  drinkingMaturity: DrinkingMaturity;
}

export const WINE_INTELLIGENCE_ERROR_REASONS = [
  "missingApiKey",
  "invalidApiKey",
  "unavailable",
  "invalidResponse",
] as const;
export type WineIntelligenceErrorReason = (typeof WINE_INTELLIGENCE_ERROR_REASONS)[number];

export class WineIntelligenceError extends Error {
  constructor(readonly reason: WineIntelligenceErrorReason) {
    super(`Wine intelligence failed: ${reason}`);
    this.name = "WineIntelligenceError";
  }
}

export interface WineIntelligence {
  analyzeLabel(photo: LabelPhoto): Promise<IntelligenceResult<LabelReading>>;
  researchWine(identity: WineIdentity): Promise<IntelligenceResult<WineResearch>>;
  recommendWinesForDish(
    dish: string,
    cellarWines: CellarWineSummary[],
  ): Promise<IntelligenceResult<DishRecommendation[]>>;
}
