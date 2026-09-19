import { describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { AiUsageRepository } from "./ai-usage-repository";

describe("AiUsageRepository", () => {
  it("counts calls since a point in time", () => {
    const repository = new AiUsageRepository(openDatabase(IN_MEMORY_DATABASE));
    repository.recordUsage({ operation: "analyzeLabel", inputTokens: 1200, outputTokens: 150 });
    repository.recordUsage({ operation: "researchWine", inputTokens: 30000, outputTokens: 900 });

    expect(repository.countCallsSince(new Date(Date.now() - 60_000))).toBe(2);
    expect(repository.countCallsSince(new Date(Date.now() + 60_000))).toBe(0);
  });
});
