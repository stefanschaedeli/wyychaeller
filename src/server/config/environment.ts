import { z } from "zod";
import { DEFAULT_LOG_LEVEL, LOG_LEVELS } from "@/domain/constants";

const EnvironmentSchema = z.object({
  DATA_DIRECTORY: z.string().min(1).default("./data"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().min(1).default("claude-sonnet-5"),
  WINE_INTELLIGENCE_MODE: z.enum(["claude", "recorded"]).default("claude"),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
});

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface Environment {
  dataDirectory: string;
  anthropicApiKey: string | null;
  claudeModel: string;
  wineIntelligenceMode: "claude" | "recorded";
  logLevel: LogLevel;
}

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const parsed = EnvironmentSchema.parse(source);
  const trimmedApiKey = parsed.ANTHROPIC_API_KEY?.trim() ?? "";

  return {
    dataDirectory: parsed.DATA_DIRECTORY,
    anthropicApiKey: trimmedApiKey === "" ? null : trimmedApiKey,
    claudeModel: parsed.CLAUDE_MODEL,
    wineIntelligenceMode: parsed.WINE_INTELLIGENCE_MODE,
    logLevel: parsed.LOG_LEVEL,
  };
}
