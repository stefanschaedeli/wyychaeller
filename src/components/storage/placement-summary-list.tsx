"use client";

import {
  buildPlacementKey,
  describePlacement,
  type BottlePlacement,
} from "@/domain/storage-location";
import { formatBottleCount } from "@/lib/german-labels";
import { findLocationShape } from "@/lib/placement-requests";
import type { StorageLocationResponse } from "@/shared/api-contract";

const NO_BOTTLES = 0;

export interface PlacementSummaryListProps {
  draft: BottlePlacement[];
  locations: StorageLocationResponse[];
  onRemove: (placement: BottlePlacement) => void;
  totalBottleCount: number;
}

/** Everything the draft holds, each row removable, with the total underneath. */
export function PlacementSummaryList(props: PlacementSummaryListProps) {
  const { draft, locations, onRemove, totalBottleCount } = props;

  return (
    <section className="mt-6 border-t border-line pt-4">
      <ul>
        {draft.map((placement) => {
          const description = describePlacement(
            placement,
            findLocationShape(locations, placement.locationId),
          );
          return (
            <li
              key={buildPlacementKey(placement)}
              className="flex items-center justify-between gap-3 border-b border-line py-2"
            >
              <span>
                {description} · {formatBottleCount(placement.bottleCount)}
              </span>
              <button
                type="button"
                className="button-ghost min-h-11"
                onClick={() => onRemove(placement)}
              >
                {description} entfernen
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 eyebrow">Total: {formatBottleCount(totalBottleCount)}</p>
      {totalBottleCount === NO_BOTTLES && (
        <p className="text-ink-muted">Noch keine Flaschen zugeordnet.</p>
      )}
    </section>
  );
}
