"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { WinePhoto } from "@/components/shared/wine-photo";
import { AnalysisStatusPanel } from "@/components/wine/analysis-status-panel";
import { ConfirmationForm } from "@/components/wine/confirmation-form";
import { DuplicatePanel } from "@/components/wine/duplicate-panel";
import { apiClient } from "@/lib/api-client";
import { formatWineTitle } from "@/lib/german-labels";
import { parseWineIdParameter } from "@/lib/route-parameters";
import { ANALYSIS_POLL_INTERVAL_MILLISECONDS, useApiResource } from "@/lib/use-api-resource";
import type { TastingResponse, WineResponse } from "@/shared/api-contract";

type WineDetailsData = { wine: WineResponse; tastings: TastingResponse[] };

function isWaitingForAnalysis(details: WineDetailsData): boolean {
  return ["pending", "analyzing"].includes(details.wine.analysisStatus);
}

/** Only the data-loading hooks live here, so they never run for an invalid wine id. */
function WineDetails({ wineId }: { wineId: number }) {
  const router = useRouter();
  const loadWine = useCallback(() => apiClient.getWine(wineId), [wineId]);
  const details = useApiResource(loadWine, {
    pollIntervalMilliseconds: ANALYSIS_POLL_INTERVAL_MILLISECONDS,
    shouldPoll: isWaitingForAnalysis,
  });
  const goToCellar = useCallback(() => router.push("/"), [router]);

  if (details.errorCode) {
    return <ErrorNotice errorCode={details.errorCode} onRetry={details.reload} />;
  }
  if (details.data === null) return <p className="text-ink-muted">Wird geladen …</p>;
  const { wine } = details.data;

  if (wine.analysisStatus === "complete") {
    return <PageHeader eyebrow="Im Keller" title={formatWineTitle(wine)} />;
  }

  const isAwaitingConfirmation = wine.analysisStatus === "awaitingConfirmation";
  const isDuplicate = isAwaitingConfirmation && wine.duplicateOfWineId !== null;
  return (
    <>
      <PageHeader
        eyebrow="Neuer Wein"
        title={isAwaitingConfirmation && !isDuplicate ? "Stimmt das so?" : formatWineTitle(wine)}
      />
      <div className="mb-5">
        <WinePhoto photoUrl={wine.photoUrl} alt="Foto des Etiketts" size="hero" />
      </div>
      {isDuplicate && (
        <DuplicatePanel
          wine={wine}
          onMerged={(existingWineId) => router.push(`/wines/${existingWineId}`)}
          onDeleted={goToCellar}
        />
      )}
      {isAwaitingConfirmation && !isDuplicate && (
        <ConfirmationForm wine={wine} onConfirmed={details.reload} />
      )}
      {!isAwaitingConfirmation && (
        <AnalysisStatusPanel wine={wine} onChanged={details.reload} onDeleted={goToCellar} />
      )}
    </>
  );
}

export default function WinePage() {
  const wineId = parseWineIdParameter(useParams<{ wineId: string }>().wineId);
  if (wineId === null) return <ErrorNotice errorCode="notFound" />;
  return <WineDetails wineId={wineId} />;
}
