import { describe, expect, it } from "vitest";
import {
  sanitizeDishRecommendations,
  sanitizeLabelReading,
  sanitizeWineResearch,
} from "./sanitize";
import type { LabelReading, WineResearch } from "./schemas";

const CURRENT_YEAR = 2026;

const validResearch: WineResearch = {
  country: "Italien",
  region: "Toskana",
  grapeVarieties: ["Sangiovese"],
  wineType: "red",
  styleClassification: "Supertoskaner",
  description: "Kraftvoll.",
  criticScores: [{ source: "Falstaff", points: 95, url: "https://www.falstaff.com/x" }],
  aggregateScore: 95,
  drinkFromYear: 2023,
  drinkUntilYear: 2038,
  foodPairings: ["Bistecca"],
  estimatedMarketValue: 140,
  confidence: "researched",
};

describe("sanitizeWineResearch", () => {
  it("keeps valid research unchanged", () => {
    expect(sanitizeWineResearch(validResearch, CURRENT_YEAR)).toEqual(validResearch);
  });

  it("drops links that are not http or https", () => {
    const research = {
      ...validResearch,
      criticScores: [{ source: "Evil", points: 90, url: "javascript:alert(1)" }],
    };
    expect(sanitizeWineResearch(research, CURRENT_YEAR).criticScores[0].url).toBeNull();
  });

  it("drops scores outside 50-100 and rounds the rest", () => {
    const research = {
      ...validResearch,
      criticScores: [
        { source: "A", points: 250, url: null },
        { source: "B", points: 93.6, url: null },
      ],
      aggregateScore: 17,
    };
    const sanitized = sanitizeWineResearch(research, CURRENT_YEAR);
    expect(sanitized.criticScores).toEqual([{ source: "B", points: 94, url: null }]);
    expect(sanitized.aggregateScore).toBeNull();
  });

  it("removes an implausible or inverted drinking window", () => {
    const inverted = { ...validResearch, drinkFromYear: 2040, drinkUntilYear: 2030 };
    const sanitized = sanitizeWineResearch(inverted, CURRENT_YEAR);
    expect(sanitized.drinkFromYear).toBeNull();
    expect(sanitized.drinkUntilYear).toBeNull();
  });

  it("removes negative market values and truncates long texts", () => {
    const research = {
      ...validResearch,
      estimatedMarketValue: -5,
      description: "x".repeat(5000),
    };
    const sanitized = sanitizeWineResearch(research, CURRENT_YEAR);
    expect(sanitized.estimatedMarketValue).toBeNull();
    expect(sanitized.description).toHaveLength(2000);
  });
});

describe("sanitizeLabelReading", () => {
  it("removes impossible vintages and alcohol values, trims texts", () => {
    const reading: LabelReading = {
      isWineLabel: true,
      producer: "  Antinori ",
      name: "",
      vintage: 3024,
      country: null,
      region: null,
      appellation: null,
      grapeVarieties: [" Sangiovese ", ""],
      wineType: "red",
      alcoholPercent: 140,
    };
    expect(sanitizeLabelReading(reading, CURRENT_YEAR)).toMatchObject({
      producer: "Antinori",
      name: null,
      vintage: null,
      grapeVarieties: ["Sangiovese"],
      alcoholPercent: null,
    });
  });
});

describe("sanitizeDishRecommendations", () => {
  it("keeps only wines from the cellar, without duplicates, at most three", () => {
    const recommendations = [1, 99, 1, 2, 3, 4].map((wineId) => ({
      wineId,
      reasoning: "Passt.",
      servingTip: null,
    }));
    const sanitized = sanitizeDishRecommendations(recommendations, new Set([1, 2, 3, 4]));
    expect(sanitized.map((entry) => entry.wineId)).toEqual([1, 2, 3]);
  });
});
