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
      geminiApiKey: null,
      geminiModel: "gemini-3.7-flash",
      wineIntelligenceMode: "claude",
      logLevel: "info",
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
      LOG_LEVEL: "debug",
    });
    expect(environment.dataDirectory).toBe("/data");
    expect(environment.anthropicApiKey).toBe("test-key");
    expect(environment.claudeModel).toBe("claude-opus-5");
    expect(environment.wineIntelligenceMode).toBe("recorded");
    expect(environment.logLevel).toBe("debug");
  });

  it("reads the Gemini settings", () => {
    const environment = readEnvironment({
      NODE_ENV: TEST_NODE_ENV,
      GEMINI_API_KEY: " gemini-key ",
      GEMINI_MODEL: "gemini-3.5-flash-lite",
      WINE_INTELLIGENCE_MODE: "gemini",
    });
    expect(environment.geminiApiKey).toBe("gemini-key");
    expect(environment.geminiModel).toBe("gemini-3.5-flash-lite");
    expect(environment.wineIntelligenceMode).toBe("gemini");
  });

  it("rejects an unknown intelligence mode", () => {
    expect(() =>
      readEnvironment({ NODE_ENV: TEST_NODE_ENV, WINE_INTELLIGENCE_MODE: "magic" }),
    ).toThrow();
  });

  it("rejects an unknown log level", () => {
    expect(() => readEnvironment({ NODE_ENV: TEST_NODE_ENV, LOG_LEVEL: "chatty" })).toThrow();
  });
});
