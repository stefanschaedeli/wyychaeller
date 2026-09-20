import type { TastingResponse } from "@/shared/api-contract";

const DATE_FORMAT = new Intl.DateTimeFormat("de-CH", { dateStyle: "long" });

export function formatTastingDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(`${isoDate}T12:00:00`));
}

export function StarRatingDisplay({ starRating }: { starRating: number | null }) {
  if (starRating === null) return null;
  return (
    <span className="text-gold" aria-label={`${starRating} von 5 Sternen`}>
      {"★".repeat(starRating)}
    </span>
  );
}

export function TastingList({ tastings }: { tastings: TastingResponse[] }) {
  if (tastings.length === 0) return null;
  return (
    <section>
      <p className="eyebrow">Getrunken</p>
      <ul>
        {tastings.map((tasting) => (
          <li key={tasting.id} className="border-b border-line py-3">
            <p className="font-sans text-xs text-ink-muted">
              {formatTastingDate(tasting.tastedOn)}{" "}
              <StarRatingDisplay starRating={tasting.starRating} />
            </p>
            {tasting.tastingNote && <p>{tasting.tastingNote}</p>}
            {tasting.occasionOrDish && <p className="text-ink-muted">{tasting.occasionOrDish}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
