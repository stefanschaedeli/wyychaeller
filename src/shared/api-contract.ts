import type { SlotLabelStyle, StorageLocationKind } from "@/domain/storage-location";
import type {
  AnalysisErrorCode,
  AnalysisStatus,
  CriticScore,
  DrinkingMaturity,
  ResearchConfidence,
  WineType,
} from "@/domain/wine-types";

export interface BottlePlacementRequest {
  locationId: number | null;
  rowIndex: number | null;
  slotIndex: number | null;
  freeText: string | null;
  bottleCount: number;
}

export interface BottlePlacementResponse extends BottlePlacementRequest {
  id: number;
  locationName: string | null;
  description: string;
}

export interface PlacedBottleResponse extends BottlePlacementResponse {
  wineId: number;
  wineProducer: string | null;
  wineName: string | null;
  wineVintage: number | null;
}

export type StorageLocationRequest =
  | { kind: "simple"; name: string }
  | {
      kind: "grid";
      name: string;
      rowCount: number;
      slotsPerRow: number;
      slotLabelStyle: SlotLabelStyle;
    };

export interface StorageLocationResponse {
  id: number;
  name: string;
  kind: StorageLocationKind;
  rowCount: number | null;
  slotsPerRow: number | null;
  slotLabelStyle: SlotLabelStyle | null;
  bottleCount: number;
}

export interface StorageOverviewResponse {
  locations: StorageLocationResponse[];
  placements: PlacedBottleResponse[];
}

export interface PlacementsRequest {
  placements: BottlePlacementRequest[];
}

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
  placements: BottlePlacementResponse[];
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
  purchasePricePerBottle: number | null;
}

export type WineEditRequest = Partial<
  WineConfirmationRequest & { drinkFromYear: number | null; drinkUntilYear: number | null }
>;

export interface TastingRequest {
  placementId: number | null;
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
