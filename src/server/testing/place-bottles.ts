import type { PlacementRepository } from "@/server/repository/placement-repository";

/** Test helper: gives a wine bottles at an unplaced (free-text-less) position. */
export function placeUnplacedBottles(
  placementRepository: PlacementRepository,
  wineId: number,
  bottleCount: number,
): void {
  placementRepository.replacePlacements(wineId, [
    { locationId: null, rowIndex: null, slotIndex: null, freeText: null, bottleCount },
  ]);
}
