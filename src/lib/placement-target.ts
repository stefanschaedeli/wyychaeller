import type { BottlePlacement } from "@/domain/storage-location";

export const FREE_TEXT_TARGET_LABEL = "Anderer Ort";
export const UNPLACED_TARGET_LABEL = "Später festlegen";

/** Where the next bottles go: one of the locations, a free-text note, or nowhere yet. */
export type PlacementTarget =
  { kind: "location"; locationId: number } | { kind: "freeText" } | { kind: "unplaced" };

export function isSameTarget(target: PlacementTarget | null, other: PlacementTarget): boolean {
  if (target === null) return false;
  if (target.kind !== other.kind) return false;
  if (target.kind === "location" && other.kind === "location") {
    return target.locationId === other.locationId;
  }
  return true;
}

function belongsToTarget(entry: BottlePlacement, target: PlacementTarget): boolean {
  if (target.kind === "location") return entry.locationId === target.locationId;
  if (target.kind === "freeText") return entry.freeText !== null;
  return entry.locationId === null && entry.freeText === null;
}

/** The bottles the draft already puts on a target, shown beside its name. */
export function countForTarget(target: PlacementTarget, draft: BottlePlacement[]): number {
  return draft
    .filter((entry) => belongsToTarget(entry, target))
    .reduce((total, entry) => total + entry.bottleCount, 0);
}
