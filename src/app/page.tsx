"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { CellarFilters } from "@/components/wine/cellar-filters";
import { WineList } from "@/components/wine/wine-list";
import type { DrinkingMaturity, WineType } from "@/domain/wine-types";
import { hasRunningAnalysis } from "@/lib/analysis-polling";
import { apiClient } from "@/lib/api-client";
import { formatBottleCount } from "@/lib/german-labels";
import { ANALYSIS_POLL_INTERVAL_MILLISECONDS, useApiResource } from "@/lib/use-api-resource";

function DrinkSoonTeaser() {
  const summary = useApiResource(useCallback(() => apiClient.getCellarSummary(), []));
  if (summary.data === null) return null;
  const urgentCount = summary.data.maturityCounts.drinkSoon + summary.data.maturityCounts.overdue;
  if (urgentCount === 0) return null;

  return (
    <Link href="/soon" className="card mb-6 block">
      <p className="eyebrow">Bald trinken</p>
      <p className="mt-1">
        {urgentCount === 1 ? "1 Wein sollte" : `${urgentCount} Weine sollten`} bald getrunken
        werden.
      </p>
    </Link>
  );
}

export default function CellarPage() {
  const [searchText, setSearchText] = useState("");
  const [wineType, setWineType] = useState<WineType | "">("");
  const [maturity, setMaturity] = useState<DrinkingMaturity | "">("");
  const loadWines = useCallback(
    () =>
      apiClient.listWines({
        search: searchText,
        wineType: wineType || undefined,
        maturity: maturity || undefined,
      }),
    [searchText, wineType, maturity],
  );
  const wineList = useApiResource(loadWines, {
    pollIntervalMilliseconds: ANALYSIS_POLL_INTERVAL_MILLISECONDS,
    shouldPoll: hasRunningAnalysis,
  });

  const wines = wineList.data?.wines ?? [];
  const totalBottles = wines.reduce((sum, wine) => sum + wine.bottleCount, 0);
  const hasFilter = searchText !== "" || wineType !== "" || maturity !== "";

  return (
    <>
      <PageHeader eyebrow={`Mein Keller · ${formatBottleCount(totalBottles)}`} title="Weinkeller" />
      <DrinkSoonTeaser />
      <CellarFilters
        searchText={searchText}
        onSearchTextChange={setSearchText}
        wineType={wineType}
        onWineTypeChange={setWineType}
        maturity={maturity}
        onMaturityChange={setMaturity}
      />
      {wineList.errorCode && (
        <ErrorNotice errorCode={wineList.errorCode} onRetry={wineList.reload} />
      )}
      {!wineList.isLoading && wines.length === 0 && !wineList.errorCode && (
        <EmptyState
          title={hasFilter ? "Nichts gefunden" : "Noch keine Weine"}
          hint={
            hasFilter
              ? "Kein Wein passt zu dieser Suche."
              : "Tippe auf + und fotografiere das erste Etikett."
          }
        />
      )}
      <WineList wines={wines} />
    </>
  );
}
