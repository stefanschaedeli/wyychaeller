"use client";

import { useCallback, useState } from "react";
import { sumBottles } from "@/domain/bottle-placement";
import { MAXIMUM_PLACEMENTS_PER_WINE } from "@/domain/constants";
import type { BottlePlacement, PlacementPosition } from "@/domain/storage-location";
import { addBottle, canAddPosition, countAt, setCount } from "@/lib/placement-draft";
import { toDraftPlacements } from "@/lib/placement-requests";
import type { BottlePlacementResponse } from "@/shared/api-contract";
import type { PlacementTarget } from "./location-chips";

export interface SelectedSlot {
  rowIndex: number;
  slotIndex: number;
}

const UNPLACED_POSITION: PlacementPosition = {
  locationId: null,
  rowIndex: null,
  slotIndex: null,
  freeText: null,
};

/** Applies `update` unless it would add a new, distinct position past the placement limit. */
function applyIfWithinLimit(
  draft: BottlePlacement[],
  position: PlacementPosition,
  update: (draft: BottlePlacement[]) => BottlePlacement[],
): BottlePlacement[] {
  return canAddPosition(draft, position) ? update(draft) : draft;
}

/** The draft mutations, kept out of the hook body so it stays within the line limit. */
function useDraftMutations(
  setDraft: (update: (current: BottlePlacement[]) => BottlePlacement[]) => void,
  setSelectedSlot: (slot: SelectedSlot) => void,
) {
  const addBottleToSlot = useCallback(
    (locationId: number, rowIndex: number, slotIndex: number) => {
      const position: PlacementPosition = { locationId, rowIndex, slotIndex, freeText: null };
      setSelectedSlot({ rowIndex, slotIndex });
      setDraft((current) =>
        applyIfWithinLimit(current, position, (draft) => addBottle(draft, position)),
      );
    },
    [setDraft, setSelectedSlot],
  );

  const setCountAtPosition = useCallback(
    (position: PlacementPosition, count: number) => {
      setDraft((current) =>
        applyIfWithinLimit(current, position, (draft) => setCount(draft, position, count)),
      );
    },
    [setDraft],
  );

  const addBottles = useCallback(
    (placement: BottlePlacement) => {
      setDraft((current) =>
        applyIfWithinLimit(current, placement, (draft) =>
          setCount(draft, placement, countAt(draft, placement) + placement.bottleCount),
        ),
      );
    },
    [setDraft],
  );

  return { addBottleToSlot, setCountAtPosition, addBottles };
}

/**
 * The position a target plus the selected slot point at. Null means "no single position":
 * a free-text target (its position needs the typed text) or a grid without a chosen slot.
 */
export function toPosition(
  target: PlacementTarget | null,
  selectedSlot: SelectedSlot | null,
  isGridTarget: boolean,
): PlacementPosition | null {
  if (target === null || target.kind === "freeText") return null;
  if (target.kind === "unplaced") return UNPLACED_POSITION;
  if (!isGridTarget) {
    return { locationId: target.locationId, rowIndex: null, slotIndex: null, freeText: null };
  }
  if (selectedSlot === null) return null;
  return {
    locationId: target.locationId,
    rowIndex: selectedSlot.rowIndex,
    slotIndex: selectedSlot.slotIndex,
    freeText: null,
  };
}

export interface PlacementDraftState {
  draft: BottlePlacement[];
  target: PlacementTarget | null;
  selectedSlot: SelectedSlot | null;
  totalBottleCount: number;
  /** True once the draft holds more than the maximum number of distinct placements. */
  hasTooManyPlacements: boolean;
  selectTarget: (target: PlacementTarget) => void;
  /** Tapping a grid cell puts one more bottle there and opens the cell's panel. */
  addBottleToSlot: (locationId: number, rowIndex: number, slotIndex: number) => void;
  countAtPosition: (position: PlacementPosition) => number;
  setCountAtPosition: (position: PlacementPosition, count: number) => void;
  addBottles: (placement: BottlePlacement) => void;
}

/** Holds the bottles the user is assigning until "Fertig" writes them to the server. */
export function usePlacementDraft(placements: BottlePlacementResponse[]): PlacementDraftState {
  const [draft, setDraft] = useState<BottlePlacement[]>(() => toDraftPlacements(placements));
  const [target, setTarget] = useState<PlacementTarget | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  const selectTarget = useCallback((nextTarget: PlacementTarget) => {
    setTarget(nextTarget);
    setSelectedSlot(null);
  }, []);

  const { addBottleToSlot, setCountAtPosition, addBottles } = useDraftMutations(
    setDraft,
    setSelectedSlot,
  );

  const countAtPosition = useCallback(
    (position: PlacementPosition) => countAt(draft, position),
    [draft],
  );

  return {
    draft,
    target,
    selectedSlot,
    totalBottleCount: sumBottles(draft),
    hasTooManyPlacements: draft.length > MAXIMUM_PLACEMENTS_PER_WINE,
    selectTarget,
    addBottleToSlot,
    countAtPosition,
    setCountAtPosition,
    addBottles,
  };
}
