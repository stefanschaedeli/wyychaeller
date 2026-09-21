import { z } from "zod";
import { DEFAULT_LOG_LEVEL, LOG_LEVELS } from "@/domain/constants";

const WINE_INTELLIGENCE_MODES = ["claude", "gemini", "recorded"] as const;
export type WineIntelligenceMode = (typeof WINE_INTELLIGENCE_MODES)[number];

const EnvironmentSchema = z.object({
  DATA_DIRECTORY: z.string().min(1).default("./data"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().min(1).default("claude-sonnet-5"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.7-flash"),
  WINE_INTELLIGENCE_MODE: z.enum(WINE_INTELLIGENCE_MODES).default("claude"),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(DEFAULT_LOG_LEVEL),
});

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface Environment {
  dataDirectory: string;
  anthropicApiKey: string | null;
  claudeModel: string;
  geminiApiKey: string | null;
  geminiModel: string;
  wineIntelligenceMode: WineIntelligenceMode;
  logLevel: LogLevel;
}

/** An empty or blank key counts as missing. */
function readApiKey(value: string | undefined): string | null {
  const trimmedApiKey = value?.trim() ?? "";
  return trimmedApiKey === "" ? null : trimmedApiKey;
}

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const parsed = EnvironmentSchema.parse(source);

  return {
    dataDirectory: parsed.DATA_DIRECTORY,
    anthropicApiKey: readApiKey(parsed.ANTHROPIC_API_KEY),
    claudeModel: parsed.CLAUDE_MODEL,
    geminiApiKey: readApiKey(parsed.GEMINI_API_KEY),
    geminiModel: parsed.GEMINI_MODEL,
    wineIntelligenceMode: parsed.WINE_INTELLIGENCE_MODE,
    logLevel: parsed.LOG_LEVEL,
  };
}
