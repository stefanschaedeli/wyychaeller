"use client";

import { useCallback, useState } from "react";
import { sumBottles } from "@/domain/bottle-placement";
import type { BottlePlacement, PlacementPosition } from "@/domain/storage-location";
import { addBottle, countAt, setCount } from "@/lib/placement-draft";
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

  const addBottleToSlot = useCallback((locationId: number, rowIndex: number, slotIndex: number) => {
    setSelectedSlot({ rowIndex, slotIndex });
    setDraft((current) => addBottle(current, { locationId, rowIndex, slotIndex, freeText: null }));
  }, []);

  const countAtPosition = useCallback(
    (position: PlacementPosition) => countAt(draft, position),
    [draft],
  );

  const setCountAtPosition = useCallback((position: PlacementPosition, count: number) => {
    setDraft((current) => setCount(current, position, count));
  }, []);

  const addBottles = useCallback((placement: BottlePlacement) => {
    setDraft((current) =>
      setCount(current, placement, countAt(current, placement) + placement.bottleCount),
    );
  }, []);

  return {
    draft,
    target,
    selectedSlot,
    totalBottleCount: sumBottles(draft),
    selectTarget,
    addBottleToSlot,
    countAtPosition,
    setCountAtPosition,
    addBottles,
  };
}
