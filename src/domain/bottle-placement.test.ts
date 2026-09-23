import { describe, expect, it } from "vitest";
import {
  findPlacementsOutsideShape,
  groupPlacementsBySlot,
  isConsistentPosition,
  isPositionWithinLocation,
  mergePlacements,
  sumBottles,
  toFreeTextPlacement,
} from "./bottle-placement";
import type { BottlePlacement, StorageLocationShape } from "./storage-location";

function buildPlacement(overrides: Partial<BottlePlacement> = {}): BottlePlacement {
  return {
    locationId: 1,
    rowIndex: 2,
    slotIndex: 1,
    freeText: null,
    bottleCount: 3,
    ...overrides,
  };
}

const GRID_SHAPE: StorageLocationShape = {
  name: "Weinschrank",
  kind: "grid",
  rowCount: 5,
  slotsPerRow: 2,
  slotLabelStyle: "leftRight",
};

const SIMPLE_SHAPE: StorageLocationShape = {
  name: "Regal 1",
  kind: "simple",
  rowCount: null,
  slotsPerRow: null,
  slotLabelStyle: null,
};

describe("mergePlacements", () => {
  it("sums bottle counts for placements sharing the same key", () => {
    const placements = [buildPlacement({ bottleCount: 2 }), buildPlacement({ bottleCount: 3 })];
    const merged = mergePlacements(placements);
    expect(merged).toEqual([buildPlacement({ bottleCount: 5 })]);
  });

  it("drops placements whose merged count is zero or less", () => {
    const placements = [buildPlacement({ bottleCount: 2 }), buildPlacement({ bottleCount: -2 })];
    expect(mergePlacements(placements)).toEqual([]);
  });

  it("keeps first-seen order for distinct keys", () => {
    const first = buildPlacement({ locationId: 1, rowIndex: 1, slotIndex: 1 });
    const second = buildPlacement({ locationId: 2, rowIndex: null, slotIndex: null });
    expect(mergePlacements([second, first])).toEqual([second, first]);
  });
});

describe("sumBottles", () => {
  it("adds up bottle counts across placements", () => {
    const placements = [buildPlacement({ bottleCount: 2 }), buildPlacement({ bottleCount: 5 })];
    expect(sumBottles(placements)).toBe(7);
  });

  it("returns zero for an empty list", () => {
    expect(sumBottles([])).toBe(0);
  });
});

describe("isConsistentPosition", () => {
  it("accepts a grid position tied to a location", () => {
    const position = { locationId: 1, rowIndex: 2, slotIndex: 1, freeText: null };
    expect(isConsistentPosition(position)).toBe(true);
  });

  it("accepts a simple location position with null row and slot", () => {
    const position = { locationId: 1, rowIndex: null, slotIndex: null, freeText: null };
    expect(isConsistentPosition(position)).toBe(true);
  });

  it("accepts a free text position without a location", () => {
    const position = { locationId: null, rowIndex: null, slotIndex: null, freeText: "Keller" };
    expect(isConsistentPosition(position)).toBe(true);
  });

  it("accepts an unplaced position", () => {
    const position = { locationId: null, rowIndex: null, slotIndex: null, freeText: null };
    expect(isConsistentPosition(position)).toBe(true);
  });

  it("rejects a grid position without a location", () => {
    const position = { locationId: null, rowIndex: 2, slotIndex: 1, freeText: null };
    expect(isConsistentPosition(position)).toBe(false);
  });

  it("rejects a position combining a location and free text", () => {
    const position = { locationId: 1, rowIndex: null, slotIndex: null, freeText: "Keller" };
    expect(isConsistentPosition(position)).toBe(false);
  });
});

describe("isPositionWithinLocation", () => {
  it("accepts a grid position within the shape's rows and slots", () => {
    const position = { locationId: 1, rowIndex: 5, slotIndex: 2, freeText: null };
    expect(isPositionWithinLocation(position, GRID_SHAPE)).toBe(true);
  });

  it("rejects a grid position beyond the shape's row count", () => {
    const position = { locationId: 1, rowIndex: 6, slotIndex: 1, freeText: null };
    expect(isPositionWithinLocation(position, GRID_SHAPE)).toBe(false);
  });

  it("rejects a grid position beyond the shape's slots per row", () => {
    const position = { locationId: 1, rowIndex: 1, slotIndex: 3, freeText: null };
    expect(isPositionWithinLocation(position, GRID_SHAPE)).toBe(false);
  });

  it("accepts a simple location position with null row and slot", () => {
    const position = { locationId: 1, rowIndex: null, slotIndex: null, freeText: null };
    expect(isPositionWithinLocation(position, SIMPLE_SHAPE)).toBe(true);
  });

  it("rejects a grid-shaped position against a simple location", () => {
    const position = { locationId: 1, rowIndex: 1, slotIndex: 1, freeText: null };
    expect(isPositionWithinLocation(position, SIMPLE_SHAPE)).toBe(false);
  });
});

describe("findPlacementsOutsideShape", () => {
  it("finds every positioned placement when a grid shrinks to simple", () => {
    const placements = [buildPlacement(), buildPlacement({ locationId: 2 })];
    const outside = findPlacementsOutsideShape(placements, SIMPLE_SHAPE);
    expect(outside).toHaveLength(2);
  });

  it("finds placements whose slot no longer exists in a resized grid", () => {
    const shrunkShape: StorageLocationShape = { ...GRID_SHAPE, rowCount: 1 };
    const placements = [
      buildPlacement({ rowIndex: 1 }),
      buildPlacement({ rowIndex: 3, locationId: 1 }),
    ];
    const outside = findPlacementsOutsideShape(placements, shrunkShape);
    expect(outside).toEqual([buildPlacement({ rowIndex: 3, locationId: 1 })]);
  });

  it("keeps placements that still fit the new shape", () => {
    const placements = [buildPlacement()];
    expect(findPlacementsOutsideShape(placements, GRID_SHAPE)).toEqual([]);
  });
});

describe("toFreeTextPlacement", () => {
  it("converts a placement into free text using the old location's description", () => {
    const placement = buildPlacement({ bottleCount: 4 });
    const converted = toFreeTextPlacement(placement, GRID_SHAPE);
    expect(converted).toEqual({
      locationId: null,
      rowIndex: null,
      slotIndex: null,
      freeText: "Weinschrank, Reihe 2, links",
      bottleCount: 4,
    });
  });
});

describe("groupPlacementsBySlot", () => {
  it("groups placements by their key, summing bottle counts", () => {
    const first = buildPlacement({ bottleCount: 2 });
    const second = buildPlacement({ bottleCount: 3 });
    const other = buildPlacement({
      locationId: 2,
      rowIndex: null,
      slotIndex: null,
      bottleCount: 1,
    });
    const grouped = groupPlacementsBySlot([first, second, other]);
    expect(grouped.get("location:1:2:1")).toEqual({ bottleCount: 5, placements: [first, second] });
    expect(grouped.get("location:2")).toEqual({ bottleCount: 1, placements: [other] });
  });
});
