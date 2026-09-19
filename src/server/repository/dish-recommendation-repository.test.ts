import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { DishRecommendationRepository, normalizeDish } from "./dish-recommendation-repository";

let repository: DishRecommendationRepository;
const recommendations = [{ wineId: 1, reasoning: "Passt zur Sauce", servingTip: null }];

beforeEach(() => {
  repository = new DishRecommendationRepository(openDatabase(IN_MEMORY_DATABASE));
});

describe("DishRecommendationRepository", () => {
  it("normalizes dishes for lookup", () => {
    expect(normalizeDish("  Rindsfilet   mit MORCHELN ")).toBe("rindsfilet mit morcheln");
  });

  it("finds the latest stored answer for a dish regardless of spelling", () => {
    repository.saveRecommendation({
      dish: "Rindsfilet",
      recommendations,
      cellarFingerprint: "old",
    });
    repository.saveRecommendation({
      dish: "rindsfilet ",
      recommendations,
      cellarFingerprint: "new",
    });

    expect(repository.findLatestForDish("RINDSFILET")?.cellarFingerprint).toBe("new");
    expect(repository.findLatestForDish("Fondue")).toBeNull();
  });

  it("lists recent distinct dishes, newest first", () => {
    for (const dish of ["Fondue", "Lachs", "fondue"]) {
      repository.saveRecommendation({ dish, recommendations, cellarFingerprint: "x" });
    }
    expect(repository.listRecentDishes(5)).toEqual(["fondue", "Lachs"]);
  });
});
