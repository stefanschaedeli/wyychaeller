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

export function removeBottle(
  draft: BottlePlacement[],
  position: PlacementPosition,
): BottlePlacement[] {
  const currentCount = countAt(draft, position);
  if (currentCount === 0) return draft;
  return setCount(draft, position, currentCount - 1);
}

export function removePosition(
  draft: BottlePlacement[],
  position: PlacementPosition,
): BottlePlacement[] {
  return setCount(draft, position, 0);
}
