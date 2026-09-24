"use client";

import { useState } from "react";
import { TextField } from "@/components/shared/text-field";
import { buildPlacementKey, formatRowLabel, formatSlotLabel } from "@/domain/storage-location";
import { toNullableText } from "@/lib/form-values";
import type { SlotOccupancy } from "@/lib/slot-occupancy";
import type { StorageLocationResponse } from "@/shared/api-contract";
import { CountStepper } from "./count-stepper";
import { PlacementWineList } from "./placement-wine-list";
import { buildSlotKey, SlotGrid } from "./slot-grid";
import { toPosition, type PlacementDraftState } from "./use-placement-draft";

const OTHER_WINES_HINT = "Hier liegt sonst nichts.";
const SIMPLE_LOCATION_PROMPT = "Wie viele Flaschen liegen hier?";
const UNPLACED_PROMPT = "Wie viele Flaschen bleiben vorerst ohne Platz?";
const ONE_BOTTLE = 1;

export interface PlacementTargetPanelProps {
  state: PlacementDraftState;
  location: StorageLocationResponse | null;
  /** Bottles of every other wine, so a cell shows the cellar's total, not just the draft. */
  occupancy: Map<string, SlotOccupancy>;
}

function SlotDetail({
  location,
  state,
  occupancy,
}: PlacementTargetPanelProps & { location: StorageLocationResponse }) {
  const { selectedSlot } = state;
  if (selectedSlot === null || location.slotLabelStyle === null) return null;
  const position = toPosition(state.target, selectedSlot, true);
  if (position === null) return null;
  const slotKey = buildSlotKey(location.id, selectedSlot.rowIndex, selectedSlot.slotIndex);

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="eyebrow">
        {formatRowLabel(selectedSlot.rowIndex)},{" "}
        {formatSlotLabel(location.slotLabelStyle, selectedSlot.slotIndex)}
      </p>
      <PlacementWineList
        placements={occupancy.get(slotKey)?.placements ?? []}
        emptyHint={OTHER_WINES_HINT}
      />
      <div className="mt-3">
        <CountStepper
          value={state.countAtPosition(position)}
          onChange={(count) => state.setCountAtPosition(position, count)}
        />
      </div>
    </div>
  );
}

function GridTarget(props: PlacementTargetPanelProps & { location: StorageLocationResponse }) {
  const { state, location, occupancy } = props;
  // buildPlacementKey renders exactly the key buildSlotKey produces for a full grid
  // position, so a draft entry can never be keyed onto a cell it does not belong to.
  const ownCounts = new Map(
    state.draft
      .filter(
        (entry) =>
          entry.locationId === location.id && entry.rowIndex !== null && entry.slotIndex !== null,
      )
      .map((entry) => [buildPlacementKey(entry), entry.bottleCount]),
  );
  const selectedKey =
    state.selectedSlot === null
      ? null
      : buildSlotKey(location.id, state.selectedSlot.rowIndex, state.selectedSlot.slotIndex);

  return (
    <div>
      <SlotGrid
        location={location}
        occupancy={occupancy}
        ownCounts={ownCounts}
        selectedKey={selectedKey}
        onSelectSlot={(rowIndex, slotIndex) =>
          state.addBottleToSlot(location.id, rowIndex, slotIndex)
        }
      />
      <SlotDetail {...props} location={location} />
    </div>
  );
}

function FreeTextTarget({ state }: { state: PlacementDraftState }) {
  const [description, setDescription] = useState("");
  const [bottleCount, setBottleCount] = useState(ONE_BOTTLE);

  function addFreeTextPlacement() {
    const freeText = toNullableText(description);
    if (freeText === null || bottleCount <= 0) return;
    state.addBottles({ locationId: null, rowIndex: null, slotIndex: null, freeText, bottleCount });
    setDescription("");
    setBottleCount(ONE_BOTTLE);
  }

  return (
    <div className="grid max-w-sm gap-3">
      <TextField label="Bezeichnung" value={description} onChange={setDescription} />
      <CountStepper value={bottleCount} onChange={setBottleCount} />
      <button type="button" className="button-primary" onClick={addFreeTextPlacement}>
        Hinzufügen
      </button>
    </div>
  );
}

/** What the picker shows once a chip is selected: a grid, a plain stepper, or a text form. */
export function PlacementTargetPanel(props: PlacementTargetPanelProps) {
  const { state, location } = props;
  if (state.target === null) return null;
  if (state.target.kind === "freeText") return <FreeTextTarget state={state} />;
  if (location !== null && location.kind === "grid") {
    return <GridTarget {...props} location={location} />;
  }
  const position = toPosition(state.target, state.selectedSlot, false);
  if (position === null) return null;
  const isSimpleLocation = location !== null;
  return (
    <div className="grid gap-3">
      <p>{isSimpleLocation ? SIMPLE_LOCATION_PROMPT : UNPLACED_PROMPT}</p>
      <CountStepper
        value={state.countAtPosition(position)}
        onChange={(count) => state.setCountAtPosition(position, count)}
      />
      {isSimpleLocation && (
        <div className="mt-2 border-t border-line pt-3">
          <PlacementWineList
            placements={props.occupancy.get(buildPlacementKey(position))?.placements ?? []}
            emptyHint={OTHER_WINES_HINT}
          />
        </div>
      )}
    </div>
  );
}
