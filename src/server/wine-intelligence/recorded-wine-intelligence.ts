import { MAXIMUM_DISH_RECOMMENDATIONS } from "@/domain/constants";
import { createLogger } from "../logging/logger";
import type { DishRecommendation, LabelReading, WineResearch } from "./schemas";
import type { CellarWineSummary, IntelligenceResult, WineIntelligence } from "./wine-intelligence";

const logger = createLogger("claude");

const NO_USAGE = { inputTokens: 0, outputTokens: 0 };

const RECORDED_LABEL_READING: LabelReading = {
  isWineLabel: true,
  producer: "Marchesi Antinori",
  name: "Tignanello",
  vintage: 2018,
  country: "Italien",
  region: "Toskana",
  appellation: "Toscana IGT",
  grapeVarieties: ["Sangiovese", "Cabernet Sauvignon", "Cabernet Franc"],
  wineType: "red",
  alcoholPercent: 14,
};

const RECORDED_RESEARCH: WineResearch = {
  country: "Italien",
  region: "Toskana",
  grapeVarieties: ["Sangiovese", "Cabernet Sauvignon", "Cabernet Franc"],
  wineType: "red",
  styleClassification: "Supertoskaner, kraftvoll und strukturiert",
  description: "Dunkle Kirsche, Tabak und feines Tannin. Aufgezeichnete Beispielantwort.",
  criticScores: [{ source: "Beispielquelle", points: 95, url: "https://example.com/tignanello" }],
  aggregateScore: 95,
  drinkFromYear: 2023,
  drinkUntilYear: 2038,
  foodPairings: ["Bistecca alla fiorentina", "Wildragout", "Gereifter Pecorino"],
  estimatedMarketValue: 140,
  confidence: "researched",
};

/** Canned answers for tests and demos. Never calls the network and costs nothing. */
export class RecordedWineIntelligence implements WineIntelligence {
  async analyzeLabel(): Promise<IntelligenceResult<LabelReading>> {
    logger.info("Recorded answer used", { operation: "analyzeLabel" });
    return { value: RECORDED_LABEL_READING, usage: NO_USAGE };
  }

  async researchWine(): Promise<IntelligenceResult<WineResearch>> {
    logger.info("Recorded answer used", { operation: "researchWine" });
    return { value: RECORDED_RESEARCH, usage: NO_USAGE };
  }

  async recommendWinesForDish(
    dish: string,
    cellarWines: CellarWineSummary[],
  ): Promise<IntelligenceResult<DishRecommendation[]>> {
    const recommendations = cellarWines.slice(0, MAXIMUM_DISH_RECOMMENDATIONS).map((wine) => ({
      wineId: wine.wineId,
      reasoning: `Aufgezeichnete Beispielempfehlung zu «${dish}».`,
      servingTip: null,
    }));
    logger.info("Recorded answer used", { operation: "recommendWinesForDish" });
    return { value: recommendations, usage: NO_USAGE };
  }
}
