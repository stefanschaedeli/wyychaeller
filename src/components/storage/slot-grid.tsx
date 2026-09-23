"use client";

import { buildPlacementKey, formatRowLabel } from "@/domain/storage-location";
import type { SlotOccupancy } from "@/lib/slot-occupancy";
import type { StorageLocationResponse } from "@/shared/api-contract";
import { SlotCell } from "./slot-cell";

export type { SlotOccupancy };

export interface SlotGridProps {
  location: StorageLocationResponse;
  occupancy: Map<string, SlotOccupancy>;
  /** Bottles the current draft puts into a slot, shown as a pill on top of the cellar total. */
  ownCounts?: Map<string, number>;
  selectedKey?: string | null;
  onSelectSlot?: (rowIndex: number, slotIndex: number) => void;
}

export function buildSlotKey(locationId: number, rowIndex: number, slotIndex: number): string {
  return buildPlacementKey({ locationId, rowIndex, slotIndex, freeText: null });
}

function buildIndexRange(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

export function SlotGrid(props: SlotGridProps) {
  const { location, occupancy, ownCounts, selectedKey, onSelectSlot } = props;
  if (location.rowCount === null || location.slotsPerRow === null) return null;
  const slotLabelStyle = location.slotLabelStyle;
  if (slotLabelStyle === null) return null;
  const slotsPerRow = location.slotsPerRow;

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-3">
        {buildIndexRange(location.rowCount).map((rowIndex) => (
          <div key={rowIndex}>
            <p className="eyebrow mb-1">{formatRowLabel(rowIndex)}</p>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${slotsPerRow}, minmax(2.75rem, 1fr))` }}
            >
              {buildIndexRange(slotsPerRow).map((slotIndex) => {
                const slotKey = buildSlotKey(location.id, rowIndex, slotIndex);
                return (
                  <SlotCell
                    key={slotIndex}
                    slotLabelStyle={slotLabelStyle}
                    rowIndex={rowIndex}
                    slotIndex={slotIndex}
                    bottleCount={occupancy.get(slotKey)?.bottleCount ?? 0}
                    ownCount={ownCounts?.get(slotKey) ?? null}
                    isSelected={selectedKey === slotKey}
                    onSelect={() => onSelectSlot?.(rowIndex, slotIndex)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
