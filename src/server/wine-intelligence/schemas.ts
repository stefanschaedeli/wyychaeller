import { z } from "zod";
import { RESEARCH_CONFIDENCES, WINE_TYPES } from "@/domain/wine-types";

export const LabelReadingSchema = z.object({
  isWineLabel: z.boolean(),
  producer: z.string().nullable(),
  name: z.string().nullable(),
  vintage: z.number().nullable(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  appellation: z.string().nullable(),
  grapeVarieties: z.array(z.string()),
  wineType: z.enum(WINE_TYPES).nullable(),
  alcoholPercent: z.number().nullable(),
});
export type LabelReading = z.infer<typeof LabelReadingSchema>;

export const WineResearchSchema = z.object({
  country: z.string().nullable(),
  region: z.string().nullable(),
  grapeVarieties: z.array(z.string()),
  wineType: z.enum(WINE_TYPES).nullable(),
  styleClassification: z.string().nullable(),
  description: z.string().nullable(),
  criticScores: z.array(
    z.object({ source: z.string(), points: z.number(), url: z.string().nullable() }),
  ),
  aggregateScore: z.number().nullable(),
  drinkFromYear: z.number().nullable(),
  drinkUntilYear: z.number().nullable(),
  foodPairings: z.array(z.string()),
  estimatedMarketValue: z.number().nullable(),
  confidence: z.enum(RESEARCH_CONFIDENCES),
});
export type WineResearch = z.infer<typeof WineResearchSchema>;

export const DishRecommendationSchema = z.object({
  wineId: z.number(),
  reasoning: z.string(),
  servingTip: z.string().nullable(),
});
export type DishRecommendation = z.infer<typeof DishRecommendationSchema>;

export const DishRecommendationListSchema = z.object({
  recommendations: z.array(DishRecommendationSchema),
});
