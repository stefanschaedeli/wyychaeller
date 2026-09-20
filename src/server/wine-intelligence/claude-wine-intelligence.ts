import type Anthropic from "@anthropic-ai/sdk";
import {
  addUsage,
  collectWebResearchNotes,
  mapClaudeError,
  requestStructuredOutput,
} from "./claude-requests";
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
import type {
  CellarWineSummary,
  IntelligenceResult,
  LabelPhoto,
  WineIdentity,
  WineIntelligence,
} from "./wine-intelligence";

export class ClaudeWineIntelligence implements WineIntelligence {
  constructor(
    private readonly client: Anthropic,
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
        effort: "low",
        userContent: [
          {
            type: "image",
            source: { type: "base64", media_type: photo.mediaType, data: photo.base64Data },
          },
          { type: "text", text: "Read this wine label." },
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
        effort: "low",
        userContent: buildStructuringPrompt(identity, notes.value),
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
        effort: "medium",
        userContent: buildDishPairingPrompt(dish, cellarWines),
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
      throw mapClaudeError(error);
    }
  }
}
