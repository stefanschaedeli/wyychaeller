import { mergePlacements } from "@/domain/bottle-placement";
import type { BottlePlacement } from "@/domain/storage-location";
import type {
  BottlePlacementRequest,
  BottlePlacementResponse,
  StorageLocationResponse,
} from "@/shared/api-contract";

/** Turns the placements the server sent into the editable draft the picker works on. */
export function toDraftPlacements(placements: BottlePlacementResponse[]): BottlePlacement[] {
  return placements.map((placement) => ({
    locationId: placement.locationId,
    rowIndex: placement.rowIndex,
    slotIndex: placement.slotIndex,
    freeText: placement.freeText,
    bottleCount: placement.bottleCount,
  }));
}

/** The request body for the placements route: one entry per position, empty ones dropped. */
export function toPlacementRequests(draft: BottlePlacement[]): BottlePlacementRequest[] {
  return mergePlacements(draft);
}

export function findLocationShape(
  locations: StorageLocationResponse[],
  locationId: number | null,
): StorageLocationResponse | null {
  if (locationId === null) return null;
  return locations.find((location) => location.id === locationId) ?? null;
}
