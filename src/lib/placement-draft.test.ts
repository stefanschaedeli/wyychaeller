import { describe, expect, it } from "vitest";
import { MAXIMUM_PLACEMENTS_PER_WINE } from "@/domain/constants";
import type { BottlePlacement, PlacementPosition } from "@/domain/storage-location";
import { addBottle, canAddPosition, countAt, setCount } from "./placement-draft";

const LOCATION_A: PlacementPosition = {
  locationId: 1,
  rowIndex: 2,
  slotIndex: 1,
  freeText: null,
};

const LOCATION_B: PlacementPosition = {
  locationId: 2,
  rowIndex: null,
  slotIndex: null,
  freeText: null,
};

function buildDraft(overrides: Partial<BottlePlacement> = {}): BottlePlacement[] {
  return [{ ...LOCATION_A, bottleCount: 2, ...overrides }];
}

describe("countAt", () => {
  it("returns the bottle count at a matching position", () => {
    expect(countAt(buildDraft(), LOCATION_A)).toBe(2);
  });

  it("returns zero when no entry matches the position", () => {
    expect(countAt(buildDraft(), LOCATION_B)).toBe(0);
  });
});

describe("addBottle", () => {
  it("increments the count for an existing position", () => {
    const draft = addBottle(buildDraft(), LOCATION_A);
    expect(countAt(draft, LOCATION_A)).toBe(3);
  });

  it("creates a new entry with one bottle for a new position", () => {
    const draft = addBottle(buildDraft(), LOCATION_B);
    expect(countAt(draft, LOCATION_B)).toBe(1);
    expect(countAt(draft, LOCATION_A)).toBe(2);
  });

  it("returns a new array instead of mutating the input", () => {
    const original = buildDraft();
    const updated = addBottle(original, LOCATION_A);
    expect(updated).not.toBe(original);
    expect(countAt(original, LOCATION_A)).toBe(2);
  });
});

describe("setCount", () => {
  it("sets an explicit bottle count for a position", () => {
    const draft = setCount(buildDraft(), LOCATION_A, 5);
    expect(countAt(draft, LOCATION_A)).toBe(5);
  });

  it("creates a new entry when the position did not exist", () => {
    const draft = setCount(buildDraft(), LOCATION_B, 4);
    expect(countAt(draft, LOCATION_B)).toBe(4);
  });

  it("removes the entry when set to zero", () => {
    const draft = setCount(buildDraft(), LOCATION_A, 0);
    expect(draft).toEqual([]);
  });
});

function buildFullDraft(): BottlePlacement[] {
  return Array.from({ length: MAXIMUM_PLACEMENTS_PER_WINE }, (_unused, index) => ({
    locationId: index + 1,
    rowIndex: null,
    slotIndex: null,
    freeText: null,
    bottleCount: 1,
  }));
}

describe("canAddPosition", () => {
  it("allows a new position while under the maximum", () => {
    expect(canAddPosition(buildDraft(), LOCATION_B)).toBe(true);
  });

  it("allows adding to a position the draft already has, even at the maximum", () => {
    const fullDraft = buildFullDraft();
    expect(canAddPosition(fullDraft, fullDraft[0])).toBe(true);
  });

  it("rejects a new, distinct position once the draft is at the maximum", () => {
    const fullDraft = buildFullDraft();
    const newPosition: PlacementPosition = {
      locationId: MAXIMUM_PLACEMENTS_PER_WINE + 1,
      rowIndex: null,
      slotIndex: null,
      freeText: null,
    };
    expect(canAddPosition(fullDraft, newPosition)).toBe(false);
  });
});
