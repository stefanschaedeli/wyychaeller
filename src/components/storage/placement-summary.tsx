"use client";

import { formatBottleCount, formatPlacementList } from "@/lib/german-labels";
import type { WineResponse } from "@/shared/api-contract";
import { usePlacementOverlay } from "./placement-overlay-provider";

const EMPTY_TEXT = "Noch keine Flaschen eingetragen";
const EMPTY_LINK_LABEL = "Lagerort festlegen";

export interface PlacementSummaryProps {
  wine: WineResponse;
  /** Called after the picker saved new placements, so the caller can reload the wine. */
  onChanged: () => void;
  changeLabel?: string;
}

/** Where a wine's bottles lie today, with the one control that opens the picker. */
export function PlacementSummary({
  wine,
  onChanged,
  changeLabel = "ändern",
}: PlacementSummaryProps) {
  const { openPlacementPicker } = usePlacementOverlay();
  const hasPlacements = wine.placements.length > 0;
  return (
    <div className="grid justify-items-start gap-1">
      <p>
        {hasPlacements
          ? `${formatBottleCount(wine.bottleCount)} · ${formatPlacementList(wine.placements)}`
          : EMPTY_TEXT}
      </p>
      <button
        type="button"
        className="min-h-11 text-bordeaux underline"
        onClick={() => openPlacementPicker({ wineId: wine.id, onSaved: onChanged })}
      >
        {hasPlacements ? changeLabel : EMPTY_LINK_LABEL}
      </button>
    </div>
  );
}
