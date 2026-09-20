import { describe, expect, it } from "vitest";
import { readEnvironment } from "./environment";

// Next.js declares `NODE_ENV` as a required field of `NodeJS.ProcessEnv`, so every
// test fixture must include it even though `readEnvironment` ignores it.
const TEST_NODE_ENV = "test" as const;

describe("readEnvironment", () => {
  it("applies defaults", () => {
    expect(readEnvironment({ NODE_ENV: TEST_NODE_ENV })).toEqual({
      dataDirectory: "./data",
      anthropicApiKey: null,
      claudeModel: "claude-sonnet-5",
      wineIntelligenceMode: "claude",
    });
  });

  it("treats an empty API key as missing", () => {
    expect(
      readEnvironment({ NODE_ENV: TEST_NODE_ENV, ANTHROPIC_API_KEY: "  " }).anthropicApiKey,
    ).toBeNull();
  });

  it("reads configured values", () => {
    const environment = readEnvironment({
      NODE_ENV: TEST_NODE_ENV,
      DATA_DIRECTORY: "/data",
      ANTHROPIC_API_KEY: "test-key",
      CLAUDE_MODEL: "claude-opus-5",
      WINE_INTELLIGENCE_MODE: "recorded",
    });
    expect(environment.dataDirectory).toBe("/data");
    expect(environment.anthropicApiKey).toBe("test-key");
    expect(environment.claudeModel).toBe("claude-opus-5");
    expect(environment.wineIntelligenceMode).toBe("recorded");
  });

  it("rejects an unknown intelligence mode", () => {
    expect(() =>
      readEnvironment({ NODE_ENV: TEST_NODE_ENV, WINE_INTELLIGENCE_MODE: "magic" }),
    ).toThrow();
  });
});
