import { stripDiacritics } from "./text-normalization";

export const STORAGE_LOCATION_KINDS = ["simple", "grid"] as const;
export type StorageLocationKind = (typeof STORAGE_LOCATION_KINDS)[number];

export const SLOT_LABEL_STYLES = ["numbered", "leftRight", "leftMiddleRight"] as const;
export type SlotLabelStyle = (typeof SLOT_LABEL_STYLES)[number];

export const NAMED_SLOT_LABELS: Record<SlotLabelStyle, readonly string[] | null> = {
  numbered: null,
  leftRight: ["links", "rechts"],
  leftMiddleRight: ["links", "Mitte", "rechts"],
};

export const UNPLACED_LABEL = "Lagerort noch offen";

export interface StorageLocationShape {
  name: string;
  kind: StorageLocationKind;
  /** 1-based when set; null for a simple location. */
  rowCount: number | null;
  slotsPerRow: number | null;
  slotLabelStyle: SlotLabelStyle | null;
}

export interface PlacementPosition {
  locationId: number | null;
  /** 1-based row within the location's grid, or null outside a grid slot. */
  rowIndex: number | null;
  /** 1-based slot within the row, or null outside a grid slot. */
  slotIndex: number | null;
  freeText: string | null;
}

export interface BottlePlacement extends PlacementPosition {
  bottleCount: number;
}

/** The slot count a named label style requires; null means any count is allowed. */
export function requiredSlotsPerRow(style: SlotLabelStyle): number | null {
  const labels = NAMED_SLOT_LABELS[style];
  return labels === null ? null : labels.length;
}

export function formatRowLabel(rowIndex: number): string {
  return `Reihe ${rowIndex}`;
}

export function formatSlotLabel(style: SlotLabelStyle, slotIndex: number): string {
  const labels = NAMED_SLOT_LABELS[style];
  if (labels === null) return `Platz ${slotIndex}`;
  return labels[slotIndex - 1] ?? `Platz ${slotIndex}`;
}

function describeGridPosition(position: PlacementPosition, location: StorageLocationShape): string {
  if (
    position.rowIndex === null ||
    position.slotIndex === null ||
    location.slotLabelStyle === null
  ) {
    return location.name;
  }
  const rowLabel = formatRowLabel(position.rowIndex);
  const slotLabel = formatSlotLabel(location.slotLabelStyle, position.slotIndex);
  return `${location.name}, ${rowLabel}, ${slotLabel}`;
}

export function describePlacement(
  position: PlacementPosition,
  location: StorageLocationShape | null,
): string {
  if (position.locationId !== null && location !== null) {
    return location.kind === "grid" ? describeGridPosition(position, location) : location.name;
  }
  if (position.freeText !== null) return position.freeText;
  return UNPLACED_LABEL;
}

function normalizeFreeText(text: string): string {
  return stripDiacritics(text).toLowerCase().trim();
}

/**
 * Free-text keys are case- and diacritic-insensitive (via normalizeFreeText), so
 * "Regal 1" and "regal 1" merge into one placement under whichever spelling was seen first.
 */
export function buildPlacementKey(position: PlacementPosition): string {
  if (position.locationId !== null) {
    if (position.rowIndex !== null && position.slotIndex !== null) {
      return `location:${position.locationId}:${position.rowIndex}:${position.slotIndex}`;
    }
    return `location:${position.locationId}`;
  }
  if (position.freeText !== null) return `text:${normalizeFreeText(position.freeText)}`;
  return "unplaced";
}
