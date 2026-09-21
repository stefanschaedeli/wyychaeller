import { ApiError, type GoogleGenAI } from "@google/genai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiWineIntelligence } from "./gemini-wine-intelligence";
import {
  WineIntelligenceError,
  type CellarWineSummary,
  type WineIdentity,
} from "./wine-intelligence";

const generateContent = vi.fn();
const fakeClient = { models: { generateContent } } as unknown as GoogleGenAI;
const intelligence = new GeminiWineIntelligence(fakeClient, "gemini-3.7-flash", () => 2026, "CHF");

const usageMetadata = {
  promptTokenCount: 90,
  toolUsePromptTokenCount: 10,
  candidatesTokenCount: 15,
  thoughtsTokenCount: 5,
};
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

function jsonAnswer(value: unknown) {
  return { text: JSON.stringify(value), usageMetadata };
}

beforeEach(() => {
  generateContent.mockReset();
});

describe("GeminiWineIntelligence.analyzeLabel", () => {
  it("sends the photo with a JSON schema and returns the sanitized reading with token usage", async () => {
    generateContent.mockResolvedValue(jsonAnswer(labelOutput));

    const result = await intelligence.analyzeLabel({ base64Data: "QUJD", mediaType: "image/jpeg" });

    expect(result.value.name).toBe("Tignanello");
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20 });
    const request = generateContent.mock.calls[0][0];
    expect(request.model).toBe("gemini-3.7-flash");
    expect(request.contents[0]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "QUJD" } });
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.responseJsonSchema.properties.producer).toBeDefined();
    expect(request.config.tools).toBeUndefined();
  });

  it("retries once when the answer does not match the schema, then fails", async () => {
    generateContent.mockResolvedValue(jsonAnswer({ isWineLabel: "maybe" }));

    await expect(
      intelligence.analyzeLabel({ base64Data: "QUJD", mediaType: "image/jpeg" }),
    ).rejects.toMatchObject({ reason: "invalidResponse" });
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  it("treats an empty or blocked answer as an invalid response", async () => {
    generateContent.mockResolvedValue({ text: undefined, usageMetadata });
    await expect(
      intelligence.analyzeLabel({ base64Data: "QUJD", mediaType: "image/jpeg" }),
    ).rejects.toBeInstanceOf(WineIntelligenceError);
  });
});

describe("GeminiWineIntelligence.researchWine", () => {
  it("searches with Google, structures the notes and sums usage", async () => {
    generateContent
      .mockResolvedValueOnce({
        text: "Falstaff 95, window 2023-2038.",
        usageMetadata,
        candidates: [{ groundingMetadata: { webSearchQueries: ["Tignanello 2018 Falstaff"] } }],
      })
      .mockResolvedValueOnce(jsonAnswer(researchOutput));

    const result = await intelligence.researchWine(identity);

    const researchRequest = generateContent.mock.calls[0][0];
    expect(researchRequest.config.tools).toEqual([{ googleSearch: {} }]);
    expect(researchRequest.config.responseMimeType).toBeUndefined();
    const structuringRequest = generateContent.mock.calls[1][0];
    expect(structuringRequest.contents).toContain("Falstaff 95");
    expect(structuringRequest.config.tools).toBeUndefined();
    expect(result.value.criticScores[0].url).toBeNull();
    expect(result.usage).toEqual({ inputTokens: 200, outputTokens: 40 });
  });

  it("fails as an invalid response when the research returns no notes", async () => {
    generateContent.mockResolvedValue({ text: "  ", usageMetadata });

    await expect(intelligence.researchWine(identity)).rejects.toMatchObject({
      reason: "invalidResponse",
    });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});

describe("GeminiWineIntelligence.recommendWinesForDish", () => {
  const cellarWines: CellarWineSummary[] = [
    {
      ...identity,
      wineId: 1,
      bottleCount: 2,
      styleClassification: null,
      foodPairings: [],
      drinkingMaturity: "drinkSoon",
    },
  ];

  it("sends the dish and cellar, unwraps recommendations, and drops unknown wine ids", async () => {
    generateContent.mockResolvedValue(
      jsonAnswer({
        recommendations: [
          { wineId: 1, reasoning: "Passt gut.", servingTip: null },
          { wineId: 999, reasoning: "Unbekannter Wein.", servingTip: null },
        ],
      }),
    );

    const result = await intelligence.recommendWinesForDish(
      "Bistecca alla fiorentina",
      cellarWines,
    );

    expect(generateContent.mock.calls[0][0].contents).toContain("Bistecca alla fiorentina");
    expect(result.value).toEqual([{ wineId: 1, reasoning: "Passt gut.", servingTip: null }]);
  });
});

describe("GeminiWineIntelligence error mapping", () => {
  const photo = { base64Data: "QUJD", mediaType: "image/jpeg" } as const;

  it("maps a rejected key to invalidApiKey", async () => {
    generateContent.mockRejectedValue(
      new ApiError({
        status: 400,
        message: '{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}',
      }),
    );
    await expect(intelligence.analyzeLabel(photo)).rejects.toMatchObject({
      reason: "invalidApiKey",
    });
  });

  it("maps a forbidden key to invalidApiKey", async () => {
    generateContent.mockRejectedValue(new ApiError({ status: 403, message: "forbidden" }));
    await expect(intelligence.analyzeLabel(photo)).rejects.toMatchObject({
      reason: "invalidApiKey",
    });
  });

  it("maps other API errors and connection problems to unavailable", async () => {
    generateContent.mockRejectedValueOnce(new ApiError({ status: 503, message: "overloaded" }));
    await expect(intelligence.analyzeLabel(photo)).rejects.toMatchObject({ reason: "unavailable" });

    generateContent.mockRejectedValueOnce(
      new Error("exception TypeError: fetch failed sending request"),
    );
    await expect(intelligence.analyzeLabel(photo)).rejects.toMatchObject({ reason: "unavailable" });
  });
});
