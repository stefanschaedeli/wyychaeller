import { describe, expect, it } from "vitest";
import { summarizeCellar } from "./cellar-summary";

describe("summarizeCellar", () => {
  it("adds up bottles and values and counts maturities of wines with bottles", () => {
    const wines = [
      {
        bottleCount: 6,
        purchasePricePerBottle: 95,
        estimatedMarketValue: 140,
        drinkFromYear: 2023,
        drinkUntilYear: 2038,
      },
      {
        bottleCount: 2,
        purchasePricePerBottle: null,
        estimatedMarketValue: 60,
        drinkFromYear: 2015,
        drinkUntilYear: 2027,
      },
      {
        bottleCount: 0,
        purchasePricePerBottle: 500,
        estimatedMarketValue: 900,
        drinkFromYear: 2010,
        drinkUntilYear: 2020,
      },
    ];

    expect(summarizeCellar(wines, 2026)).toEqual({
      wineCount: 2,
      bottleCount: 8,
      purchaseValue: 570,
      estimatedMarketValue: 960,
      maturityCounts: { tooYoung: 0, ready: 1, drinkSoon: 1, overdue: 0, unknown: 0 },
    });
  });
});
