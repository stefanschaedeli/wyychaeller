"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { LocationOverview } from "@/components/storage/location-overview";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";

export default function StorageOverviewPage() {
  const overview = useApiResource(useCallback(() => apiClient.getStorageOverview(), []));
  const hasNothingStored =
    overview.data !== null &&
    overview.data.locations.length === 0 &&
    overview.data.placements.length === 0;

  return (
    <>
      <PageHeader
        eyebrow="Mehr"
        title="Lagerorte"
        action={
          <Link href="/more/settings/lagerorte" className="button-ghost">
            Verwalten
          </Link>
        }
      />
      {overview.errorCode && (
        <ErrorNotice errorCode={overview.errorCode} onRetry={overview.reload} />
      )}
      {hasNothingStored && (
        <EmptyState
          title="Noch keine Lagerorte"
          hint="Lege unter «Verwalten» einen Lagerort an, um Flaschen zuzuordnen."
        />
      )}
      {overview.data && !hasNothingStored && <LocationOverview overview={overview.data} />}
    </>
  );
}
