import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { AiUsageRepository } from "../repository/ai-usage-repository";
import { SettingsRepository } from "../repository/settings-repository";
import { AiBudgetExceededError, AiBudgetGuard } from "./ai-budget-guard";

let settingsRepository: SettingsRepository;
let guard: AiBudgetGuard;
const usage = { inputTokens: 10, outputTokens: 5 };

beforeEach(() => {
  const database = openDatabase(IN_MEMORY_DATABASE);
  settingsRepository = new SettingsRepository(database);
  guard = new AiBudgetGuard(new AiUsageRepository(database), settingsRepository, () => new Date());
});

describe("AiBudgetGuard", () => {
  it("allows calls below the monthly limit and counts them", () => {
    settingsRepository.setMonthlyAiCallLimit(2);
    guard.assertCallAllowed();
    guard.recordCall("analyzeLabel", usage);

    expect(guard.getUsageSummary()).toEqual({ callsThisMonth: 1, monthlyLimit: 2 });
  });

  it("blocks calls once the limit is reached", () => {
    settingsRepository.setMonthlyAiCallLimit(1);
    guard.recordCall("analyzeLabel", usage);

    expect(() => guard.assertCallAllowed()).toThrow(AiBudgetExceededError);
  });
});
