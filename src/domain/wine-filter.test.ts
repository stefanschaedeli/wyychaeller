import { describe, expect, it } from "vitest";
import { filterWines, type FilterableWine } from "./wine-filter";

const CURRENT_YEAR = 2026;

function buildWine(overrides: Partial<FilterableWine>): FilterableWine {
  return {
    producer: "Antinori",
    name: "Tignanello",
    region: "Toskana",
    country: "Italien",
    grapeVarieties: ["Sangiovese"],
    wineType: "red",
    bottleCount: 6,
    drinkFromYear: 2023,
    drinkUntilYear: 2038,
    ...overrides,
  };
}

describe("filterWines", () => {
  it("hides wines without bottles by default", () => {
    const wines = [buildWine({}), buildWine({ name: "Empty", bottleCount: 0 })];
    expect(filterWines(wines, {}, CURRENT_YEAR)).toHaveLength(1);
    expect(filterWines(wines, { shouldIncludeEmpty: true }, CURRENT_YEAR)).toHaveLength(2);
  });

  it("searches producer, name, region, country and grapes without case or accents", () => {
    const wines = [buildWine({}), buildWine({ producer: "Gantenbein", region: "Graubünden" })];
    expect(filterWines(wines, { searchText: "graubunden" }, CURRENT_YEAR)).toHaveLength(1);
    expect(filterWines(wines, { searchText: "SANGIO" }, CURRENT_YEAR)).toHaveLength(2);
  });

  it("filters by wine type", () => {
    const wines = [buildWine({}), buildWine({ wineType: "white" })];
    expect(filterWines(wines, { wineType: "white" }, CURRENT_YEAR)).toHaveLength(1);
  });

  it("filters by computed maturity", () => {
    const wines = [buildWine({}), buildWine({ drinkFromYear: 2015, drinkUntilYear: 2027 })];
    expect(filterWines(wines, { maturity: "drinkSoon" }, CURRENT_YEAR)).toHaveLength(1);
  });
});
