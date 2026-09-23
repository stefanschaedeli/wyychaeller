"use client";

import { useId, useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { toNullableText } from "@/lib/form-values";
import { getTodayAsIsoDate } from "@/lib/today-iso-date";
import { toErrorCode } from "@/lib/use-api-resource";
import { StarRatingInput } from "./star-rating-input";

export interface TastingFormProps {
  wineId: number;
  onRecorded: () => void;
  onCancel: () => void;
}

export function TastingForm({ wineId, onRecorded, onCancel }: TastingFormProps) {
  const noteId = useId();
  const [starRating, setStarRating] = useState<number | null>(null);
  const [tastingNote, setTastingNote] = useState("");
  const [occasionOrDish, setOccasionOrDish] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function recordTasting(event: FormEvent) {
    event.preventDefault();
    try {
      await apiClient.recordTasting(wineId, {
        placementId: null,
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
      {errorCode && <ErrorNotice errorCode={errorCode} />}
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
