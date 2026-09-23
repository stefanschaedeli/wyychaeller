import { MAXIMUM_PLACEMENTS_PER_WINE } from "@/domain/constants";
import {
  buildPlacementKey,
  type BottlePlacement,
  type PlacementPosition,
} from "@/domain/storage-location";

function findIndexAt(draft: BottlePlacement[], position: PlacementPosition): number {
  const key = buildPlacementKey(position);
  return draft.findIndex((entry) => buildPlacementKey(entry) === key);
}

export function countAt(draft: BottlePlacement[], position: PlacementPosition): number {
  const index = findIndexAt(draft, position);
  return index === -1 ? 0 : draft[index].bottleCount;
}

export function setCount(
  draft: BottlePlacement[],
  position: PlacementPosition,
  count: number,
): BottlePlacement[] {
  const index = findIndexAt(draft, position);
  if (count <= 0) {
    return index === -1 ? draft : draft.filter((_entry, entryIndex) => entryIndex !== index);
  }
  if (index === -1) return [...draft, { ...position, bottleCount: count }];
  return draft.map((entry, entryIndex) =>
    entryIndex === index ? { ...entry, bottleCount: count } : entry,
  );
}

export function addBottle(
  draft: BottlePlacement[],
  position: PlacementPosition,
): BottlePlacement[] {
  return setCount(draft, position, countAt(draft, position) + 1);
}

/**
 * Whether a bottle can be added at `position`: always true for a position the draft
 * already holds (it only grows that entry's count), false for a new, distinct position
 * once the draft already has the maximum number of placements.
 */
export function canAddPosition(draft: BottlePlacement[], position: PlacementPosition): boolean {
  if (findIndexAt(draft, position) !== -1) return true;
  return draft.length < MAXIMUM_PLACEMENTS_PER_WINE;
}
