import { determineDrinkingMaturity } from "./drinking-maturity";
import type { DrinkingMaturity, DrinkingWindow } from "./wine-types";

export interface SummarizableWine extends DrinkingWindow {
  bottleCount: number;
  purchasePricePerBottle: number | null;
  estimatedMarketValue: number | null;
}

export interface CellarSummary {
  wineCount: number;
  bottleCount: number;
  purchaseValue: number;
  estimatedMarketValue: number;
  maturityCounts: Record<DrinkingMaturity, number>;
}

export function summarizeCellar(wines: SummarizableWine[], currentYear: number): CellarSummary {
  const summary: CellarSummary = {
    wineCount: 0,
    bottleCount: 0,
    purchaseValue: 0,
    estimatedMarketValue: 0,
    maturityCounts: { tooYoung: 0, ready: 0, drinkSoon: 0, overdue: 0, unknown: 0 },
  };
  for (const wine of wines) {
    if (wine.bottleCount === 0) continue;
    summary.wineCount += 1;
    summary.bottleCount += wine.bottleCount;
    summary.purchaseValue += wine.bottleCount * (wine.purchasePricePerBottle ?? 0);
    summary.estimatedMarketValue += wine.bottleCount * (wine.estimatedMarketValue ?? 0);
    summary.maturityCounts[determineDrinkingMaturity(wine, currentYear)] += 1;
  }
  return summary;
}
