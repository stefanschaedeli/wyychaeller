import { DRINK_SOON_WINDOW_YEARS } from "./constants";
import type { DrinkingMaturity, DrinkingWindow } from "./wine-types";

export const URGENT_MATURITIES: readonly DrinkingMaturity[] = ["overdue", "drinkSoon"];

export function isUrgentMaturity(maturity: DrinkingMaturity): boolean {
  return URGENT_MATURITIES.includes(maturity);
}

const URGENCY_RANK: Record<DrinkingMaturity, number> = {
  overdue: 0,
  drinkSoon: 1,
  ready: 2,
  tooYoung: 3,
  unknown: 4,
};

export function determineDrinkingMaturity(
  window: DrinkingWindow,
  currentYear: number,
): DrinkingMaturity {
  const { drinkFromYear, drinkUntilYear } = window;
  if (drinkFromYear === null || drinkUntilYear === null) return "unknown";
  if (currentYear < drinkFromYear) return "tooYoung";
  if (currentYear > drinkUntilYear) return "overdue";

  const firstDrinkSoonYear = drinkUntilYear - DRINK_SOON_WINDOW_YEARS + 1;
  return currentYear >= firstDrinkSoonYear ? "drinkSoon" : "ready";
}

export function sortByDrinkingUrgency<T extends DrinkingWindow>(
  wines: T[],
  currentYear: number,
): T[] {
  return [...wines].sort((firstWine, secondWine) => {
    const rankDifference =
      URGENCY_RANK[determineDrinkingMaturity(firstWine, currentYear)] -
      URGENCY_RANK[determineDrinkingMaturity(secondWine, currentYear)];
    if (rankDifference !== 0) return rankDifference;

    const firstEnd = firstWine.drinkUntilYear ?? Number.MAX_SAFE_INTEGER;
    const secondEnd = secondWine.drinkUntilYear ?? Number.MAX_SAFE_INTEGER;
    return firstEnd - secondEnd;
  });
}
