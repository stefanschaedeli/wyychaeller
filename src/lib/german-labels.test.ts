import { describe, expect, it } from "vitest";
import { ANALYSIS_ERROR_CODES } from "@/domain/wine-types";
import {
  describeError,
  describeLocationShape,
  formatBottleCount,
  formatCurrency,
  formatPlacementList,
  formatWineCount,
  formatWineOrigin,
  formatWineTitle,
  SLOT_LABEL_STYLE_LABELS,
  STORAGE_LOCATION_KIND_LABELS,
} from "./german-labels";

const FALLBACK_ERROR_MESSAGE = "Etwas ist schiefgelaufen. Bitte versuche es erneut.";

// Every API error code that a route can emit, gathered from the server:
// - `new ApiError(...)` calls under src/app/api and src/server/http
//   (photo validation, analysis/confirmation/merge conflicts, rate limiting,
//   invalid input, not found)
// - WINE_INTELLIGENCE_ERROR_REASONS via handle-route.ts
// - ANALYSIS_ERROR_CODES from @/domain/wine-types (imported, not retyped)
// - the client-side "offline" code
// "unexpected" intentionally falls back to the generic message and is tested separately,
// so it is filtered out of ANALYSIS_ERROR_CODES here (that tuple also contains it).
const API_ERROR_CODES = [
  ...new Set([
    "offline",
    "invalidPhoto",
    "photoTooLarge",
    "analysisRunning",
    "identityMissing",
    "notAwaitingConfirmation",
    "isDuplicate",
    "notADuplicate",
    "invalidInput",
    "notFound",
    "rateLimited",
    "budgetExceeded",
    "missingApiKey",
    "invalidApiKey",
    "unavailable",
    "invalidResponse",
    "invalidPlacement",
    "placementRequired",
    "noBottles",
    "tooManyLocations",
    ...ANALYSIS_ERROR_CODES,
  ]),
].filter((code) => code !== "unexpected");

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

  it("formats wine counts with correct dative plural", () => {
    expect(formatWineCount(1)).toBe("1 Wein");
    expect(formatWineCount(3)).toBe("3 Weinen");
  });

  it("explains known error codes and falls back for unknown ones", () => {
    expect(describeError("missingApiKey")).toContain("API-Schlüssel");
    expect(describeError("somethingNew")).toBe(
      "Etwas ist schiefgelaufen. Bitte versuche es erneut.",
    );
  });

  it("has a specific message for every error code the API can emit", () => {
    for (const code of API_ERROR_CODES) {
      expect(describeError(code)).not.toBe(FALLBACK_ERROR_MESSAGE);
    }
  });

  it("falls back to the generic message for the unexpected code", () => {
    expect(describeError("unexpected")).toBe(FALLBACK_ERROR_MESSAGE);
  });

  it("labels storage location kinds and slot label styles in German", () => {
    expect(STORAGE_LOCATION_KIND_LABELS.simple).toBe("Einfach");
    expect(STORAGE_LOCATION_KIND_LABELS.grid).toBe("Raster");
    expect(SLOT_LABEL_STYLE_LABELS.numbered).toBe("Nummeriert");
    expect(SLOT_LABEL_STYLE_LABELS.leftRight).toBe("links / rechts");
    expect(SLOT_LABEL_STYLE_LABELS.leftMiddleRight).toBe("links / Mitte / rechts");
  });

  it("describes a grid location shape with row and slot counts", () => {
    expect(
      describeLocationShape({
        name: "Weinschrank",
        kind: "grid",
        rowCount: 3,
        slotsPerRow: 2,
        slotLabelStyle: "leftRight",
      }),
    ).toBe("3 Reihen × 2 Plätze (links / rechts)");
  });

  it("describes a simple location shape generically", () => {
    expect(
      describeLocationShape({
        name: "Regal 1",
        kind: "simple",
        rowCount: null,
        slotsPerRow: null,
        slotLabelStyle: null,
      }),
    ).toBe("Einfacher Lagerort");
  });

  it("formats a single placement without a count suffix", () => {
    expect(
      formatPlacementList([{ description: "Weinschrank, Reihe 2, links", bottleCount: 4 }]),
    ).toBe("Weinschrank, Reihe 2, links");
  });

  it("formats several placements joined with counts", () => {
    expect(
      formatPlacementList([
        { description: "Weinschrank, Reihe 2, links", bottleCount: 4 },
        { description: "Regal 1", bottleCount: 1 },
      ]),
    ).toBe("Weinschrank, Reihe 2, links (4) · Regal 1 (1)");
  });
});
