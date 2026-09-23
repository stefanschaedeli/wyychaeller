"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { CaptureButton } from "@/components/capture/capture-button";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { WineList } from "@/components/wine/wine-list";
import { hasRunningAnalysis } from "@/lib/analysis-polling";
import { apiClient } from "@/lib/api-client";
import { ANALYSIS_POLL_INTERVAL_MILLISECONDS, useApiResource } from "@/lib/use-api-resource";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import { subscribeToWineUploaded } from "@/lib/wine-upload-events";
import type { WineResponse } from "@/shared/api-contract";

export default function CapturePage() {
  const router = useRouter();
  const loadWines = useCallback(() => apiClient.listWines({ includeEmpty: true }), []);
  // Polling stops once no wine is pending or analyzing; uploading a new photo (from this
  // page's own button or from the navigation button on any page) calls reload() below,
  // which restarts polling because the freshly created wine is pending.
  const wineList = useApiResource(loadWines, {
    pollIntervalMilliseconds: ANALYSIS_POLL_INTERVAL_MILLISECONDS,
    shouldPoll: hasRunningAnalysis,
  });
  const { reload } = wineList;
  // The picker comes first: the wine needs bottles before it can be confirmed.
  const goToPlacementPicker = useCallback(
    (wine: WineResponse) => {
      reload();
      router.push(`/wines/${wine.id}/lagerort`);
    },
    [reload, router],
  );
  const photoUpload = usePhotoUpload(goToPlacementPicker);

  useEffect(() => subscribeToWineUploaded(wineList.reload), [wineList.reload]);

  const winesInCapture = (wineList.data?.wines ?? []).filter(
    (wine) => wine.analysisStatus !== "complete",
  );

  return (
    <>
      <PageHeader eyebrow="Neuer Wein" title="Etikett fotografieren" />
      <p className="mb-4 text-ink-muted">
        Ein Foto genügt. Die Analyse dauert etwa eine halbe Minute und läuft im Hintergrund. Du
        kannst sofort das nächste Etikett fotografieren.
      </p>
      <CaptureButton variant="large" onPhotoSelected={photoUpload.uploadPhoto} />
      {photoUpload.isUploading && <p className="mt-3 text-ink-muted">Foto wird hochgeladen …</p>}
      {photoUpload.errorCode && (
        <div className="mt-3">
          <ErrorNotice errorCode={photoUpload.errorCode} />
        </div>
      )}
      {wineList.errorCode && (
        <ErrorNotice errorCode={wineList.errorCode} onRetry={wineList.reload} />
      )}

      {winesInCapture.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">In Arbeit</p>
          <WineList wines={winesInCapture} />
        </section>
      )}
    </>
  );
}
