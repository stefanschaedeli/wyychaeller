import {
  MAXIMUM_DISH_RECOMMENDATIONS,
  MAXIMUM_LONG_TEXT_LENGTH,
  MAXIMUM_SHORT_TEXT_LENGTH,
} from "@/domain/constants";
import type { DishRecommendation, LabelReading, WineResearch } from "./schemas";

const EARLIEST_PLAUSIBLE_VINTAGE = 1800;
const LONGEST_PLAUSIBLE_CELLARING_YEARS = 150;
const MINIMUM_CRITIC_POINTS = 50;
const MAXIMUM_CRITIC_POINTS = 100;
const MAXIMUM_ALCOHOL_PERCENT = 25;
const MAXIMUM_LIST_ENTRIES = 10;

function cleanText(text: string | null, maximumLength: number): string | null {
  const trimmedText = text?.trim() ?? "";
  return trimmedText === "" ? null : trimmedText.slice(0, maximumLength);
}

function cleanTextList(texts: string[]): string[] {
  return texts
    .map((text) => cleanText(text, MAXIMUM_SHORT_TEXT_LENGTH))
    .filter((text): text is string => text !== null)
    .slice(0, MAXIMUM_LIST_ENTRIES);
}

function cleanNumberInRange(value: number | null, minimum: number, maximum: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return value >= minimum && value <= maximum ? value : null;
}

function cleanWebLink(url: string | null): string | null {
  if (url === null) return null;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:"
      ? parsedUrl.href
      : null;
  } catch {
    return null;
  }
}

function cleanPoints(points: number | null): number | null {
  const validPoints = cleanNumberInRange(points, MINIMUM_CRITIC_POINTS, MAXIMUM_CRITIC_POINTS);
  return validPoints === null ? null : Math.round(validPoints);
}

export function sanitizeLabelReading(reading: LabelReading, currentYear: number): LabelReading {
  const vintage = cleanNumberInRange(reading.vintage, EARLIEST_PLAUSIBLE_VINTAGE, currentYear);
  return {
    isWineLabel: reading.isWineLabel,
    producer: cleanText(reading.producer, MAXIMUM_SHORT_TEXT_LENGTH),
    name: cleanText(reading.name, MAXIMUM_SHORT_TEXT_LENGTH),
    vintage: vintage === null ? null : Math.round(vintage),
    country: cleanText(reading.country, MAXIMUM_SHORT_TEXT_LENGTH),
    region: cleanText(reading.region, MAXIMUM_SHORT_TEXT_LENGTH),
    appellation: cleanText(reading.appellation, MAXIMUM_SHORT_TEXT_LENGTH),
    grapeVarieties: cleanTextList(reading.grapeVarieties),
    wineType: reading.wineType,
    alcoholPercent: cleanNumberInRange(reading.alcoholPercent, 0, MAXIMUM_ALCOHOL_PERCENT),
  };
}

function cleanDrinkingWindow(research: WineResearch, currentYear: number) {
  const latestPlausibleYear = currentYear + LONGEST_PLAUSIBLE_CELLARING_YEARS;
  const drinkFromYear = cleanNumberInRange(
    research.drinkFromYear,
    EARLIEST_PLAUSIBLE_VINTAGE,
    latestPlausibleYear,
  );
  const drinkUntilYear = cleanNumberInRange(
    research.drinkUntilYear,
    EARLIEST_PLAUSIBLE_VINTAGE,
    latestPlausibleYear,
  );
  const isUsableWindow =
    drinkFromYear !== null && drinkUntilYear !== null && drinkFromYear <= drinkUntilYear;
  return isUsableWindow
    ? { drinkFromYear: Math.round(drinkFromYear), drinkUntilYear: Math.round(drinkUntilYear) }
    : { drinkFromYear: null, drinkUntilYear: null };
}

export function sanitizeWineResearch(research: WineResearch, currentYear: number): WineResearch {
  const criticScores = research.criticScores
    .map((score) => ({
      source: cleanText(score.source, MAXIMUM_SHORT_TEXT_LENGTH),
      points: cleanPoints(score.points),
      url: cleanWebLink(score.url),
    }))
    .filter(
      (score): score is { source: string; points: number; url: string | null } =>
        score.source !== null && score.points !== null,
    )
    .slice(0, MAXIMUM_LIST_ENTRIES);

  return {
    country: cleanText(research.country, MAXIMUM_SHORT_TEXT_LENGTH),
    region: cleanText(research.region, MAXIMUM_SHORT_TEXT_LENGTH),
    grapeVarieties: cleanTextList(research.grapeVarieties),
    wineType: research.wineType,
    styleClassification: cleanText(research.styleClassification, MAXIMUM_SHORT_TEXT_LENGTH),
    description: cleanText(research.description, MAXIMUM_LONG_TEXT_LENGTH),
    criticScores,
    aggregateScore: cleanPoints(research.aggregateScore),
    ...cleanDrinkingWindow(research, currentYear),
    foodPairings: cleanTextList(research.foodPairings),
    estimatedMarketValue: cleanNumberInRange(research.estimatedMarketValue, 0, 1_000_000),
    confidence: research.confidence,
  };
}

export function sanitizeDishRecommendations(
  recommendations: DishRecommendation[],
  validWineIds: Set<number>,
): DishRecommendation[] {
  const seenWineIds = new Set<number>();
  const sanitized: DishRecommendation[] = [];
  for (const recommendation of recommendations) {
    if (!validWineIds.has(recommendation.wineId) || seenWineIds.has(recommendation.wineId))
      continue;
    seenWineIds.add(recommendation.wineId);
    sanitized.push({
      wineId: recommendation.wineId,
      reasoning: cleanText(recommendation.reasoning, MAXIMUM_LONG_TEXT_LENGTH) ?? "",
      servingTip: cleanText(recommendation.servingTip, MAXIMUM_SHORT_TEXT_LENGTH),
    });
    if (sanitized.length === MAXIMUM_DISH_RECOMMENDATIONS) break;
  }
  return sanitized;
}
