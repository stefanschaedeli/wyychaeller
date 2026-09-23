"use client";

import { SelectField } from "@/components/shared/select-field";
import { TextField } from "@/components/shared/text-field";

export interface GridShapeFieldsProps {
  rowCountText: string;
  onRowCountChange: (value: string) => void;
  slotStyleValue: string;
  onSlotStyleChange: (value: string) => void;
  slotStyleOptions: { value: string; label: string }[];
  slotCountText: string;
  onSlotCountChange: (value: string) => void;
}

/** The three grid-only fields; "Anzahl Plätze" only appears for the numbered style. */
export function GridShapeFields(props: GridShapeFieldsProps) {
  return (
    <>
      <TextField
        label="Reihen"
        value={props.rowCountText}
        onChange={props.onRowCountChange}
        inputMode="numeric"
      />
      <SelectField
        label="Plätze pro Reihe"
        value={props.slotStyleValue}
        onChange={props.onSlotStyleChange}
        options={props.slotStyleOptions}
        emptyOptionLabel="Bitte wählen"
      />
      {props.slotStyleValue === "numbered" && (
        <TextField
          label="Anzahl Plätze"
          value={props.slotCountText}
          onChange={props.onSlotCountChange}
          inputMode="numeric"
        />
      )}
    </>
  );
}
