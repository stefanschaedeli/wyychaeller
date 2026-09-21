import type { GoogleGenAI } from "@google/genai";
import {
  collectWebResearchNotes,
  mapGeminiError,
  requestStructuredOutput,
  ThinkingLevel,
} from "./gemini-requests";
import {
  buildDishPairingPrompt,
  buildStructuringPrompt,
  buildWebResearchPrompt,
  DISH_PAIRING_INSTRUCTIONS,
  LABEL_READING_INSTRUCTIONS,
  RESEARCH_STRUCTURING_INSTRUCTIONS,
} from "./prompts";
import {
  DishRecommendationListSchema,
  LabelReadingSchema,
  WineResearchSchema,
  type DishRecommendation,
  type LabelReading,
  type WineResearch,
} from "./schemas";
import {
  sanitizeDishRecommendations,
  sanitizeLabelReading,
  sanitizeWineResearch,
} from "./sanitize";
import {
  addUsage,
  type CellarWineSummary,
  type IntelligenceResult,
  type LabelPhoto,
  type WineIdentity,
  type WineIntelligence,
} from "./wine-intelligence";

export class GeminiWineIntelligence implements WineIntelligence {
  constructor(
    private readonly client: GoogleGenAI,
    private readonly model: string,
    private readonly getCurrentYear: () => number,
    private readonly currency: string,
  ) {}

  async analyzeLabel(photo: LabelPhoto): Promise<IntelligenceResult<LabelReading>> {
    const result = await this.guard(() =>
      requestStructuredOutput(this.client, this.model, {
        operation: "analyzeLabel",
        schema: LabelReadingSchema,
        instructions: LABEL_READING_INSTRUCTIONS,
        thinkingLevel: ThinkingLevel.LOW,
        contents: [
          { inlineData: { mimeType: photo.mediaType, data: photo.base64Data } },
          "Read this wine label.",
        ],
      }),
    );
    return {
      value: sanitizeLabelReading(result.value, this.getCurrentYear()),
      usage: result.usage,
    };
  }

  async researchWine(identity: WineIdentity): Promise<IntelligenceResult<WineResearch>> {
    const currentYear = this.getCurrentYear();
    return this.guard(async () => {
      const notes = await collectWebResearchNotes(
        this.client,
        this.model,
        buildWebResearchPrompt(identity, this.currency, currentYear),
      );
      const structured = await requestStructuredOutput(this.client, this.model, {
        operation: "researchWine",
        schema: WineResearchSchema,
        instructions: RESEARCH_STRUCTURING_INSTRUCTIONS,
        thinkingLevel: ThinkingLevel.LOW,
        contents: buildStructuringPrompt(identity, notes.value),
      });
      return {
        value: sanitizeWineResearch(structured.value, currentYear),
        usage: addUsage(notes.usage, structured.usage),
      };
    });
  }

  async recommendWinesForDish(
    dish: string,
    cellarWines: CellarWineSummary[],
  ): Promise<IntelligenceResult<DishRecommendation[]>> {
    const result = await this.guard(() =>
      requestStructuredOutput(this.client, this.model, {
        operation: "recommendWinesForDish",
        schema: DishRecommendationListSchema,
        instructions: DISH_PAIRING_INSTRUCTIONS,
        thinkingLevel: ThinkingLevel.MEDIUM,
        contents: buildDishPairingPrompt(dish, cellarWines),
      }),
    );
    const validWineIds = new Set(cellarWines.map((wine) => wine.wineId));
    return {
      value: sanitizeDishRecommendations(result.value.recommendations, validWineIds),
      usage: result.usage,
    };
  }

  private async guard<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw mapGeminiError(error);
    }
  }
}
