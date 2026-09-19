import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaudeWineIntelligence } from "./claude-wine-intelligence";
import { WineIntelligenceError, type WineIdentity } from "./wine-intelligence";

const parse = vi.fn();
const create = vi.fn();
const fakeClient = { messages: { parse, create } } as unknown as Anthropic;
const intelligence = new ClaudeWineIntelligence(fakeClient, "claude-opus-5", () => 2026, "CHF");

const usage = { input_tokens: 100, output_tokens: 20 };
const identity: WineIdentity = {
  producer: "Antinori",
  name: "Tignanello",
  vintage: 2018,
  country: null,
  region: null,
  appellation: null,
  grapeVarieties: [],
  wineType: "red",
};
const labelOutput = { ...identity, isWineLabel: true, alcoholPercent: 14 };
const researchOutput = {
  country: "Italien",
  region: "Toskana",
  grapeVarieties: ["Sangiovese"],
  wineType: "red",
  styleClassification: "Supertoskaner",
  description: "Kraftvoll.",
  criticScores: [{ source: "Falstaff", points: 95, url: "javascript:alert(1)" }],
  aggregateScore: 95,
  drinkFromYear: 2023,
  drinkUntilYear: 2038,
  foodPairings: ["Bistecca"],
  estimatedMarketValue: 140,
  confidence: "researched",
};

beforeEach(() => {
  parse.mockReset();
  create.mockReset();
});

describe("ClaudeWineIntelligence.analyzeLabel", () => {
  it("sends the photo and returns the sanitized reading with token usage", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: labelOutput, usage });

    const result = await intelligence.analyzeLabel({ base64Data: "QUJD", mediaType: "image/jpeg" });

    expect(result.value.name).toBe("Tignanello");
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20 });
    const request = parse.mock.calls[0][0];
    expect(request.model).toBe("claude-opus-5");
    expect(request.messages[0].content[0]).toEqual({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: "QUJD" },
    });
  });

  it("retries once when the answer cannot be parsed, then fails", async () => {
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: null, usage });

    await expect(
      intelligence.analyzeLabel({ base64Data: "QUJD", mediaType: "image/jpeg" }),
    ).rejects.toMatchObject({ reason: "invalidResponse" });
    expect(parse).toHaveBeenCalledTimes(2);
  });

  it("treats a refusal as an invalid response", async () => {
    parse.mockResolvedValue({ stop_reason: "refusal", parsed_output: null, usage });
    await expect(
      intelligence.analyzeLabel({ base64Data: "QUJD", mediaType: "image/jpeg" }),
    ).rejects.toBeInstanceOf(WineIntelligenceError);
  });
});

describe("ClaudeWineIntelligence.researchWine", () => {
  it("searches the web, resumes paused turns, structures the notes and sums usage", async () => {
    const pausedContent = [
      { type: "server_tool_use", id: "tool_1", name: "web_search", input: {} },
    ];
    create
      .mockResolvedValueOnce({ stop_reason: "pause_turn", content: pausedContent, usage })
      .mockResolvedValueOnce({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Falstaff 95, window 2023-2038." }],
        usage,
      });
    parse.mockResolvedValue({ stop_reason: "end_turn", parsed_output: researchOutput, usage });

    const result = await intelligence.researchWine(identity);

    expect(create.mock.calls[0][0].tools).toEqual([
      { type: "web_search_20260209", name: "web_search", max_uses: 6 },
    ]);
    expect(create.mock.calls[1][0].messages[1]).toEqual({
      role: "assistant",
      content: pausedContent,
    });
    expect(parse.mock.calls[0][0].messages[0].content).toContain("Falstaff 95");
    expect(result.value.criticScores[0].url).toBeNull();
    expect(result.usage).toEqual({ inputTokens: 300, outputTokens: 60 });
  });
});

describe("ClaudeWineIntelligence error mapping", () => {
  it("maps authentication failures to invalidApiKey", async () => {
    parse.mockRejectedValue(
      new Anthropic.AuthenticationError(401, undefined, "bad key", new Headers()),
    );
    await expect(
      intelligence.analyzeLabel({ base64Data: "QUJD", mediaType: "image/jpeg" }),
    ).rejects.toMatchObject({ reason: "invalidApiKey" });
  });

  it("maps connection problems to unavailable", async () => {
    parse.mockRejectedValue(new Anthropic.APIConnectionError({ message: "offline" }));
    await expect(
      intelligence.analyzeLabel({ base64Data: "QUJD", mediaType: "image/jpeg" }),
    ).rejects.toMatchObject({ reason: "unavailable" });
  });
});
