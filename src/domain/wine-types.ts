export const WINE_TYPES = ["red", "white", "rose", "sparkling", "sweet"] as const;
export type WineType = (typeof WINE_TYPES)[number];

export const ANALYSIS_STATUSES = [
  "pending",
  "analyzing",
  "awaitingConfirmation",
  "complete",
  "failed",
] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const DRINKING_MATURITIES = [
  "tooYoung",
  "ready",
  "drinkSoon",
  "overdue",
  "unknown",
] as const;
export type DrinkingMaturity = (typeof DRINKING_MATURITIES)[number];

export const RESEARCH_CONFIDENCES = ["researched", "estimated"] as const;
export type ResearchConfidence = (typeof RESEARCH_CONFIDENCES)[number];

export interface CriticScore {
  source: string;
  points: number;
  url: string | null;
}

export interface DrinkingWindow {
  drinkFromYear: number | null;
  drinkUntilYear: number | null;
}
