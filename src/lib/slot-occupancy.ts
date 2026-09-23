import { buildPlacementKey } from "@/domain/storage-location";
import type { PlacedBottleResponse } from "@/shared/api-contract";

export interface SlotOccupancy {
  bottleCount: number;
  placements: PlacedBottleResponse[];
}

/**
 * Groups the placements that belong to a location by their slot key, so every grid cell
 * (and every simple location) can show what the whole cellar already stores there.
 * Placements without a location are left out; the free-text overview groups those by text.
 */
export function buildOccupancy(placements: PlacedBottleResponse[]): Map<string, SlotOccupancy> {
  const occupancy = new Map<string, SlotOccupancy>();
  for (const placement of placements) {
    if (placement.locationId === null) continue;
    const key = buildPlacementKey(placement);
    const slot = occupancy.get(key);
    if (slot === undefined) {
      occupancy.set(key, { bottleCount: placement.bottleCount, placements: [placement] });
    } else {
      slot.bottleCount += placement.bottleCount;
      slot.placements.push(placement);
    }
  }
  return occupancy;
}
