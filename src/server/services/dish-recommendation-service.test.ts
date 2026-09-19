import { beforeEach, describe, expect, it, vi } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { AiUsageRepository } from "../repository/ai-usage-repository";
import { DishRecommendationRepository } from "../repository/dish-recommendation-repository";
import { SettingsRepository } from "../repository/settings-repository";
import { WineRepository } from "../repository/wine-repository";
import { RecordedWineIntelligence } from "../wine-intelligence/recorded-wine-intelligence";
import { AiBudgetGuard } from "./ai-budget-guard";
import { DishRecommendationService } from "./dish-recommendation-service";

let wineRepository: WineRepository;
let wineIntelligence: RecordedWineIntelligence;
let service: DishRecommendationService;

function addCompleteWine(name: string, bottleCount: number): number {
  const wine = wineRepository.createPendingWine(`${name}.jpg`);
  wineRepository.updateWine(wine.id, { name, bottleCount, analysisStatus: "complete" });
  return wine.id;
}

beforeEach(() => {
  const database = openDatabase(IN_MEMORY_DATABASE);
  wineRepository = new WineRepository(database);
  wineIntelligence = new RecordedWineIntelligence();
  service = new DishRecommendationService({
    wineRepository,
    dishRecommendationRepository: new DishRecommendationRepository(database),
    wineIntelligence,
    aiBudgetGuard: new AiBudgetGuard(
      new AiUsageRepository(database),
      new SettingsRepository(database),
      () => new Date(),
    ),
    getCurrentYear: () => 2026,
  });
});

describe("DishRecommendationService", () => {
  it("recommends only complete wines that still have bottles", async () => {
    const availableWineId = addCompleteWine("Tignanello", 6);
    addCompleteWine("Empty", 0);
    const pairingSpy = vi.spyOn(wineIntelligence, "recommendWinesForDish");

    const result = await service.recommendForDish("Rindsfilet", false);

    expect(pairingSpy.mock.calls[0][1].map((wine) => wine.wineId)).toEqual([availableWineId]);
    expect(result.isFromCache).toBe(false);
    expect(result.recommendations[0].wine.name).toBe("Tignanello");
  });

  it("answers repeated questions from storage while the cellar is unchanged", async () => {
    addCompleteWine("Tignanello", 6);
    await service.recommendForDish("Rindsfilet", false);
    const pairingSpy = vi.spyOn(wineIntelligence, "recommendWinesForDish");

    const repeated = await service.recommendForDish("  rindsfilet ", false);

    expect(repeated.isFromCache).toBe(true);
    expect(pairingSpy).not.toHaveBeenCalled();
  });

  it("asks again after the cellar changed or when forced", async () => {
    const wineId = addCompleteWine("Tignanello", 6);
    await service.recommendForDish("Rindsfilet", false);
    const pairingSpy = vi.spyOn(wineIntelligence, "recommendWinesForDish");

    await service.recommendForDish("Rindsfilet", true);
    wineRepository.updateWine(wineId, { bottleCount: 5 });
    await service.recommendForDish("Rindsfilet", false);

    expect(pairingSpy).toHaveBeenCalledTimes(2);
  });

  it("returns nothing for an empty cellar without calling the AI", async () => {
    const pairingSpy = vi.spyOn(wineIntelligence, "recommendWinesForDish");
    const result = await service.recommendForDish("Rindsfilet", false);

    expect(result.recommendations).toEqual([]);
    expect(pairingSpy).not.toHaveBeenCalled();
  });
});
