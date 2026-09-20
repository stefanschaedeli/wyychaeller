import Link from "next/link";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { WinePhoto } from "@/components/shared/wine-photo";
import {
  ANALYSIS_STATUS_LABELS,
  formatBottleCount,
  formatWineOrigin,
  formatWineTitle,
} from "@/lib/german-labels";
import type { WineResponse } from "@/shared/api-contract";

function WineListItemBadges({ wine }: { wine: WineResponse }) {
  if (wine.analysisStatus !== "complete") {
    return <span className="pill">{ANALYSIS_STATUS_LABELS[wine.analysisStatus]}</span>;
  }
  return (
    <>
      <ScoreBadge score={wine.aggregateScore} confidence={wine.confidence} />
      <MaturityBadge maturity={wine.drinkingMaturity} />
    </>
  );
}

export function WineListItem({ wine }: { wine: WineResponse }) {
  const title = formatWineTitle(wine);
  return (
    <li className="border-b border-line">
      <Link href={`/wines/${wine.id}`} className="flex items-center gap-3 py-3">
        <WinePhoto photoUrl={wine.photoUrl} alt="" size="thumbnail" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-sm text-ink-muted">
            {[wine.producer, formatWineOrigin(wine)].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <WineListItemBadges wine={wine} />
          </div>
        </div>
        {wine.analysisStatus === "complete" && (
          <p className="font-sans text-sm" aria-label={formatBottleCount(wine.bottleCount)}>
            {wine.bottleCount}×
          </p>
        )}
      </Link>
    </li>
  );
}
