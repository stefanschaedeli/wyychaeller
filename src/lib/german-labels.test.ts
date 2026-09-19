import { describe, expect, it } from "vitest";
import {
  describeError,
  formatBottleCount,
  formatCurrency,
  formatWineOrigin,
  formatWineTitle,
} from "./german-labels";

describe("german labels", () => {
  it("builds a wine title from the best available fields", () => {
    expect(formatWineTitle({ producer: "Antinori", name: "Tignanello", vintage: 2018 })).toBe(
      "Tignanello 2018",
    );
    expect(formatWineTitle({ producer: "Krug", name: null, vintage: null })).toBe("Krug");
    expect(formatWineTitle({ producer: null, name: null, vintage: null })).toBe("Unbekannter Wein");
  });

  it("joins origin parts and skips missing ones", () => {
    expect(formatWineOrigin({ region: "Toskana", country: "Italien" })).toBe("Toskana · Italien");
    expect(formatWineOrigin({ region: null, country: null })).toBe("");
  });

  it("formats money without decimals and bottle counts with correct plural", () => {
    const formatted = formatCurrency(1400, "CHF");
    expect(formatted).toContain("CHF");
    expect(formatted).toMatch(/1.?400/);
    expect(formatBottleCount(1)).toBe("1 Flasche");
    expect(formatBottleCount(6)).toBe("6 Flaschen");
  });

  it("explains known error codes and falls back for unknown ones", () => {
    expect(describeError("missingApiKey")).toContain("API-Schlüssel");
    expect(describeError("somethingNew")).toBe(
      "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    );
  });
});
