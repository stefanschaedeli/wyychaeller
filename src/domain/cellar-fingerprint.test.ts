import { describe, expect, it } from "vitest";
import { buildCellarFingerprint } from "./cellar-fingerprint";

const tignanello = { id: 1, bottleCount: 6, analyzedAt: new Date("2026-01-01") };
const chablis = { id: 2, bottleCount: 3, analyzedAt: new Date("2026-02-01") };

describe("buildCellarFingerprint", () => {
  it("is independent of the order of wines", () => {
    expect(buildCellarFingerprint([tignanello, chablis])).toBe(
      buildCellarFingerprint([chablis, tignanello]),
    );
  });

  it("changes when a bottle is drunk", () => {
    const afterDrinking = { ...tignanello, bottleCount: 5 };
    expect(buildCellarFingerprint([afterDrinking, chablis])).not.toBe(
      buildCellarFingerprint([tignanello, chablis]),
    );
  });

  it("changes when a wine is re-analyzed", () => {
    const reanalyzed = { ...chablis, analyzedAt: new Date("2026-03-01") };
    expect(buildCellarFingerprint([tignanello, reanalyzed])).not.toBe(
      buildCellarFingerprint([tignanello, chablis]),
    );
  });

  it("ignores wines without bottles", () => {
    const emptyWine = { id: 3, bottleCount: 0, analyzedAt: null };
    expect(buildCellarFingerprint([tignanello, emptyWine])).toBe(
      buildCellarFingerprint([tignanello]),
    );
  });
});
