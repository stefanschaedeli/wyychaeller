"use client";

import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";
import { IdentityFields, toIdentityFormValues, toIdentityRequest } from "./identity-fields";

/** Fallback when the label cannot be read: type the wine, then let the AI research it. */
export function ManualIdentityForm({
  wine,
  onStarted,
}: {
  wine: WineResponse;
  onStarted: () => void;
}) {
  const [identityValues, setIdentityValues] = useState(() => toIdentityFormValues(wine));
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function startResearch(event: FormEvent) {
    event.preventDefault();
    try {
      await apiClient.editWine(wine.id, toIdentityRequest(identityValues));
      await apiClient.startAnalysis(wine.id, "researchOnly");
      onStarted();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <form onSubmit={(event) => void startResearch(event)} className="grid gap-4">
      <p className="eyebrow">Von Hand eingeben</p>
      <IdentityFields values={identityValues} onChange={setIdentityValues} />
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <button type="submit" className="button-ghost">
        Recherche starten
      </button>
    </form>
  );
}
