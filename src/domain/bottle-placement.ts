import {
  buildPlacementKey,
  describePlacement,
  type BottlePlacement,
  type PlacementPosition,
  type StorageLocationShape,
} from "./storage-location";

/** Sums bottle counts for placements sharing the same key, dropping non-positive results. */
export function mergePlacements(placements: BottlePlacement[]): BottlePlacement[] {
  const order: string[] = [];
  const totals = new Map<string, BottlePlacement>();
  for (const placement of placements) {
    const key = buildPlacementKey(placement);
    const existing = totals.get(key);
    if (existing === undefined) {
      order.push(key);
      totals.set(key, { ...placement });
    } else {
      existing.bottleCount += placement.bottleCount;
    }
  }
  return order
    .map((key) => totals.get(key))
    .filter((placement): placement is BottlePlacement => placement !== undefined)
    .filter((placement) => placement.bottleCount > 0);
}

export function sumBottles(placements: BottlePlacement[]): number {
  return placements.reduce((total, placement) => total + placement.bottleCount, 0);
}

/** A position is consistent when grid indices only appear with a location and free text never does. */
export function isConsistentPosition(position: PlacementPosition): boolean {
  const hasGridIndices = position.rowIndex !== null || position.slotIndex !== null;
  if (hasGridIndices && position.locationId === null) return false;
  if (position.locationId !== null && position.freeText !== null) return false;
  return true;
}

export function isPositionWithinLocation(
  position: PlacementPosition,
  location: StorageLocationShape,
): boolean {
  if (location.kind === "simple") {
    return position.rowIndex === null && position.slotIndex === null;
  }
  if (position.rowIndex === null || position.slotIndex === null) return false;
  if (location.rowCount === null || location.slotsPerRow === null) return false;
  const isRowWithinRange = position.rowIndex >= 1 && position.rowIndex <= location.rowCount;
  const isSlotWithinRange = position.slotIndex >= 1 && position.slotIndex <= location.slotsPerRow;
  return isRowWithinRange && isSlotWithinRange;
}

/**
 * Placements that no longer fit after a location shape changes (e.g. grid shrunk to simple).
 * Generic over the placement type so callers holding a richer record (e.g. a database row)
 * get that same type back, not just the position fields.
 */
export function findPlacementsOutsideShape<Placement extends PlacementPosition>(
  placements: Placement[],
  newShape: StorageLocationShape,
): Placement[] {
  return placements.filter((placement) => !isPositionWithinLocation(placement, newShape));
}

export function toFreeTextPlacement(
  placement: BottlePlacement,
  oldLocation: StorageLocationShape,
): BottlePlacement {
  return {
    locationId: null,
    rowIndex: null,
    slotIndex: null,
    freeText: describePlacement(placement, oldLocation),
    bottleCount: placement.bottleCount,
  };
}
