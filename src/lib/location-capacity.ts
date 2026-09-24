import { buildPlacementKey, type BottlePlacement } from "@/domain/storage-location";
import type { StorageLocationResponse } from "@/shared/api-contract";
import { formatBottleCount } from "./german-labels";
import type { SlotOccupancy } from "./slot-occupancy";

const NO_BOTTLES = 0;
const SIMPLE_LOCATION_LABEL = "Ohne Raster";
const EMPTY_LABEL = "leer";

function formatRowCount(rowCount: number): string {
  return rowCount === 1 ? "1 Reihe" : `${rowCount} Reihen`;
}

function formatSlotCount(slotCount: number): string {
  return slotCount === 1 ? "1 Platz" : `${slotCount} Plätze`;
}

/** Slots of this grid that hold at least one bottle, in the cellar or in the draft. */
function countUsedSlots(
  locationId: number,
  occupancy: Map<string, SlotOccupancy>,
  draft: BottlePlacement[],
): number {
  const locationKey = buildPlacementKey({
    locationId,
    rowIndex: null,
    slotIndex: null,
    freeText: null,
  });
  const slotKeyPrefix = `${locationKey}:`;
  const usedSlotKeys = new Set<string>();
  for (const [key, slot] of occupancy) {
    if (key.startsWith(slotKeyPrefix) && slot.bottleCount > NO_BOTTLES) usedSlotKeys.add(key);
  }
  for (const entry of draft) {
    const key = buildPlacementKey(entry);
    if (key.startsWith(slotKeyPrefix) && entry.bottleCount > NO_BOTTLES) usedSlotKeys.add(key);
  }
  return usedSlotKeys.size;
}

/**
 * The one-line description under a location's name in the picker: a grid's shape and how
 * many of its slots hold nothing yet (neither other wines nor this draft), or a simple
 * location's bottle total.
 */
export function describeLocationCapacity(
  location: StorageLocationResponse,
  occupancy: Map<string, SlotOccupancy>,
  draft: BottlePlacement[] = [],
): string {
  if (location.kind === "simple" || location.rowCount === null || location.slotsPerRow === null) {
    const bottles =
      location.bottleCount === NO_BOTTLES ? EMPTY_LABEL : formatBottleCount(location.bottleCount);
    return `${SIMPLE_LOCATION_LABEL} · ${bottles}`;
  }
  const slotCount = location.rowCount * location.slotsPerRow;
  const freeSlots = slotCount - countUsedSlots(location.id, occupancy, draft);
  const shape = `${formatRowCount(location.rowCount)} × ${formatSlotCount(location.slotsPerRow)}`;
  return `${shape} · ${freeSlots} frei`;
}
