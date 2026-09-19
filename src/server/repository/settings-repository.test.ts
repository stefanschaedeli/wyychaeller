import { describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { SettingsRepository } from "./settings-repository";

describe("SettingsRepository", () => {
  it("returns defaults and persists changes", () => {
    const repository = new SettingsRepository(openDatabase(IN_MEMORY_DATABASE));

    expect(repository.getCurrency()).toBe("CHF");
    expect(repository.getMonthlyAiCallLimit()).toBe(300);

    repository.setCurrency("EUR");
    repository.setMonthlyAiCallLimit(50);
    repository.setMonthlyAiCallLimit(80);

    expect(repository.getCurrency()).toBe("EUR");
    expect(repository.getMonthlyAiCallLimit()).toBe(80);
  });
});
