import Link from "next/link";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { formatWineTitle } from "@/lib/german-labels";
import type { DishRecommendationResponse } from "@/shared/api-contract";

export function DishRecommendationList({ result }: { result: DishRecommendationResponse }) {
  if (result.recommendations.length === 0) {
    return (
      <p className="card mt-5">Im Keller liegt gerade kein passender Wein zu diesem Gericht.</p>
    );
  }
  return (
    <section className="mt-5">
      <p className="eyebrow">Aus deinem Keller zu «{result.dish}»</p>
      <ol>
        {result.recommendations.map((recommendation, index) => (
          <li key={recommendation.wine.id} className="border-b border-line py-3">
            <p className="flex flex-wrap items-center gap-2">
              <Link
                href={`/wines/${recommendation.wine.id}`}
                className="font-semibold text-bordeaux underline"
              >
                {index + 1} · {formatWineTitle(recommendation.wine)}
              </Link>
              <MaturityBadge maturity={recommendation.wine.drinkingMaturity} />
            </p>
            <p>{recommendation.reasoning}</p>
            {recommendation.servingTip && (
              <p className="text-ink-muted">{recommendation.servingTip}</p>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-3 font-sans text-xs text-ink-muted">
        {result.isFromCache ? "Gespeicherte Antwort, ohne KI-Kosten" : "Neue Empfehlung"}
      </p>
    </section>
  );
}
