import type {
  AnalysisErrorCode,
  AnalysisStatus,
  CriticScore,
  DrinkingMaturity,
  ResearchConfidence,
  WineType,
} from "@/domain/wine-types";

export interface WineResponse {
  id: number;
  producer: string | null;
  name: string | null;
  vintage: number | null;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grapeVarieties: string[];
  wineType: WineType | null;
  alcoholPercent: number | null;
  bottleCount: number;
  storageLocation: string | null;
  purchasePricePerBottle: number | null;
  photoUrl: string;
  styleClassification: string | null;
  description: string | null;
  criticScores: CriticScore[];
  aggregateScore: number | null;
  drinkFromYear: number | null;
  drinkUntilYear: number | null;
  drinkingMaturity: DrinkingMaturity;
  foodPairings: string[];
  estimatedMarketValue: number | null;
  confidence: ResearchConfidence | null;
  analyzedAt: string | null;
  analysisStatus: AnalysisStatus;
  analysisError: AnalysisErrorCode | null;
  duplicateOfWineId: number | null;
  createdAt: string;
}

export interface TastingResponse {
  id: number;
  wineId: number;
  tastedOn: string;
  starRating: number | null;
  tastingNote: string | null;
  occasionOrDish: string | null;
}

export interface TastingHistoryEntry extends TastingResponse {
  wineProducer: string | null;
  wineName: string | null;
  wineVintage: number | null;
}

export interface DishRecommendationResponse {
  dish: string;
  isFromCache: boolean;
  createdAt: string;
  recommendations: { wine: WineResponse; reasoning: string; servingTip: string | null }[];
}

export interface CellarSummaryResponse {
  wineCount: number;
  bottleCount: number;
  purchaseValue: number;
  estimatedMarketValue: number;
  currency: string;
  maturityCounts: Record<DrinkingMaturity, number>;
  aiCallsThisMonth: number;
  monthlyAiCallLimit: number;
  isAiConfigured: boolean;
}

export interface SettingsResponse {
  currency: string;
  monthlyAiCallLimit: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface WineIdentityRequestFields {
  producer: string | null;
  name: string | null;
  vintage: number | null;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grapeVarieties: string[];
  wineType: WineType | null;
}

export interface WineConfirmationRequest extends WineIdentityRequestFields {
  bottleCount: number;
  storageLocation: string | null;
  purchasePricePerBottle: number | null;
}

export type WineEditRequest = Partial<
  WineConfirmationRequest & { drinkFromYear: number | null; drinkUntilYear: number | null }
>;

export interface TastingRequest {
  tastedOn: string;
  starRating: number | null;
  tastingNote: string | null;
  occasionOrDish: string | null;
}

export interface WineListQuery {
  search?: string;
  wineType?: WineType;
  maturity?: DrinkingMaturity;
  includeEmpty?: boolean;
  sort?: "newest" | "urgency";
}
