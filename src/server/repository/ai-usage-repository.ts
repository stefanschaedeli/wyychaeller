import { count, gte } from "drizzle-orm";
import type { WineCellarDatabase } from "../database/connection";
import { aiUsage } from "../database/schema";

export interface AiUsageEntry {
  operation: string;
  inputTokens: number;
  outputTokens: number;
}

export class AiUsageRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  recordUsage(entry: AiUsageEntry): void {
    this.database.insert(aiUsage).values(entry).run();
  }

  countCallsSince(since: Date): number {
    const result = this.database
      .select({ callCount: count() })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, since))
      .get();
    return result?.callCount ?? 0;
  }
}
