"use client";

import { useId, useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { toNullableText } from "@/lib/form-values";
import { formatBottleCount } from "@/lib/german-labels";
import { getTodayAsIsoDate } from "@/lib/today-iso-date";
import { toErrorCode } from "@/lib/use-api-resource";
import type { BottlePlacementResponse } from "@/shared/api-contract";
import { StarRatingInput } from "./star-rating-input";

export interface TastingFormProps {
  wineId: number;
  placements: BottlePlacementResponse[];
  onRecorded: () => void;
  onCancel: () => void;
}

/** Only a wine stored in several places needs the question; one place answers it itself. */
function PlacementChoice({
  placements,
  selectedPlacementId,
  onSelect,
  errorNoticeId,
}: {
  placements: BottlePlacementResponse[];
  selectedPlacementId: number | null;
  onSelect: (placementId: number) => void;
  /** Points at the notice while the choice is missing, so the error is announced with it. */
  errorNoticeId: string | null;
}) {
  return (
    <fieldset className="grid gap-2" aria-describedby={errorNoticeId ?? undefined}>
      <legend className="field-label">Aus welchem Lagerort?</legend>
      {placements.map((placement) => (
        <label key={placement.id} className="flex min-h-11 items-center gap-2">
          <input
            type="radio"
            name="placement"
            value={placement.id}
            checked={selectedPlacementId === placement.id}
            onChange={() => onSelect(placement.id)}
          />
          <span>
            {placement.description} · {formatBottleCount(placement.bottleCount)}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function TastingForm({ wineId, placements, onRecorded, onCancel }: TastingFormProps) {
  const noteId = useId();
  const errorNoticeId = useId();
  const [starRating, setStarRating] = useState<number | null>(null);
  const [tastingNote, setTastingNote] = useState("");
  const [occasionOrDish, setOccasionOrDish] = useState("");
  const [placementId, setPlacementId] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const hasPlacementChoice = placements.length > 1;

  async function recordTasting(event: FormEvent) {
    event.preventDefault();
    setErrorCode(null);
    if (hasPlacementChoice && placementId === null) {
      setErrorCode("placementRequired");
      return;
    }
    try {
      await apiClient.recordTasting(wineId, {
        placementId: hasPlacementChoice ? placementId : null,
        tastedOn: getTodayAsIsoDate(new Date()),
        starRating,
        tastingNote: toNullableText(tastingNote),
        occasionOrDish: toNullableText(occasionOrDish),
      });
      onRecorded();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <form onSubmit={(event) => void recordTasting(event)} className="card grid gap-4">
      <p className="eyebrow">Flasche getrunken</p>
      {hasPlacementChoice && (
        <PlacementChoice
          placements={placements}
          selectedPlacementId={placementId}
          onSelect={setPlacementId}
          errorNoticeId={errorCode === "placementRequired" ? errorNoticeId : null}
        />
      )}
      <StarRatingInput value={starRating} onChange={setStarRating} />
      <div>
        <label htmlFor={noteId} className="field-label">
          Verkostungsnotiz
        </label>
        <textarea
          id={noteId}
          className="field-input min-h-24 py-2"
          maxLength={2000}
          value={tastingNote}
          onChange={(event) => setTastingNote(event.target.value)}
        />
      </div>
      <TextField label="Anlass oder Essen" value={occasionOrDish} onChange={setOccasionOrDish} />
      {errorCode && <ErrorNotice errorCode={errorCode} id={errorNoticeId} shouldTakeFocus />}
      <div className="flex gap-2">
        <button type="submit" className="button-primary">
          Speichern
        </button>
        <button type="button" className="button-ghost" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
