import { describePlacement } from "@/domain/storage-location";
import type {
  BottlePlacementResponse,
  PlacedBottleResponse,
  StorageLocationResponse,
} from "@/shared/api-contract";
import type { PlacedBottleRecord, PlacementWithLocation } from "../repository/placement-repository";
import type { StorageLocationRecord } from "../database/schema";

export function toPlacementResponse(placement: PlacementWithLocation): BottlePlacementResponse {
  return {
    id: placement.id,
    locationId: placement.locationId,
    rowIndex: placement.rowIndex,
    slotIndex: placement.slotIndex,
    freeText: placement.freeText,
    bottleCount: placement.bottleCount,
    locationName: placement.location?.name ?? null,
    description: describePlacement(placement, placement.location),
  };
}

/** Responses stay deterministic because placements are always ordered by their id. */
export function toPlacementResponses(
  placements: PlacementWithLocation[],
): BottlePlacementResponse[] {
  return [...placements].sort((left, right) => left.id - right.id).map(toPlacementResponse);
}

export function toPlacedBottleResponse(placement: PlacedBottleRecord): PlacedBottleResponse {
  return {
    ...toPlacementResponse(placement),
    wineId: placement.wineId,
    wineProducer: placement.wineProducer,
    wineName: placement.wineName,
    wineVintage: placement.wineVintage,
  };
}

export function toStorageLocationResponse(
  location: StorageLocationRecord,
  bottleCount: number,
): StorageLocationResponse {
  return {
    id: location.id,
    name: location.name,
    kind: location.kind,
    rowCount: location.rowCount,
    slotsPerRow: location.slotsPerRow,
    slotLabelStyle: location.slotLabelStyle,
    bottleCount,
  };
}
