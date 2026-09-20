import { calculateWindowBarLayout } from "@/lib/drinking-window-layout";
import type { WineResponse } from "@/shared/api-contract";

export function DrinkingWindowBar({ wine }: { wine: WineResponse }) {
  const layout = calculateWindowBarLayout(wine, new Date().getFullYear());
  if (layout === null) return <p className="text-ink-muted">Kein Trinkfenster bekannt.</p>;

  const description = `Trinkfenster ${wine.drinkFromYear} bis ${wine.drinkUntilYear}`;
  return (
    <div>
      <div role="img" aria-label={description} className="relative h-2.5 rounded-full bg-line">
        <div
          className="absolute inset-y-0 rounded-full bg-bordeaux"
          style={{ left: `${layout.windowStartPercent}%`, width: `${layout.windowWidthPercent}%` }}
        />
        <div
          className="absolute -top-1.5 h-5.5 w-0.5 bg-ink"
          style={{ left: `${layout.todayPercent}%` }}
        />
      </div>
      <p className="mt-1.5 flex justify-between font-sans text-xs text-ink-muted">
        <span>{wine.drinkFromYear}</span>
        <span>heute</span>
        <span>{wine.drinkUntilYear}</span>
      </p>
    </div>
  );
}
