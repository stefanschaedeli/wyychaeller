"use client";

import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import {
  parseBottleCount,
  parseOptionalInteger,
  parseOptionalNumber,
  toInputText,
  toNullableText,
} from "@/lib/form-values";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";

export interface CellarEditFormProps {
  wine: WineResponse;
  onSaved: () => void;
  onCancel: () => void;
}

export function CellarEditForm({ wine, onSaved, onCancel }: CellarEditFormProps) {
  const [bottleCountText, setBottleCountText] = useState(toInputText(wine.bottleCount));
  const [storageLocation, setStorageLocation] = useState(toInputText(wine.storageLocation));
  const [purchasePriceText, setPurchasePriceText] = useState(
    toInputText(wine.purchasePricePerBottle),
  );
  const [drinkFromText, setDrinkFromText] = useState(toInputText(wine.drinkFromYear));
  const [drinkUntilText, setDrinkUntilText] = useState(toInputText(wine.drinkUntilYear));
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function saveChanges(event: FormEvent) {
    event.preventDefault();
    const bottleCount = parseBottleCount(bottleCountText, 0);
    if (bottleCount === null) {
      setErrorCode("invalidInput");
      return;
    }
    try {
      await apiClient.editWine(wine.id, {
        bottleCount,
        storageLocation: toNullableText(storageLocation),
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
      <TextField
        label="Anzahl Flaschen"
        value={bottleCountText}
        onChange={setBottleCountText}
        inputMode="numeric"
      />
      <TextField label="Lagerort" value={storageLocation} onChange={setStorageLocation} />
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
