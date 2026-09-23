"use client";

import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { parseOptionalNumber } from "@/lib/form-values";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";
import { IdentityFields, toIdentityFormValues, toIdentityRequest } from "./identity-fields";

export interface ConfirmationFormProps {
  wine: WineResponse;
  onConfirmed: () => void;
}

export function ConfirmationForm({ wine, onConfirmed }: ConfirmationFormProps) {
  const [identityValues, setIdentityValues] = useState(() => toIdentityFormValues(wine));
  const [purchasePriceText, setPurchasePriceText] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function confirmWine(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    try {
      await apiClient.confirmWine(wine.id, {
        ...toIdentityRequest(identityValues),
        purchasePricePerBottle: parseOptionalNumber(purchasePriceText),
      });
      onConfirmed();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void confirmWine(event)} className="grid gap-5">
      <IdentityFields values={identityValues} onChange={setIdentityValues} />
      <fieldset className="card grid gap-3 md:grid-cols-3">
        <legend className="eyebrow px-1">Im Keller</legend>
        <TextField
          label="Kaufpreis pro Flasche"
          value={purchasePriceText}
          onChange={setPurchasePriceText}
          inputMode="decimal"
        />
      </fieldset>
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <button type="submit" className="button-primary" disabled={isSaving}>
        In den Keller legen
      </button>
    </form>
  );
}
