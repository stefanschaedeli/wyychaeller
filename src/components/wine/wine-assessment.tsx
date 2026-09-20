import { formatCurrency } from "@/lib/german-labels";
import { isWebLink } from "@/lib/web-links";
import type { WineResponse } from "@/shared/api-contract";

function CriticScoreList({ wine }: { wine: WineResponse }) {
  if (wine.criticScores.length === 0) {
    return <p className="text-ink-muted">Keine Kritikerbewertungen gefunden.</p>;
  }
  return (
    <ul className="grid gap-1">
      {wine.criticScores.map((criticScore) => (
        <li key={`${criticScore.source}-${criticScore.points}`}>
          {isWebLink(criticScore.url) && criticScore.url !== null ? (
            <a
              href={criticScore.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bordeaux underline"
            >
              {criticScore.source}
            </a>
          ) : (
            criticScore.source
          )}
          {" · "}
          {criticScore.points} Punkte
        </li>
      ))}
    </ul>
  );
}

export function WineAssessment({ wine, currency }: { wine: WineResponse; currency: string }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="card">
        <p className="eyebrow">Passt zu</p>
        <p className="mt-1">{wine.foodPairings.join(" · ") || "Keine Empfehlung vorhanden."}</p>
      </section>
      <section className="card">
        <p className="eyebrow">Bewertungen</p>
        <div className="mt-1">
          <CriticScoreList wine={wine} />
        </div>
      </section>
      <section className="md:col-span-2">
        {wine.styleClassification && <p className="italic">{wine.styleClassification}</p>}
        {wine.description && <p className="mt-1">{wine.description}</p>}
        {wine.estimatedMarketValue !== null && (
          <p className="mt-2 text-ink-muted">
            Marktwert etwa {formatCurrency(wine.estimatedMarketValue, currency)} pro Flasche
          </p>
        )}
        {wine.confidence === "estimated" && (
          <p className="mt-2 text-sm text-ink-muted">
            Zu diesem Wein gibt es kaum Quellen. Trinkfenster und Stil sind geschätzt.
          </p>
        )}
      </section>
    </div>
  );
}
