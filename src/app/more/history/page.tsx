"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { formatTastingDate, StarRatingDisplay } from "@/components/wine/tasting-list";
import { apiClient } from "@/lib/api-client";
import { formatWineTitle } from "@/lib/german-labels";
import { useApiResource } from "@/lib/use-api-resource";

export default function TastingHistoryPage() {
  const history = useApiResource(useCallback(() => apiClient.listTastings(), []));
  const tastings = history.data?.tastings ?? [];

  return (
    <>
      <PageHeader eyebrow="Historie" title="Verkostungen" />
      {history.errorCode && <ErrorNotice errorCode={history.errorCode} onRetry={history.reload} />}
      {!history.isLoading && tastings.length === 0 && !history.errorCode && (
        <EmptyState title="Noch nichts getrunken" hint="Getrunkene Flaschen erscheinen hier." />
      )}
      <ul>
        {tastings.map((tasting) => (
          <li key={tasting.id} className="border-b border-line py-3">
            <p className="font-sans text-xs text-ink-muted">
              {formatTastingDate(tasting.tastedOn)}{" "}
              <StarRatingDisplay starRating={tasting.starRating} />
            </p>
            <Link
              href={`/wines/${tasting.wineId}`}
              className="font-semibold text-bordeaux underline"
            >
              {formatWineTitle({
                producer: tasting.wineProducer,
                name: tasting.wineName,
                vintage: tasting.wineVintage,
              })}
            </Link>
            {tasting.tastingNote && <p>{tasting.tastingNote}</p>}
            {tasting.occasionOrDish && <p className="text-ink-muted">{tasting.occasionOrDish}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
