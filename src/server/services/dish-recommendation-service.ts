import { buildCellarFingerprint } from "@/domain/cellar-fingerprint";
import { determineDrinkingMaturity } from "@/domain/drinking-maturity";
import type { StoredDishRecommendation, WineRecord } from "../database/schema";
import type { DishRecommendationRepository } from "../repository/dish-recommendation-repository";
import type { WineRepository } from "../repository/wine-repository";
import { sanitizeDishRecommendations } from "../wine-intelligence/sanitize";
import type { CellarWineSummary, WineIntelligence } from "../wine-intelligence/wine-intelligence";
import type { AiBudgetGuard } from "./ai-budget-guard";

export interface DishRecommendationDependencies {
  wineRepository: WineRepository;
  dishRecommendationRepository: DishRecommendationRepository;
  wineIntelligence: WineIntelligence;
  aiBudgetGuard: AiBudgetGuard;
  getCurrentYear: () => number;
}

export interface RecommendedWine {
  wine: WineRecord;
  reasoning: string;
  servingTip: string | null;
}

export interface DishRecommendationResult {
  dish: string;
  recommendations: RecommendedWine[];
  isFromCache: boolean;
  createdAt: Date;
}

export class DishRecommendationService {
  constructor(private readonly dependencies: DishRecommendationDependencies) {}

  async recommendForDish(
    dish: string,
    shouldForceRefresh: boolean,
  ): Promise<DishRecommendationResult> {
    const { wineRepository, dishRecommendationRepository } = this.dependencies;
    const availableWines = wineRepository
      .listWines()
      .filter((wine) => wine.analysisStatus === "complete" && wine.bottleCount > 0);
    if (availableWines.length === 0) {
      return { dish, recommendations: [], isFromCache: false, createdAt: new Date() };
    }

    const cellarFingerprint = buildCellarFingerprint(availableWines);
    const storedAnswer = dishRecommendationRepository.findLatestForDish(dish);
    const canReuseStoredAnswer =
      !shouldForceRefresh && storedAnswer?.cellarFingerprint === cellarFingerprint;
    if (storedAnswer && canReuseStoredAnswer) {
      const recommendations = this.attachWines(storedAnswer.recommendations, availableWines);
      return { dish, recommendations, isFromCache: true, createdAt: storedAnswer.createdAt };
    }

    const freshRecommendations = await this.askIntelligence(dish, availableWines);
    const savedAnswer = dishRecommendationRepository.saveRecommendation({
      dish,
      recommendations: freshRecommendations,
      cellarFingerprint,
    });
    const recommendations = this.attachWines(freshRecommendations, availableWines);
    return { dish, recommendations, isFromCache: false, createdAt: savedAnswer.createdAt };
  }

  private async askIntelligence(
    dish: string,
    availableWines: WineRecord[],
  ): Promise<StoredDishRecommendation[]> {
    const { wineIntelligence, aiBudgetGuard, getCurrentYear } = this.dependencies;
    aiBudgetGuard.assertCallAllowed();
    const cellarSummaries = availableWines.map((wine) => toCellarSummary(wine, getCurrentYear()));
    const result = await wineIntelligence.recommendWinesForDish(dish, cellarSummaries);
    aiBudgetGuard.recordCall("recommendWinesForDish", result.usage);

    const validWineIds = new Set(availableWines.map((wine) => wine.id));
    return sanitizeDishRecommendations(result.value, validWineIds);
  }

  private attachWines(
    storedRecommendations: StoredDishRecommendation[],
    availableWines: WineRecord[],
  ): RecommendedWine[] {
    const winesById = new Map(availableWines.map((wine) => [wine.id, wine]));
    return storedRecommendations.flatMap((recommendation) => {
      const wine = winesById.get(recommendation.wineId);
      return wine ? [{ wine, ...recommendation }] : [];
    });
  }
}

function toCellarSummary(wine: WineRecord, currentYear: number): CellarWineSummary {
  return {
    wineId: wine.id,
    producer: wine.producer,
    name: wine.name,
    vintage: wine.vintage,
    country: wine.country,
    region: wine.region,
    appellation: wine.appellation,
    grapeVarieties: wine.grapeVarieties,
    wineType: wine.wineType,
    bottleCount: wine.bottleCount,
    styleClassification: wine.styleClassification,
    foodPairings: wine.foodPairings,
    drinkingMaturity: determineDrinkingMaturity(wine, currentYear),
  };
}
