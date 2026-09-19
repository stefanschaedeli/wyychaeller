import type { AiUsageRepository } from "../repository/ai-usage-repository";
import type { SettingsRepository } from "../repository/settings-repository";
import type { TokenUsage } from "../wine-intelligence/wine-intelligence";

export class AiBudgetExceededError extends Error {
  constructor() {
    super("The monthly limit for AI calls is reached");
    this.name = "AiBudgetExceededError";
  }
}

export interface AiUsageSummary {
  callsThisMonth: number;
  monthlyLimit: number;
}

/** Protects against runaway costs: every AI operation asks first and reports afterwards. */
export class AiBudgetGuard {
  constructor(
    private readonly aiUsageRepository: AiUsageRepository,
    private readonly settingsRepository: SettingsRepository,
    private readonly getNow: () => Date,
  ) {}

  assertCallAllowed(): void {
    const summary = this.getUsageSummary();
    if (summary.callsThisMonth >= summary.monthlyLimit) throw new AiBudgetExceededError();
  }

  recordCall(operation: string, usage: TokenUsage): void {
    this.aiUsageRepository.recordUsage({ operation, ...usage });
  }

  getUsageSummary(): AiUsageSummary {
    const now = this.getNow();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      callsThisMonth: this.aiUsageRepository.countCallsSince(startOfMonth),
      monthlyLimit: this.settingsRepository.getMonthlyAiCallLimit(),
    };
  }
}
