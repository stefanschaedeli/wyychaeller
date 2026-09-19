import { describe, expect, it } from "vitest";
import {
  determineDrinkingMaturity,
  isUrgentMaturity,
  sortByDrinkingUrgency,
} from "./drinking-maturity";
import type { DrinkingMaturity } from "./wine-types";

const CURRENT_YEAR = 2026;

describe("determineDrinkingMaturity", () => {
  it.each([
    [{ drinkFromYear: 2028, drinkUntilYear: 2040 }, "tooYoung"],
    [{ drinkFromYear: 2023, drinkUntilYear: 2038 }, "ready"],
    [{ drinkFromYear: 2018, drinkUntilYear: 2027 }, "drinkSoon"],
    [{ drinkFromYear: 2018, drinkUntilYear: 2026 }, "drinkSoon"],
    [{ drinkFromYear: 2015, drinkUntilYear: 2025 }, "overdue"],
    [{ drinkFromYear: null, drinkUntilYear: null }, "unknown"],
    [{ drinkFromYear: 2020, drinkUntilYear: null }, "unknown"],
  ] as const)("maps %o to %s", (window, expectedMaturity) => {
    expect(determineDrinkingMaturity(window, CURRENT_YEAR)).toBe(expectedMaturity);
  });

  it("treats the first year of the window as ready", () => {
    const window = { drinkFromYear: 2026, drinkUntilYear: 2035 };
    expect(determineDrinkingMaturity(window, CURRENT_YEAR)).toBe("ready");
  });
});

describe("sortByDrinkingUrgency", () => {
  it("orders overdue first, then drink soon, then by the end of the window", () => {
    const wines = [
      { name: "ready", drinkFromYear: 2023, drinkUntilYear: 2038 },
      { name: "soonLater", drinkFromYear: 2018, drinkUntilYear: 2027 },
      { name: "unknown", drinkFromYear: null, drinkUntilYear: null },
      { name: "overdue", drinkFromYear: 2010, drinkUntilYear: 2024 },
      { name: "soonEarlier", drinkFromYear: 2018, drinkUntilYear: 2026 },
    ];

    const sortedNames = sortByDrinkingUrgency(wines, CURRENT_YEAR).map((wine) => wine.name);

    expect(sortedNames).toEqual(["overdue", "soonEarlier", "soonLater", "ready", "unknown"]);
  });

  it("does not mutate the input", () => {
    const wines = [{ drinkFromYear: 2023, drinkUntilYear: 2038 }];
    expect(sortByDrinkingUrgency(wines, CURRENT_YEAR)).not.toBe(wines);
  });
});

describe("isUrgentMaturity", () => {
  it.each([
    ["overdue", true],
    ["drinkSoon", true],
    ["ready", false],
    ["tooYoung", false],
    ["unknown", false],
  ] as const satisfies readonly [DrinkingMaturity, boolean][])(
    "treats %s as urgent: %s",
    (maturity, expectedIsUrgent) => {
      expect(isUrgentMaturity(maturity)).toBe(expectedIsUrgent);
    },
  );
});
