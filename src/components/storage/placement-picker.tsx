"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import type { BottlePlacement } from "@/domain/storage-location";
import { apiClient } from "@/lib/api-client";
import { findLocationShape, toPlacementRequests } from "@/lib/placement-requests";
import { runUserAction } from "@/lib/run-user-action";
import { buildOccupancy } from "@/lib/slot-occupancy";
import type { StorageOverviewResponse, WineResponse } from "@/shared/api-contract";
import { LocationChips, type PlacementTarget } from "./location-chips";
import { PlacementSummaryList } from "./placement-summary-list";
import { PlacementTargetPanel } from "./placement-target-panel";
import { usePlacementDraft } from "./use-placement-draft";

const NO_LOCATIONS_HINT =
  "Du kannst die Flaschen als Text festhalten oder zuerst einen Lagerort anlegen.";
const NO_BOTTLES = 0;

export interface PlacementPickerProps {
  wine: WineResponse;
  overview: StorageOverviewResponse;
}

/** Bottles of every other wine: the picker's own draft is shown separately on each cell. */
function buildOtherWinesOccupancy(overview: StorageOverviewResponse, wineId: number) {
  return buildOccupancy(overview.placements.filter((placement) => placement.wineId !== wineId));
}

/** What a chip shows in brackets: the bottles the draft already puts on that target. */
function countForTarget(target: PlacementTarget, draft: BottlePlacement[]): number {
  return draft
    .filter((entry) => {
      if (target.kind === "location") return entry.locationId === target.locationId;
      if (target.kind === "freeText") return entry.freeText !== null;
      return entry.locationId === null && entry.freeText === null;
    })
    .reduce((total, entry) => total + entry.bottleCount, 0);
}

export function PlacementPicker({ wine, overview }: PlacementPickerProps) {
  const router = useRouter();
  const state = usePlacementDraft(wine.placements);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const wineHref = `/wines/${wine.id}`;

  const selectedLocation =
    state.target?.kind === "location"
      ? findLocationShape(overview.locations, state.target.locationId)
      : null;

  async function savePlacements() {
    setIsSaving(true);
    await runUserAction(() => apiClient.savePlacements(wine.id, toPlacementRequests(state.draft)), {
      onStart: () => setErrorCode(null),
      onSuccess: () => router.push(wineHref),
      onError: setErrorCode,
    });
    setIsSaving(false);
  }

  return (
    <div className="grid gap-4">
      {overview.locations.length === 0 && (
        <EmptyState
          title="Noch keine Lagerorte"
          hint={NO_LOCATIONS_HINT}
          action={
            <Link href="/more/settings/lagerorte" className="button-ghost">
              Lagerorte verwalten
            </Link>
          }
        />
      )}
      <LocationChips
        locations={overview.locations}
        target={state.target}
        onSelect={state.selectTarget}
        countForTarget={(target) => countForTarget(target, state.draft)}
      />
      <PlacementTargetPanel
        state={state}
        location={selectedLocation}
        occupancy={buildOtherWinesOccupancy(overview, wine.id)}
      />
      <PlacementSummaryList
        draft={state.draft}
        locations={overview.locations}
        totalBottleCount={state.totalBottleCount}
        onRemove={(placement) => state.setCountAtPosition(placement, NO_BOTTLES)}
      />
      <footer className="grid gap-3 border-t border-line pt-4">
        {errorCode && <ErrorNotice errorCode={errorCode} shouldTakeFocus />}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="button-primary"
            disabled={isSaving}
            onClick={() => void savePlacements()}
          >
            Fertig
          </button>
          <button type="button" className="button-ghost" onClick={() => router.push(wineHref)}>
            Abbrechen
          </button>
        </div>
      </footer>
    </div>
  );
}
