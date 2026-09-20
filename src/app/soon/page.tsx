"use client";

import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { WineList } from "@/components/wine/wine-list";
import { isUrgentMaturity } from "@/domain/drinking-maturity";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";

export default function DrinkSoonPage() {
  const loadWines = useCallback(() => apiClient.listWines({ sort: "urgency" }), []);
  const wineList = useApiResource(loadWines);

  const urgentWines = (wineList.data?.wines ?? []).filter(
    (wine) => wine.analysisStatus === "complete" && isUrgentMaturity(wine.drinkingMaturity),
  );

  return (
    <>
      <PageHeader eyebrow="Nach Dringlichkeit" title="Bald trinken" />
      {wineList.errorCode && (
        <ErrorNotice errorCode={wineList.errorCode} onRetry={wineList.reload} />
      )}
      {!wineList.isLoading && urgentWines.length === 0 && !wineList.errorCode && (
        <EmptyState
          title="Nichts eilt"
          hint="Kein Wein ist überfällig oder am Ende seines Trinkfensters."
        />
      )}
      <WineList wines={urgentWines} />
    </>
  );
}
