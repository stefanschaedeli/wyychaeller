import { describe, expect, it } from "vitest";
import { buildWineIdentityKey } from "./wine-identity";

describe("buildWineIdentityKey", () => {
  it("ignores case, accents, punctuation and spacing", () => {
    const firstKey = buildWineIdentityKey({
      producer: "Château  Pétrus",
      name: "Pomerol",
      vintage: 2015,
    });
    const secondKey = buildWineIdentityKey({
      producer: "chateau petrus",
      name: "POMEROL.",
      vintage: 2015,
    });

    expect(firstKey).toBe(secondKey);
  });

  it("separates vintages", () => {
    const base = { producer: "Antinori", name: "Tignanello" };
    expect(buildWineIdentityKey({ ...base, vintage: 2018 })).not.toBe(
      buildWineIdentityKey({ ...base, vintage: 2019 }),
    );
  });

  it("supports non-vintage wines", () => {
    expect(buildWineIdentityKey({ producer: "Krug", name: "Grande Cuvée", vintage: null })).toBe(
      "krug|grandecuvee|nv",
    );
  });

  it("returns null when producer and name are both missing", () => {
    expect(buildWineIdentityKey({ producer: null, name: " ", vintage: 2020 })).toBeNull();
  });
});
