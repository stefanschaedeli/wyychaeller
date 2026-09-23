"use client";

import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { SelectField } from "@/components/shared/select-field";
import { TextField } from "@/components/shared/text-field";
import { MAXIMUM_LOCATION_NAME_LENGTH } from "@/domain/constants";
import {
  requiredSlotsPerRow,
  SLOT_LABEL_STYLES,
  STORAGE_LOCATION_KINDS,
  type SlotLabelStyle,
  type StorageLocationKind,
} from "@/domain/storage-location";
import { parseOptionalInteger, toInputText } from "@/lib/form-values";
import { SLOT_LABEL_STYLE_LABELS, STORAGE_LOCATION_KIND_LABELS } from "@/lib/german-labels";
import type { StorageLocationRequest, StorageLocationResponse } from "@/shared/api-contract";
import { GridShapeFields } from "./location-form-fields";

const KIND_OPTIONS = STORAGE_LOCATION_KINDS.map((kind) => ({
  value: kind,
  label: STORAGE_LOCATION_KIND_LABELS[kind],
}));

const SLOT_STYLE_OPTIONS = SLOT_LABEL_STYLES.map((style) => ({
  value: style,
  label: SLOT_LABEL_STYLE_LABELS[style],
}));

function toKind(value: string): StorageLocationKind {
  return value === "grid" ? "grid" : "simple";
}

function toSlotLabelStyle(value: string): SlotLabelStyle | null {
  return SLOT_LABEL_STYLES.find((style) => style === value) ?? null;
}

/** Builds the request body, or null when a number the user typed is unusable. */
function buildRequest(
  name: string,
  kind: StorageLocationKind,
  rowCountText: string,
  slotLabelStyle: SlotLabelStyle | null,
  slotCountText: string,
): StorageLocationRequest | null {
  const trimmedName = name.trim();
  if (trimmedName === "") return null;
  if (kind === "simple") return { kind: "simple", name: trimmedName };
  const rowCount = parseOptionalInteger(rowCountText);
  if (rowCount === null || slotLabelStyle === null) return null;
  const slotsPerRow = requiredSlotsPerRow(slotLabelStyle) ?? parseOptionalInteger(slotCountText);
  if (slotsPerRow === null) return null;
  return { kind: "grid", name: trimmedName, rowCount, slotsPerRow, slotLabelStyle };
}

export interface LocationFormProps {
  location: StorageLocationResponse | null;
  onSubmit: (request: StorageLocationRequest) => Promise<void>;
  onCancel: () => void;
}

export function LocationForm({ location, onSubmit, onCancel }: LocationFormProps) {
  const [name, setName] = useState(location?.name ?? "");
  const [kindValue, setKindValue] = useState<string>(location?.kind ?? "simple");
  const [rowCountText, setRowCountText] = useState(toInputText(location?.rowCount ?? null));
  const [slotStyleValue, setSlotStyleValue] = useState<string>(location?.slotLabelStyle ?? "");
  const [slotCountText, setSlotCountText] = useState(toInputText(location?.slotsPerRow ?? null));
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const kind = toKind(kindValue);
  const slotLabelStyle = toSlotLabelStyle(slotStyleValue);

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    const request = buildRequest(name, kind, rowCountText, slotLabelStyle, slotCountText);
    if (request === null) {
      setErrorCode("invalidInput");
      return;
    }
    setErrorCode(null);
    await onSubmit(request);
  }

  return (
    <form onSubmit={(event) => void submitForm(event)} className="mt-3 grid max-w-md gap-4">
      <TextField
        label="Name"
        value={name}
        onChange={setName}
        isRequired
        maximumLength={MAXIMUM_LOCATION_NAME_LENGTH}
      />
      <SelectField
        label="Art"
        value={kindValue}
        onChange={setKindValue}
        options={KIND_OPTIONS}
        emptyOptionLabel="Bitte wählen"
      />
      {kind === "grid" && (
        <GridShapeFields
          rowCountText={rowCountText}
          onRowCountChange={setRowCountText}
          slotStyleValue={slotStyleValue}
          onSlotStyleChange={setSlotStyleValue}
          slotStyleOptions={SLOT_STYLE_OPTIONS}
          slotCountText={slotCountText}
          onSlotCountChange={setSlotCountText}
        />
      )}
      <p className="-mt-2 text-sm text-ink-muted">
        Flaschen ausserhalb des neuen Rasters behalten ihren Lagerort als Text.
      </p>
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="button-primary">
          Lagerort speichern
        </button>
        <button type="button" className="button-ghost" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
