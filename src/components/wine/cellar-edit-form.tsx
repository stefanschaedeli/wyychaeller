"use client";

import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { PlacementSummary } from "@/components/storage/placement-summary";
import { apiClient } from "@/lib/api-client";
import { parseOptionalInteger, parseOptionalNumber, toInputText } from "@/lib/form-values";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";

export interface CellarEditFormProps {
  wine: WineResponse;
  onSaved: () => void;
  onCancel: () => void;
}

export function CellarEditForm({ wine, onSaved, onCancel }: CellarEditFormProps) {
  const [purchasePriceText, setPurchasePriceText] = useState(
    toInputText(wine.purchasePricePerBottle),
  );
  const [drinkFromText, setDrinkFromText] = useState(toInputText(wine.drinkFromYear));
  const [drinkUntilText, setDrinkUntilText] = useState(toInputText(wine.drinkUntilYear));
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function saveChanges(event: FormEvent) {
    event.preventDefault();
    try {
      await apiClient.editWine(wine.id, {
        purchasePricePerBottle: parseOptionalNumber(purchasePriceText),
        drinkFromYear: parseOptionalInteger(drinkFromText),
        drinkUntilYear: parseOptionalInteger(drinkUntilText),
      });
      onSaved();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <form onSubmit={(event) => void saveChanges(event)} className="card grid gap-3 md:grid-cols-2">
      <div className="md:col-span-2">
        <PlacementSummary
          wine={wine}
          changeHref={`/wines/${wine.id}/lagerort`}
          changeLabel="Lagerung ändern"
        />
      </div>
      <TextField
        label="Kaufpreis pro Flasche"
        value={purchasePriceText}
        onChange={setPurchasePriceText}
        inputMode="decimal"
      />
      <TextField
        label="Trinken ab (Jahr)"
        value={drinkFromText}
        onChange={setDrinkFromText}
        inputMode="numeric"
      />
      <TextField
        label="Trinken bis (Jahr)"
        value={drinkUntilText}
        onChange={setDrinkUntilText}
        inputMode="numeric"
      />
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="button-primary">
          Änderungen speichern
        </button>
        <button type="button" className="button-ghost" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
