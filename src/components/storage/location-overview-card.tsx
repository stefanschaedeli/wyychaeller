"use client";

import { useState } from "react";
import { formatRowLabel, formatSlotLabel } from "@/domain/storage-location";
import { describeLocationShape, formatBottleCount } from "@/lib/german-labels";
import type { PlacedBottleResponse, StorageLocationResponse } from "@/shared/api-contract";
import { PlacementWineList } from "./placement-wine-list";
import { buildSlotKey, SlotGrid, type SlotOccupancy } from "./slot-grid";

const EMPTY_SLOT_HINT = "In diesem Platz liegt nichts.";
const EMPTY_LOCATION_HINT = "An diesem Lagerort liegt nichts.";

interface SelectedSlot {
  rowIndex: number;
  slotIndex: number;
}

function GridBody({
  location,
  occupancy,
}: {
  location: StorageLocationResponse;
  occupancy: Map<string, SlotOccupancy>;
}) {
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const selectedKey =
    selectedSlot === null
      ? null
      : buildSlotKey(location.id, selectedSlot.rowIndex, selectedSlot.slotIndex);
  const selectedPlacements =
    selectedKey === null ? [] : (occupancy.get(selectedKey)?.placements ?? []);

  /** Tapping the open slot again closes its detail panel, matching the cell's aria-pressed. */
  function toggleSlot(rowIndex: number, slotIndex: number) {
    setSelectedSlot((current) =>
      current !== null && current.rowIndex === rowIndex && current.slotIndex === slotIndex
        ? null
        : { rowIndex, slotIndex },
    );
  }

  return (
    <>
      <div className="mt-3">
        <SlotGrid
          location={location}
          occupancy={occupancy}
          selectedKey={selectedKey}
          onSelectSlot={toggleSlot}
        />
      </div>
      {selectedSlot !== null && location.slotLabelStyle !== null && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="eyebrow">
            {formatRowLabel(selectedSlot.rowIndex)},{" "}
            {formatSlotLabel(location.slotLabelStyle, selectedSlot.slotIndex)}
          </p>
          <PlacementWineList placements={selectedPlacements} emptyHint={EMPTY_SLOT_HINT} />
        </div>
      )}
    </>
  );
}

export function LocationOverviewCard({
  location,
  placements,
  occupancy,
}: {
  location: StorageLocationResponse;
  placements: PlacedBottleResponse[];
  occupancy: Map<string, SlotOccupancy>;
}) {
  return (
    <section className="card">
      <h2>{location.name}</h2>
      <p className="text-ink-muted">
        {describeLocationShape(location)} · {formatBottleCount(location.bottleCount)}
      </p>
      {location.kind === "grid" ? (
        <GridBody location={location} occupancy={occupancy} />
      ) : (
        <div className="mt-3">
          <PlacementWineList placements={placements} emptyHint={EMPTY_LOCATION_HINT} />
        </div>
      )}
    </section>
  );
}
