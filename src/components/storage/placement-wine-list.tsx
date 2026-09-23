"use client";

import Link from "next/link";
import { formatBottleCount, formatWineTitle } from "@/lib/german-labels";
import type { PlacedBottleResponse } from "@/shared/api-contract";

/** The wines stored at one slot, location or free-text description, as links to the wine. */
export function PlacementWineList({
  placements,
  emptyHint,
}: {
  placements: PlacedBottleResponse[];
  /** Shown instead of the list when nothing is stored here; omit where a list is guaranteed. */
  emptyHint?: string;
}) {
  if (placements.length === 0) {
    return emptyHint === undefined ? null : <p className="text-ink-muted">{emptyHint}</p>;
  }
  return (
    <ul>
      {placements.map((placement) => (
        <li key={placement.id} className="border-b border-line py-2 last:border-b-0">
          <Link href={`/wines/${placement.wineId}`} className="text-bordeaux underline">
            {formatWineTitle({
              producer: placement.wineProducer,
              name: placement.wineName,
              vintage: placement.wineVintage,
            })}{" "}
            · {formatBottleCount(placement.bottleCount)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
