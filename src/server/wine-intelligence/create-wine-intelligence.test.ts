import { describe, expect, it } from "vitest";
import { ClaudeWineIntelligence } from "./claude-wine-intelligence";
import { createWineIntelligence } from "./create-wine-intelligence";
import { RecordedWineIntelligence } from "./recorded-wine-intelligence";

const baseEnvironment = {
  dataDirectory: "./data",
  claudeModel: "claude-opus-5",
  anthropicApiKey: null,
  wineIntelligenceMode: "claude",
} as const;

describe("createWineIntelligence", () => {
  it("uses recorded answers in recorded mode", () => {
    const created = createWineIntelligence(
      { ...baseEnvironment, wineIntelligenceMode: "recorded" },
      "CHF",
    );
    expect(created.wineIntelligence).toBeInstanceOf(RecordedWineIntelligence);
    expect(created.isConfigured).toBe(true);
  });

  it("reports a missing key instead of failing at start-up", async () => {
    const created = createWineIntelligence(baseEnvironment, "CHF");
    expect(created.isConfigured).toBe(false);
    await expect(
      created.wineIntelligence.analyzeLabel({ base64Data: "", mediaType: "image/jpeg" }),
    ).rejects.toMatchObject({ reason: "missingApiKey" });
  });

  it("creates the Claude implementation when a key is present", () => {
    const created = createWineIntelligence(
      { ...baseEnvironment, anthropicApiKey: "test-key" },
      "CHF",
    );
    expect(created.wineIntelligence).toBeInstanceOf(ClaudeWineIntelligence);
  });
});
