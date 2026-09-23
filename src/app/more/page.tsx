"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { DRINKING_MATURITIES } from "@/domain/wine-types";
import { apiClient } from "@/lib/api-client";
import {
  formatBottleCount,
  formatCurrency,
  formatWineCount,
  MATURITY_LABELS,
} from "@/lib/german-labels";
import { useApiResource } from "@/lib/use-api-resource";
import type { CellarSummaryResponse } from "@/shared/api-contract";

function CellarValueCard({ summary }: { summary: CellarSummaryResponse }) {
  return (
    <section className="card">
      <p className="eyebrow">Kellerwert</p>
      <p className="mt-1 text-xl">
        {formatBottleCount(summary.bottleCount)} in {formatWineCount(summary.wineCount)}
      </p>
      <p>Einkaufswert {formatCurrency(summary.purchaseValue, summary.currency)}</p>
      <p>Geschätzter Marktwert {formatCurrency(summary.estimatedMarketValue, summary.currency)}</p>
      <p className="mt-2 text-sm text-ink-muted">
        {DRINKING_MATURITIES.filter((maturity) => summary.maturityCounts[maturity] > 0)
          .map((maturity) => `${summary.maturityCounts[maturity]} ${MATURITY_LABELS[maturity]}`)
          .join(" · ")}
      </p>
    </section>
  );
}

function AiUsageCard({ summary }: { summary: CellarSummaryResponse }) {
  return (
    <section className="card">
      <p className="eyebrow">Künstliche Intelligenz</p>
      <p className="mt-1">
        KI-Aufrufe diesen Monat: {summary.aiCallsThisMonth} von {summary.monthlyAiCallLimit}
      </p>
      {!summary.isAiConfigured && (
        <p className="mt-1 text-alert">
          Kein API-Schlüssel hinterlegt. Erfassen per Foto ist erst nach dem Eintragen von
          ANTHROPIC_API_KEY oder GEMINI_API_KEY möglich.
        </p>
      )}
      <p className="mt-2 text-sm text-ink-muted">
        Kosten entstehen nur beim Erfassen, bei «Neu bewerten» und bei neuen Essensanfragen.
      </p>
    </section>
  );
}

export default function MorePage() {
  const summary = useApiResource(useCallback(() => apiClient.getCellarSummary(), []));

  return (
    <>
      <PageHeader eyebrow="Übersicht" title="Mehr" />
      {summary.errorCode && <ErrorNotice errorCode={summary.errorCode} onRetry={summary.reload} />}
      {summary.data && (
        <div className="grid gap-4 md:grid-cols-2">
          <CellarValueCard summary={summary.data} />
          <AiUsageCard summary={summary.data} />
        </div>
      )}
      <nav aria-label="Weitere Seiten" className="mt-6 grid gap-2">
        <Link href="/more/history" className="button-ghost">
          Verkostungen
        </Link>
        <Link href="/more/lagerorte" className="button-ghost">
          Lagerorte
        </Link>
        <Link href="/more/settings" className="button-ghost">
          Einstellungen
        </Link>
      </nav>
    </>
  );
}
