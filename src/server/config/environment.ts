import { z } from "zod";

const EnvironmentSchema = z.object({
  DATA_DIRECTORY: z.string().min(1).default("./data"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().min(1).default("claude-sonnet-5"),
  WINE_INTELLIGENCE_MODE: z.enum(["claude", "recorded"]).default("claude"),
});

export interface Environment {
  dataDirectory: string;
  anthropicApiKey: string | null;
  claudeModel: string;
  wineIntelligenceMode: "claude" | "recorded";
}

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const parsed = EnvironmentSchema.parse(source);
  const trimmedApiKey = parsed.ANTHROPIC_API_KEY?.trim() ?? "";

  return {
    dataDirectory: parsed.DATA_DIRECTORY,
    anthropicApiKey: trimmedApiKey === "" ? null : trimmedApiKey,
    claudeModel: parsed.CLAUDE_MODEL,
    wineIntelligenceMode: parsed.WINE_INTELLIGENCE_MODE,
  };
}
