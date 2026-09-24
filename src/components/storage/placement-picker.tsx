"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { formatBottleCount, formatWineTitle } from "@/lib/german-labels";
import {
  countForTarget,
  FREE_TEXT_TARGET_LABEL,
  UNPLACED_TARGET_LABEL,
} from "@/lib/placement-target";
import { findLocationShape, toPlacementRequests } from "@/lib/placement-requests";
import { runUserAction } from "@/lib/run-user-action";
import { buildOccupancy } from "@/lib/slot-occupancy";
import type { StorageOverviewResponse, WineResponse } from "@/shared/api-contract";
import { LocationList } from "./location-list";
import { PickerHeader, PLACEMENT_PICKER_TITLE } from "./picker-header";
import { PlacementTargetPanel } from "./placement-target-panel";
import { usePlacementDraft, type PlacementDraftState } from "./use-placement-draft";

const NO_LOCATIONS_HINT =
  "Du kannst die Flaschen als Text festhalten oder zuerst einen Lagerort anlegen.";
const NO_BOTTLES = 0;
const SAVE_LABEL = "Fertig";

export interface PlacementPickerProps {
  wine: WineResponse;
  overview: StorageOverviewResponse;
  onSaved: () => void;
  onClose: () => void;
}

/** Bottles of every other wine: the picker's own draft is shown separately on each cell. */
function buildOtherWinesOccupancy(overview: StorageOverviewResponse, wineId: number) {
  return buildOccupancy(overview.placements.filter((placement) => placement.wineId !== wineId));
}

/** Step 2's heading: the chosen location's name, or what the two special targets stand for. */
function describeTarget(state: PlacementDraftState, overview: StorageOverviewResponse): string {
  const { target } = state;
  if (target === null) return PLACEMENT_PICKER_TITLE;
  if (target.kind === "freeText") return FREE_TEXT_TARGET_LABEL;
  if (target.kind === "unplaced") return UNPLACED_TARGET_LABEL;
  return findLocationShape(overview.locations, target.locationId)?.name ?? PLACEMENT_PICKER_TITLE;
}

/** The wine's name is only known once the analysis ran; a fresh capture shows nothing. */
function describeWine(wine: WineResponse): string | null {
  return wine.name === null && wine.producer === null ? null : formatWineTitle(wine);
}

/** The always-visible way out: a green check that also says how many bottles the draft holds. */
function SaveBubble({
  bottleCount,
  isDisabled,
  onSave,
}: {
  bottleCount: number;
  isDisabled: boolean;
  onSave: () => void;
}) {
  const hasBottles = bottleCount > NO_BOTTLES;
  const label = hasBottles ? `${SAVE_LABEL}, ${formatBottleCount(bottleCount)}` : SAVE_LABEL;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={onSave}
      className="absolute right-5 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] flex h-16 w-16 flex-col items-center justify-center rounded-full bg-success text-paper shadow-lg transition-transform hover:brightness-110 active:scale-95 disabled:opacity-50 md:right-6 md:bottom-6"
    >
      <span aria-hidden="true" className="font-sans text-2xl leading-none">
        ✓
      </span>
      {hasBottles && (
        <span aria-hidden="true" className="mt-0.5 font-sans text-xs leading-none">
          {bottleCount}
        </span>
      )}
    </button>
  );
}

export function PlacementPicker({ wine, overview, onSaved, onClose }: PlacementPickerProps) {
  const state = usePlacementDraft(wine.placements);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const occupancy = useMemo(() => buildOtherWinesOccupancy(overview, wine.id), [overview, wine.id]);
  // The limit is checked client-side so the check never sends a draft the server would
  // reject wholesale; it takes priority over a stale save error once it applies.
  const displayedErrorCode = state.hasTooManyPlacements ? "tooManyPlacements" : errorCode;
  const isChoosing = state.target === null;
  const selectedLocation =
    state.target?.kind === "location"
      ? findLocationShape(overview.locations, state.target.locationId)
      : null;

  async function savePlacements() {
    setIsSaving(true);
    await runUserAction(() => apiClient.savePlacements(wine.id, toPlacementRequests(state.draft)), {
      onStart: () => setErrorCode(null),
      onSuccess: onSaved,
      onError: setErrorCode,
    });
    setIsSaving(false);
  }

  return (
    <>
      <PickerHeader
        title={describeTarget(state, overview)}
        subtitle={isChoosing ? describeWine(wine) : null}
        onBack={isChoosing ? undefined : state.clearTarget}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-28">
        {isChoosing && overview.locations.length === 0 && (
          <EmptyState
            title="Noch keine Lagerorte"
            hint={NO_LOCATIONS_HINT}
            action={
              <Link href="/more/settings/lagerorte" className="button-ghost" onClick={onClose}>
                Lagerorte verwalten
              </Link>
            }
          />
        )}
        {isChoosing ? (
          <LocationList
            locations={overview.locations}
            occupancy={occupancy}
            draft={state.draft}
            onSelect={state.selectTarget}
            countForTarget={(target) => countForTarget(target, state.draft)}
          />
        ) : (
          <PlacementTargetPanel state={state} location={selectedLocation} occupancy={occupancy} />
        )}
        {displayedErrorCode && (
          <div className="mt-4">
            <ErrorNotice errorCode={displayedErrorCode} shouldTakeFocus />
          </div>
        )}
      </div>
      <SaveBubble
        bottleCount={state.totalBottleCount}
        isDisabled={isSaving || state.hasTooManyPlacements}
        onSave={() => void savePlacements()}
      />
    </>
  );
}
