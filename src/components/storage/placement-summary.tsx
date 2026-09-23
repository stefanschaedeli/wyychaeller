"use client";

import Link from "next/link";
import { formatBottleCount, formatPlacementList } from "@/lib/german-labels";
import type { WineResponse } from "@/shared/api-contract";

const EMPTY_TEXT = "Noch keine Flaschen eingetragen";
const EMPTY_LINK_LABEL = "Lagerort festlegen";

export interface PlacementSummaryProps {
  wine: WineResponse;
  changeHref: string;
  changeLabel?: string;
}

/** Where a wine's bottles lie today, with the one link that opens the picker. */
export function PlacementSummary({
  wine,
  changeHref,
  changeLabel = "ändern",
}: PlacementSummaryProps) {
  const hasPlacements = wine.placements.length > 0;
  return (
    <div className="grid gap-1">
      <p>
        {hasPlacements
          ? `${formatBottleCount(wine.bottleCount)} · ${formatPlacementList(wine.placements)}`
          : EMPTY_TEXT}
      </p>
      <Link href={changeHref} className="text-bordeaux underline">
        {hasPlacements ? changeLabel : EMPTY_LINK_LABEL}
      </Link>
    </div>
  );
}
