"use client";

import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { ANALYSIS_STATUS_LABELS } from "@/lib/german-labels";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";
import { DeleteWineButton } from "./delete-wine-button";
import { ManualIdentityForm } from "./manual-identity-form";

export interface AnalysisStatusPanelProps {
  wine: WineResponse;
  onChanged: () => void;
  onDeleted: () => void;
}

export function AnalysisStatusPanel({ wine, onChanged, onDeleted }: AnalysisStatusPanelProps) {
  const [requestErrorCode, setRequestErrorCode] = useState<string | null>(null);
  const isAnalyzing = wine.analysisStatus === "analyzing";
  const visibleErrorCode = requestErrorCode ?? wine.analysisError;

  function retryFullAnalysis() {
    setRequestErrorCode(null);
    apiClient
      .startAnalysis(wine.id, "full")
      .then(onChanged)
      .catch((error: unknown) => setRequestErrorCode(toErrorCode(error)));
  }

  return (
    <section className="grid gap-5">
      <p className="card" aria-live="polite">
        {ANALYSIS_STATUS_LABELS[wine.analysisStatus]}
        {isAnalyzing && " Das dauert etwa eine halbe Minute."}
      </p>
      {!isAnalyzing && visibleErrorCode && <ErrorNotice errorCode={visibleErrorCode} />}
      {!isAnalyzing && (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="button-primary" onClick={retryFullAnalysis}>
              Analyse erneut versuchen
            </button>
            <DeleteWineButton wineId={wine.id} onDeleted={onDeleted} />
          </div>
          <ManualIdentityForm wine={wine} onStarted={onChanged} />
        </>
      )}
    </section>
  );
}
