import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { WEB_RESEARCH_INSTRUCTIONS } from "./prompts";
import {
  WineIntelligenceError,
  type IntelligenceResult,
  type TokenUsage,
} from "./wine-intelligence";

const MAXIMUM_OUTPUT_TOKENS = 16000;
const MAXIMUM_WEB_SEARCHES = 6;
const MAXIMUM_PAUSE_CONTINUATIONS = 3;
const STRUCTURED_REQUEST_ATTEMPTS = 2;

export type ReasoningEffort = "low" | "medium";

const WEB_RESEARCH_EFFORT: ReasoningEffort = "medium";

export interface StructuredRequest<Schema extends z.ZodType> {
  schema: Schema;
  instructions: string;
  userContent: Anthropic.MessageParam["content"];
  effort: ReasoningEffort;
}

export function addUsage(first: TokenUsage, second: TokenUsage): TokenUsage {
  return {
    inputTokens: first.inputTokens + second.inputTokens,
    outputTokens: first.outputTokens + second.outputTokens,
  };
}

function readUsage(usage: Anthropic.Usage): TokenUsage {
  return { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens };
}

export function mapClaudeError(error: unknown): unknown {
  if (error instanceof WineIntelligenceError) return error;
  const isCredentialProblem =
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError;
  if (isCredentialProblem) return new WineIntelligenceError("invalidApiKey");
  if (error instanceof Anthropic.APIError) return new WineIntelligenceError("unavailable");
  return error;
}

/** Asks for a schema-constrained answer. Retries once when the answer is unusable. */
export async function requestStructuredOutput<Schema extends z.ZodType>(
  client: Anthropic,
  model: string,
  request: StructuredRequest<Schema>,
): Promise<IntelligenceResult<z.infer<Schema>>> {
  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };

  for (let attempt = 1; attempt <= STRUCTURED_REQUEST_ATTEMPTS; attempt += 1) {
    const response = await client.messages.parse({
      model,
      max_tokens: MAXIMUM_OUTPUT_TOKENS,
      system: request.instructions,
      messages: [{ role: "user", content: request.userContent }],
      output_config: { format: zodOutputFormat(request.schema), effort: request.effort },
    });
    totalUsage = addUsage(totalUsage, readUsage(response.usage));

    const isUsable = response.stop_reason !== "refusal" && response.parsed_output !== null;
    // Safe: guarded by the null check above; the SDK cannot relate its runtime
    // JSON-schema output to this call's generic Schema, so a cast is unavoidable.
    if (isUsable) return { value: response.parsed_output as z.infer<Schema>, usage: totalUsage };
  }
  throw new WineIntelligenceError("invalidResponse");
}

function buildResearchTurnMessages(
  researchPrompt: string,
  assistantContent: Anthropic.ContentBlockParam[],
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: researchPrompt }];
  if (assistantContent.length > 0) {
    messages.push({ role: "assistant", content: assistantContent });
  }
  return messages;
}

function extractResearchNotes(assistantContent: Anthropic.ContentBlockParam[]): string {
  return assistantContent
    .filter((block): block is Anthropic.TextBlockParam => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * Runs a web search turn. Long server-tool turns stop with "pause_turn";
 * re-sending the accumulated assistant content lets the server continue.
 */
export async function collectWebResearchNotes(
  client: Anthropic,
  model: string,
  researchPrompt: string,
): Promise<IntelligenceResult<string>> {
  // The API accepts its own response content blocks back as assistant input, but
  // ContentBlock (response) and ContentBlockParam (request) are distinct types.
  let assistantContent: Anthropic.ContentBlockParam[] = [];
  let totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  let hasTurnFinished = false;

  for (let continuation = 0; continuation <= MAXIMUM_PAUSE_CONTINUATIONS; continuation += 1) {
    const response = await client.messages.create({
      model,
      max_tokens: MAXIMUM_OUTPUT_TOKENS,
      system: WEB_RESEARCH_INSTRUCTIONS,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAXIMUM_WEB_SEARCHES }],
      output_config: { effort: WEB_RESEARCH_EFFORT },
      messages: buildResearchTurnMessages(researchPrompt, assistantContent),
    });
    totalUsage = addUsage(totalUsage, readUsage(response.usage));
    // A new array, not a push: the previous request's `messages` still references
    // the old `assistantContent` array and must not see this response's content.
    assistantContent = [
      ...assistantContent,
      ...(response.content as Anthropic.ContentBlockParam[]),
    ];

    if (response.stop_reason === "refusal") throw new WineIntelligenceError("invalidResponse");
    if (response.stop_reason !== "pause_turn") {
      hasTurnFinished = true;
      break;
    }
  }
  if (!hasTurnFinished) throw new WineIntelligenceError("unavailable");

  const researchNotes = extractResearchNotes(assistantContent);
  if (researchNotes === "") throw new WineIntelligenceError("invalidResponse");
  return { value: researchNotes, usage: totalUsage };
}
