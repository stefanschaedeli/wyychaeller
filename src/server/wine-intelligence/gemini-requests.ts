import {
  ApiError,
  ThinkingLevel,
  type ContentListUnion,
  type GenerateContentResponse,
  type GoogleGenAI,
  type ThinkingConfig,
} from "@google/genai";
import { z } from "zod";
import { createLogger } from "../logging/logger";
import { WEB_RESEARCH_INSTRUCTIONS } from "./prompts";
import {
  addUsage,
  WineIntelligenceError,
  type IntelligenceResult,
  type TokenUsage,
} from "./wine-intelligence";

const logger = createLogger("gemini");

const MAXIMUM_OUTPUT_TOKENS = 16000;
const STRUCTURED_REQUEST_ATTEMPTS = 2;
const WEB_RESEARCH_THINKING_LEVEL = ThinkingLevel.MEDIUM;
/** Gemini answers a rejected key with HTTP 400 and this reason instead of 401. */
const INVALID_KEY_REASON = "API_KEY_INVALID";
const CREDENTIAL_HTTP_STATUSES = [401, 403];
/** The SDK wraps network failures in a plain Error with this message ending. */
const CONNECTION_FAILURE_MESSAGE_ENDING = "sending request";
/** Gemini 2.x answers a thinking level with HTTP 400; it only knows token budgets. */
const MODEL_PREFIX_WITHOUT_THINKING_LEVELS = "gemini-2.";

export { ThinkingLevel };

export interface StructuredRequest<Schema extends z.ZodType> {
  /** Names the call in the activity log, e.g. "analyzeLabel". */
  operation: string;
  schema: Schema;
  instructions: string;
  contents: ContentListUnion;
  thinkingLevel: ThinkingLevel;
}

/** Thinking tokens and search results handed back to the model are billed too. */
function readUsage(response: GenerateContentResponse): TokenUsage {
  const usage = response.usageMetadata;
  return {
    inputTokens: (usage?.promptTokenCount ?? 0) + (usage?.toolUsePromptTokenCount ?? 0),
    outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
  };
}

export function mapGeminiError(error: unknown): unknown {
  if (error instanceof WineIntelligenceError) return error;
  if (error instanceof ApiError) {
    const isCredentialProblem =
      CREDENTIAL_HTTP_STATUSES.includes(error.status) || error.message.includes(INVALID_KEY_REASON);
    if (isCredentialProblem) {
      logger.error("Gemini rejected the API key", { httpStatus: error.status });
      return new WineIntelligenceError("invalidApiKey");
    }
    // Only name and status: the SDK message can echo parts of the request.
    logger.error("Gemini request failed", { errorName: error.name, httpStatus: error.status });
    return new WineIntelligenceError("unavailable");
  }
  if (error instanceof Error && error.message.endsWith(CONNECTION_FAILURE_MESSAGE_ENDING)) {
    logger.error("Gemini could not be reached", { errorName: error.name });
    return new WineIntelligenceError("unavailable");
  }
  return error;
}

function buildThinkingConfig(
  model: string,
  thinkingLevel: ThinkingLevel,
): ThinkingConfig | undefined {
  if (model.startsWith(MODEL_PREFIX_WITHOUT_THINKING_LEVELS)) return undefined;
  return { thinkingLevel };
}

function buildResponseJsonSchema(schema: z.ZodType): Record<string, unknown> {
  // Gemini accepts a JSON Schema subset that does not include the "$schema" keyword.
  const { $schema: _dialect, ...jsonSchema } = z.toJSONSchema(schema);
  return jsonSchema;
}

function parseAnswer<Schema extends z.ZodType>(
  schema: Schema,
  answerText: string | undefined,
): z.infer<Schema> | null {
  if (answerText === undefined) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(answerText));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Asks for a schema-constrained answer. Retries once when the answer is unusable. */
export async function requestStructuredOutput<Schema extends z.ZodType>(
  client: GoogleGenAI,
  model: string,
  request: StructuredRequest<Schema>,
): Promise<IntelligenceResult<z.infer<Schema>>> {
  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  for (let attempt = 1; attempt <= STRUCTURED_REQUEST_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    logger.info("Request sent", { operation: request.operation, model, attempt });
    const response = await client.models.generateContent({
      model,
      contents: request.contents,
      config: {
        systemInstruction: request.instructions,
        maxOutputTokens: MAXIMUM_OUTPUT_TOKENS,
        responseMimeType: "application/json",
        responseJsonSchema: buildResponseJsonSchema(request.schema),
        thinkingConfig: buildThinkingConfig(model, request.thinkingLevel),
      },
    });
    totalUsage = addUsage(totalUsage, readUsage(response));

    const answer = parseAnswer(request.schema, response.text);
    const answerFields = {
      operation: request.operation,
      attempt,
      finishReason: response.candidates?.[0]?.finishReason,
      durationMs: Date.now() - startedAt,
      ...readUsage(response),
    };
    if (answer !== null) {
      logger.info("Answer received", answerFields);
      return { value: answer, usage: totalUsage };
    }
    logger.warn("Answer unusable", answerFields);
  }
  throw new WineIntelligenceError("invalidResponse");
}

/** Runs one Google Search grounded turn and returns the model's research notes. */
export async function collectWebResearchNotes(
  client: GoogleGenAI,
  model: string,
  researchPrompt: string,
): Promise<IntelligenceResult<string>> {
  const startedAt = Date.now();
  logger.info("Web research sent", { model });
  const response = await client.models.generateContent({
    model,
    contents: researchPrompt,
    config: {
      systemInstruction: WEB_RESEARCH_INSTRUCTIONS,
      maxOutputTokens: MAXIMUM_OUTPUT_TOKENS,
      tools: [{ googleSearch: {} }],
      thinkingConfig: buildThinkingConfig(model, WEB_RESEARCH_THINKING_LEVEL),
    },
  });

  const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [];
  for (const query of searchQueries) logger.info("Web search", { query });
  logger.info("Web research answer received", {
    searchCount: searchQueries.length,
    finishReason: response.candidates?.[0]?.finishReason,
    durationMs: Date.now() - startedAt,
    ...readUsage(response),
  });

  const researchNotes = response.text?.trim() ?? "";
  if (researchNotes === "") throw new WineIntelligenceError("invalidResponse");
  return { value: researchNotes, usage: readUsage(response) };
}
