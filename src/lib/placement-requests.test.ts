import { describe, expect, it } from "vitest";
import type { BottlePlacement } from "@/domain/storage-location";
import type { BottlePlacementResponse, StorageLocationResponse } from "@/shared/api-contract";
import { findLocationShape, toDraftPlacements, toPlacementRequests } from "./placement-requests";

const STORED_PLACEMENT: BottlePlacementResponse = {
  id: 12,
  locationId: 1,
  rowIndex: 2,
  slotIndex: 1,
  freeText: null,
  bottleCount: 6,
  locationName: "Weinschrank",
  description: "Weinschrank, Reihe 2, links",
};

const WEINSCHRANK: StorageLocationResponse = {
  id: 1,
  name: "Weinschrank",
  kind: "grid",
  rowCount: 3,
  slotsPerRow: 2,
  slotLabelStyle: "leftRight",
  bottleCount: 6,
};

describe("toDraftPlacements", () => {
  it("drops the fields the server owns and keeps the position", () => {
    expect(toDraftPlacements([STORED_PLACEMENT])).toEqual([
      { locationId: 1, rowIndex: 2, slotIndex: 1, freeText: null, bottleCount: 6 },
    ]);
  });
});

describe("toPlacementRequests", () => {
  it("merges entries that share a position and drops empty ones", () => {
    const draft: BottlePlacement[] = [
      { locationId: 1, rowIndex: 2, slotIndex: 1, freeText: null, bottleCount: 2 },
      { locationId: 1, rowIndex: 2, slotIndex: 1, freeText: null, bottleCount: 4 },
      { locationId: null, rowIndex: null, slotIndex: null, freeText: "Kiste", bottleCount: 0 },
    ];

    expect(toPlacementRequests(draft)).toEqual([
      { locationId: 1, rowIndex: 2, slotIndex: 1, freeText: null, bottleCount: 6 },
    ]);
  });

  it("keeps an empty draft empty, which empties the wine", () => {
    expect(toPlacementRequests([])).toEqual([]);
  });
});

describe("findLocationShape", () => {
  it("finds the location a placement belongs to", () => {
    expect(findLocationShape([WEINSCHRANK], 1)).toEqual(WEINSCHRANK);
  });

  it("returns null for a free-text or unplaced position", () => {
    expect(findLocationShape([WEINSCHRANK], null)).toBeNull();
    expect(findLocationShape([WEINSCHRANK], 99)).toBeNull();
  });
});
