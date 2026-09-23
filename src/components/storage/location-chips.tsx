"use client";

import type { StorageLocationResponse } from "@/shared/api-contract";

export const FREE_TEXT_CHIP_LABEL = "Anderer Ort";
export const UNPLACED_CHIP_LABEL = "Später festlegen";

/** Where the next bottles go: one of the locations, a free-text note, or nowhere yet. */
export type PlacementTarget =
  { kind: "location"; locationId: number } | { kind: "freeText" } | { kind: "unplaced" };

export interface LocationChipsProps {
  locations: StorageLocationResponse[];
  target: PlacementTarget | null;
  onSelect: (target: PlacementTarget) => void;
  /** Bottles the draft holds per target, so a chip can show what is already assigned. */
  countForTarget: (target: PlacementTarget) => number;
}

function isSameTarget(target: PlacementTarget | null, other: PlacementTarget): boolean {
  if (target === null) return false;
  if (target.kind !== other.kind) return false;
  if (target.kind === "location" && other.kind === "location") {
    return target.locationId === other.locationId;
  }
  return true;
}

function Chip({
  label,
  count,
  isSelected,
  onSelect,
}: {
  label: string;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const selectedClasses = isSelected ? "bg-bordeaux text-paper" : "";
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`pill min-h-11 ${selectedClasses}`}
    >
      {count > 0 ? `${label} (${count})` : label}
    </button>
  );
}

export function LocationChips({ locations, target, onSelect, countForTarget }: LocationChipsProps) {
  const extraTargets: { label: string; target: PlacementTarget }[] = [
    { label: FREE_TEXT_CHIP_LABEL, target: { kind: "freeText" } },
    { label: UNPLACED_CHIP_LABEL, target: { kind: "unplaced" } },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {locations.map((location) => {
        const locationTarget: PlacementTarget = { kind: "location", locationId: location.id };
        return (
          <Chip
            key={location.id}
            label={location.name}
            count={countForTarget(locationTarget)}
            isSelected={isSameTarget(target, locationTarget)}
            onSelect={() => onSelect(locationTarget)}
          />
        );
      })}
      {extraTargets.map((entry) => (
        <Chip
          key={entry.label}
          label={entry.label}
          count={countForTarget(entry.target)}
          isSelected={isSameTarget(target, entry.target)}
          onSelect={() => onSelect(entry.target)}
        />
      ))}
    </div>
  );
}
