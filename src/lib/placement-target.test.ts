import { describe, expect, it } from "vitest";
import type { BottlePlacement } from "@/domain/storage-location";
import { countForTarget, isSameTarget, type PlacementTarget } from "./placement-target";

const WEINSCHRANK: PlacementTarget = { kind: "location", locationId: 1 };
const REGAL: PlacementTarget = { kind: "location", locationId: 2 };
const FREE_TEXT: PlacementTarget = { kind: "freeText" };
const UNPLACED: PlacementTarget = { kind: "unplaced" };

describe("isSameTarget", () => {
  it("matches two location targets only when their ids agree", () => {
    expect(isSameTarget(WEINSCHRANK, { kind: "location", locationId: 1 })).toBe(true);
    expect(isSameTarget(WEINSCHRANK, REGAL)).toBe(false);
  });

  it("matches the free-text and unplaced targets only with themselves", () => {
    expect(isSameTarget(FREE_TEXT, { kind: "freeText" })).toBe(true);
    expect(isSameTarget(UNPLACED, { kind: "unplaced" })).toBe(true);
    expect(isSameTarget(FREE_TEXT, UNPLACED)).toBe(false);
    expect(isSameTarget(FREE_TEXT, WEINSCHRANK)).toBe(false);
  });

  it("matches nothing while no target is selected", () => {
    expect(isSameTarget(null, WEINSCHRANK)).toBe(false);
    expect(isSameTarget(null, UNPLACED)).toBe(false);
  });
});

describe("countForTarget", () => {
  const draft: BottlePlacement[] = [
    { locationId: 1, rowIndex: 1, slotIndex: 1, freeText: null, bottleCount: 2 },
    { locationId: 1, rowIndex: 2, slotIndex: 1, freeText: null, bottleCount: 1 },
    { locationId: 2, rowIndex: null, slotIndex: null, freeText: null, bottleCount: 6 },
    { locationId: null, rowIndex: null, slotIndex: null, freeText: "Kiste", bottleCount: 3 },
    { locationId: null, rowIndex: null, slotIndex: null, freeText: null, bottleCount: 4 },
  ];

  it("sums the bottles the draft puts into one location", () => {
    expect(countForTarget(WEINSCHRANK, draft)).toBe(3);
    expect(countForTarget(REGAL, draft)).toBe(6);
  });

  it("sums the free-text bottles", () => {
    expect(countForTarget(FREE_TEXT, draft)).toBe(3);
  });

  it("sums the bottles that have no position yet", () => {
    expect(countForTarget(UNPLACED, draft)).toBe(4);
  });

  it("is zero for a location the draft does not mention", () => {
    expect(countForTarget({ kind: "location", locationId: 9 }, draft)).toBe(0);
  });
});
