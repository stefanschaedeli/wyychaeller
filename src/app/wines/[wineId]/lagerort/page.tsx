"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { PlacementPicker } from "@/components/storage/placement-picker";
import { apiClient } from "@/lib/api-client";
import { parseWineIdParameter } from "@/lib/route-parameters";
import { useApiResource } from "@/lib/use-api-resource";

/** Loading only starts once the id is valid, so a bad URL never reaches the API. */
function PlacementLoader({ wineId }: { wineId: number }) {
  const details = useApiResource(useCallback(() => apiClient.getWine(wineId), [wineId]));
  const overview = useApiResource(useCallback(() => apiClient.getStorageOverview(), []));
  const errorCode = details.errorCode ?? overview.errorCode;

  if (errorCode !== null) {
    return (
      <ErrorNotice
        errorCode={errorCode}
        onRetry={() => {
          details.reload();
          overview.reload();
        }}
      />
    );
  }
  if (details.data === null || overview.data === null) {
    return <p className="text-ink-muted">Wird geladen …</p>;
  }
  return <PlacementPicker key={wineId} wine={details.data.wine} overview={overview.data} />;
}

export default function PlacementPage() {
  const wineId = parseWineIdParameter(useParams<{ wineId: string }>().wineId);
  return (
    <>
      <PageHeader eyebrow="Lagerort" title="Wo liegen die Flaschen?" />
      {wineId === null ? <ErrorNotice errorCode="notFound" /> : <PlacementLoader wineId={wineId} />}
    </>
  );
}
