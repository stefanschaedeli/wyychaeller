import Anthropic from "@anthropic-ai/sdk";
import type { Environment } from "../config/environment";
import { ClaudeWineIntelligence } from "./claude-wine-intelligence";
import { RecordedWineIntelligence } from "./recorded-wine-intelligence";
import { WineIntelligenceError, type WineIntelligence } from "./wine-intelligence";

const REQUEST_TIMEOUT_MILLISECONDS = 5 * 60 * 1000;

/** Lets the app start and work without a key. Only AI actions fail, with a clear reason. */
class UnconfiguredWineIntelligence implements WineIntelligence {
  async analyzeLabel(): Promise<never> {
    throw new WineIntelligenceError("missingApiKey");
  }
  async researchWine(): Promise<never> {
    throw new WineIntelligenceError("missingApiKey");
  }
  async recommendWinesForDish(): Promise<never> {
    throw new WineIntelligenceError("missingApiKey");
  }
}

export interface CreatedWineIntelligence {
  wineIntelligence: WineIntelligence;
  isConfigured: boolean;
}

export function createWineIntelligence(
  environment: Environment,
  currency: string,
): CreatedWineIntelligence {
  if (environment.wineIntelligenceMode === "recorded") {
    return { wineIntelligence: new RecordedWineIntelligence(), isConfigured: true };
  }
  if (environment.anthropicApiKey === null) {
    return { wineIntelligence: new UnconfiguredWineIntelligence(), isConfigured: false };
  }
  const client = new Anthropic({
    apiKey: environment.anthropicApiKey,
    timeout: REQUEST_TIMEOUT_MILLISECONDS,
  });
  const wineIntelligence = new ClaudeWineIntelligence(
    client,
    environment.claudeModel,
    () => new Date().getFullYear(),
    currency,
  );
  return { wineIntelligence, isConfigured: true };
}
