import { describe, expect, it } from "vitest";
import type { BottlePlacement } from "@/domain/storage-location";
import type { PlacedBottleResponse, StorageLocationResponse } from "@/shared/api-contract";
import { describeLocationCapacity } from "./location-capacity";
import { buildOccupancy } from "./slot-occupancy";

function buildLocation(overrides: Partial<StorageLocationResponse> = {}): StorageLocationResponse {
  return {
    id: 1,
    name: "Weinschrank",
    kind: "grid",
    rowCount: 3,
    slotsPerRow: 2,
    slotLabelStyle: "leftRight",
    bottleCount: 4,
    ...overrides,
  };
}

function buildPlacedBottle(overrides: Partial<PlacedBottleResponse> = {}): PlacedBottleResponse {
  return {
    id: 1,
    locationId: 1,
    rowIndex: 1,
    slotIndex: 1,
    freeText: null,
    bottleCount: 1,
    locationName: "Weinschrank",
    description: "Weinschrank, Reihe 1, links",
    wineId: 7,
    wineProducer: "Marchesi Antinori",
    wineName: "Tignanello",
    wineVintage: 2018,
    ...overrides,
  };
}

describe("describeLocationCapacity", () => {
  it("describes a grid by its shape and the slots nobody uses yet", () => {
    const occupancy = buildOccupancy([
      buildPlacedBottle(),
      buildPlacedBottle({ id: 2, wineId: 8 }),
      buildPlacedBottle({ id: 3, rowIndex: 2, slotIndex: 2 }),
    ]);

    expect(describeLocationCapacity(buildLocation(), occupancy)).toBe(
      "3 Reihen × 2 Plätze · 4 frei",
    );
  });

  it("uses the singular for a single row or slot", () => {
    const location = buildLocation({ rowCount: 1, slotsPerRow: 1, slotLabelStyle: "numbered" });

    expect(describeLocationCapacity(location, new Map())).toBe("1 Reihe × 1 Platz · 1 frei");
  });

  it("ignores bottles at other locations when counting free slots", () => {
    const occupancy = buildOccupancy([buildPlacedBottle({ locationId: 2 })]);

    expect(describeLocationCapacity(buildLocation(), occupancy)).toBe(
      "3 Reihen × 2 Plätze · 6 frei",
    );
  });

  it("counts a slot as used when the draft puts bottles there", () => {
    const draft: BottlePlacement[] = [
      { locationId: 1, rowIndex: 3, slotIndex: 2, freeText: null, bottleCount: 2 },
      { locationId: 1, rowIndex: 1, slotIndex: 1, freeText: null, bottleCount: 1 },
      { locationId: 2, rowIndex: 1, slotIndex: 2, freeText: null, bottleCount: 1 },
      { locationId: 1, rowIndex: 2, slotIndex: 2, freeText: null, bottleCount: 0 },
    ];
    const occupancy = buildOccupancy([buildPlacedBottle()]);

    expect(describeLocationCapacity(buildLocation(), occupancy, draft)).toBe(
      "3 Reihen × 2 Plätze · 4 frei",
    );
  });

  it("describes a simple location by the bottles it already holds", () => {
    const location = buildLocation({
      kind: "simple",
      rowCount: null,
      slotsPerRow: null,
      slotLabelStyle: null,
      bottleCount: 5,
    });

    expect(describeLocationCapacity(location, new Map())).toBe("Ohne Raster · 5 Flaschen");
  });

  it("says an empty simple location is empty", () => {
    const location = buildLocation({
      kind: "simple",
      rowCount: null,
      slotsPerRow: null,
      slotLabelStyle: null,
      bottleCount: 0,
    });

    expect(describeLocationCapacity(location, new Map())).toBe("Ohne Raster · leer");
  });
});
