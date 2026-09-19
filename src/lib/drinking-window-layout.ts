import type { DrinkingWindow } from "@/domain/wine-types";

const SCALE_PADDING_YEARS = 1;
const FULL_WIDTH_PERCENT = 100;

export interface WindowBarLayout {
  firstYear: number;
  lastYear: number;
  windowStartPercent: number;
  windowWidthPercent: number;
  todayPercent: number;
}

/** Geometry of the drinking window bar: a year scale that always contains window and today. */
export function calculateWindowBarLayout(
  window: DrinkingWindow,
  currentYear: number,
): WindowBarLayout | null {
  const { drinkFromYear, drinkUntilYear } = window;
  if (drinkFromYear === null || drinkUntilYear === null) return null;

  const firstYear = Math.min(drinkFromYear, currentYear) - SCALE_PADDING_YEARS;
  const lastYear = Math.max(drinkUntilYear, currentYear) + SCALE_PADDING_YEARS;
  const percentPerYear = FULL_WIDTH_PERCENT / (lastYear - firstYear);

  return {
    firstYear,
    lastYear,
    windowStartPercent: (drinkFromYear - firstYear) * percentPerYear,
    windowWidthPercent: (drinkUntilYear - drinkFromYear) * percentPerYear,
    todayPercent: (currentYear - firstYear) * percentPerYear,
  };
}
