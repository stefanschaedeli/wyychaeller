import { describe, expect, it } from "vitest";
import { stripDiacritics } from "./text-normalization";

describe("stripDiacritics", () => {
  it("removes combining diacritical marks", () => {
    expect(stripDiacritics("Château Pétrus")).toBe("Chateau Petrus");
  });

  it("leaves plain text unchanged", () => {
    expect(stripDiacritics("Barolo Riserva")).toBe("Barolo Riserva");
  });

  it("returns an empty string unchanged", () => {
    expect(stripDiacritics("")).toBe("");
  });
});
