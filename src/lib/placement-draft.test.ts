import { describe, expect, it } from "vitest";
import type { BottlePlacement, PlacementPosition } from "@/domain/storage-location";
import { addBottle, countAt, removeBottle, removePosition, setCount } from "./placement-draft";

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

describe("removeBottle", () => {
  it("decrements the count for an existing position", () => {
    const draft = removeBottle(buildDraft({ bottleCount: 2 }), LOCATION_A);
    expect(countAt(draft, LOCATION_A)).toBe(1);
  });

  it("removes the entry once the count reaches zero", () => {
    const draft = removeBottle(buildDraft({ bottleCount: 1 }), LOCATION_A);
    expect(draft).toEqual([]);
  });

  it("does nothing when no entry matches the position", () => {
    const original = buildDraft();
    expect(removeBottle(original, LOCATION_B)).toEqual(original);
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

describe("removePosition", () => {
  it("removes the entry at the given position regardless of count", () => {
    const draft = removePosition(buildDraft({ bottleCount: 9 }), LOCATION_A);
    expect(draft).toEqual([]);
  });

  it("leaves other positions untouched", () => {
    const draft = [...buildDraft(), { ...LOCATION_B, bottleCount: 1 }];
    const updated = removePosition(draft, LOCATION_A);
    expect(updated).toEqual([{ ...LOCATION_B, bottleCount: 1 }]);
  });
});
