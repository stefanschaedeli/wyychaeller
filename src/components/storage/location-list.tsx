"use client";

import { useId } from "react";
import type { BottlePlacement } from "@/domain/storage-location";
import { formatBottleCount } from "@/lib/german-labels";
import { describeLocationCapacity } from "@/lib/location-capacity";
import {
  FREE_TEXT_TARGET_LABEL,
  UNPLACED_TARGET_LABEL,
  type PlacementTarget,
} from "@/lib/placement-target";
import type { SlotOccupancy } from "@/lib/slot-occupancy";
import type { StorageLocationResponse } from "@/shared/api-contract";

const NO_BOTTLES = 0;

export interface LocationListProps {
  locations: StorageLocationResponse[];
  /** Bottles of the other wines, so a row can say how much room is left. */
  occupancy: Map<string, SlotOccupancy>;
  /** The bottles placed so far; they take room too. */
  draft: BottlePlacement[];
  onSelect: (target: PlacementTarget) => void;
  /** Bottles the draft holds per target, so a row shows what is already assigned there. */
  countForTarget: (target: PlacementTarget) => number;
}

/** One big, thumb-sized row per location: the name, how much room it has, the draft's share. */
function LocationRow({
  location,
  capacity,
  draftCount,
  onSelect,
}: {
  location: StorageLocationResponse;
  capacity: string;
  draftCount: number;
  onSelect: () => void;
}) {
  const nameId = useId();
  const detailId = useId();
  const draftId = useId();
  return (
    <button
      type="button"
      aria-labelledby={nameId}
      aria-describedby={`${detailId} ${draftId}`}
      onClick={onSelect}
      className="flex min-h-16 w-full items-center gap-3 rounded-xs border border-line bg-card px-4 py-3 text-left transition-colors hover:border-bordeaux active:bg-paper"
    >
      <span className="min-w-0 flex-1">
        <span id={nameId} className="block truncate text-lg leading-tight">
          {location.name}
        </span>
        <span id={detailId} className="mt-0.5 block font-sans text-xs text-ink-muted">
          {capacity}
        </span>
      </span>
      {draftCount > NO_BOTTLES && (
        <span id={draftId} className="pill border-bordeaux bg-bordeaux text-paper">
          <span className="sr-only">{formatBottleCount(draftCount)} dieses Weins</span>
          <span aria-hidden="true">{draftCount}</span>
        </span>
      )}
      <span aria-hidden="true" className="font-sans text-xl leading-none text-ink-muted">
        ›
      </span>
    </button>
  );
}

function SecondaryTarget({
  label,
  draftCount,
  onSelect,
}: {
  label: string;
  draftCount: number;
  onSelect: () => void;
}) {
  return (
    <button type="button" className="button-ghost flex-1" onClick={onSelect}>
      {draftCount > NO_BOTTLES ? `${label} (${draftCount})` : label}
    </button>
  );
}

export function LocationList({
  locations,
  occupancy,
  draft,
  onSelect,
  countForTarget,
}: LocationListProps) {
  const freeTextTarget: PlacementTarget = { kind: "freeText" };
  const unplacedTarget: PlacementTarget = { kind: "unplaced" };
  return (
    <div className="grid gap-3">
      {locations.map((location) => {
        const target: PlacementTarget = { kind: "location", locationId: location.id };
        return (
          <LocationRow
            key={location.id}
            location={location}
            capacity={describeLocationCapacity(location, occupancy, draft)}
            draftCount={countForTarget(target)}
            onSelect={() => onSelect(target)}
          />
        );
      })}
      <div className="mt-2 flex gap-2">
        <SecondaryTarget
          label={FREE_TEXT_TARGET_LABEL}
          draftCount={countForTarget(freeTextTarget)}
          onSelect={() => onSelect(freeTextTarget)}
        />
        <SecondaryTarget
          label={UNPLACED_TARGET_LABEL}
          draftCount={countForTarget(unplacedTarget)}
          onSelect={() => onSelect(unplacedTarget)}
        />
      </div>
    </div>
  );
}
