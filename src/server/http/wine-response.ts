import { determineDrinkingMaturity } from "@/domain/drinking-maturity";
import type { TastingResponse, WineResponse } from "@/shared/api-contract";
import type { TastingRecord, WineRecord } from "../database/schema";
import type { PlacementWithLocation } from "../repository/placement-repository";
import { toPlacementResponses } from "./storage-response";

export function toWineResponse(
  wine: WineRecord,
  currentYear: number,
  placements: PlacementWithLocation[],
): WineResponse {
  const { photoFileName, updatedAt: _updatedAt, createdAt, analyzedAt, ...publicFields } = wine;
  return {
    ...publicFields,
    placements: toPlacementResponses(placements),
    photoUrl: `/api/photos/${photoFileName}`,
    drinkingMaturity: determineDrinkingMaturity(wine, currentYear),
    analyzedAt: analyzedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
  };
}

export function toTastingResponse(tasting: TastingRecord): TastingResponse {
  const { createdAt: _createdAt, ...publicFields } = tasting;
  return publicFields;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}
