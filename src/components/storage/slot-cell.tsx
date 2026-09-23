"use client";

import { formatRowLabel, formatSlotLabel, type SlotLabelStyle } from "@/domain/storage-location";
import { formatBottleCount } from "@/lib/german-labels";

export interface SlotCellProps {
  slotLabelStyle: SlotLabelStyle;
  rowIndex: number;
  slotIndex: number;
  bottleCount: number;
  ownCount: number | null;
  isSelected: boolean;
  onSelect: () => void;
}

/** One slot of a grid location: tappable, labelled for screen readers, counts on the face. */
export function SlotCell(props: SlotCellProps) {
  const slotLabel = formatSlotLabel(props.slotLabelStyle, props.slotIndex);
  const contentLabel = props.bottleCount === 0 ? "leer" : formatBottleCount(props.bottleCount);
  const ariaLabel = `${formatRowLabel(props.rowIndex)}, ${slotLabel}: ${contentLabel}`;
  const filledClasses = props.isSelected
    ? "bg-bordeaux text-paper border-bordeaux"
    : "bg-card text-ink border-line";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={props.isSelected}
      onClick={props.onSelect}
      className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xs border px-1 py-1 ${filledClasses}`}
    >
      <span className="font-sans text-[0.625rem] leading-none">{slotLabel}</span>
      <span className="font-sans text-xs leading-none">{props.bottleCount}</span>
      {props.ownCount !== null && <span className="pill">{props.ownCount}</span>}
    </button>
  );
}
