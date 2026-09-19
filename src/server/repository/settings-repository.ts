import { eq } from "drizzle-orm";
import { DEFAULT_CURRENCY, DEFAULT_MONTHLY_AI_CALL_LIMIT } from "@/domain/constants";
import type { WineCellarDatabase } from "../database/connection";
import { settings } from "../database/schema";

const CURRENCY_KEY = "currency";
const MONTHLY_AI_CALL_LIMIT_KEY = "monthlyAiCallLimit";

export class SettingsRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  getCurrency(): string {
    return this.readValue(CURRENCY_KEY) ?? DEFAULT_CURRENCY;
  }

  setCurrency(currency: string): void {
    this.writeValue(CURRENCY_KEY, currency);
  }

  getMonthlyAiCallLimit(): number {
    const storedLimit = Number(this.readValue(MONTHLY_AI_CALL_LIMIT_KEY));
    return Number.isInteger(storedLimit) && storedLimit > 0
      ? storedLimit
      : DEFAULT_MONTHLY_AI_CALL_LIMIT;
  }

  setMonthlyAiCallLimit(limit: number): void {
    this.writeValue(MONTHLY_AI_CALL_LIMIT_KEY, String(limit));
  }

  private readValue(key: string): string | null {
    return this.database.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
  }

  private writeValue(key: string, value: string): void {
    this.database
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
  }
}
