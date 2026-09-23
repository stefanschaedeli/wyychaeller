import { describe, expect, it } from "vitest";
import type { PlacedBottleResponse } from "@/shared/api-contract";
import { buildOccupancy } from "./slot-occupancy";

function buildPlacedBottle(overrides: Partial<PlacedBottleResponse> = {}): PlacedBottleResponse {
  return {
    id: 1,
    locationId: 1,
    rowIndex: 2,
    slotIndex: 1,
    freeText: null,
    bottleCount: 3,
    locationName: "Weinschrank",
    description: "Weinschrank, Reihe 2, links",
    wineId: 7,
    wineProducer: "Marchesi Antinori",
    wineName: "Tignanello",
    wineVintage: 2018,
    ...overrides,
  };
}

describe("buildOccupancy", () => {
  it("keys a grid placement by its slot", () => {
    const occupancy = buildOccupancy([buildPlacedBottle()]);

    expect(occupancy.get("location:1:2:1")).toEqual({
      bottleCount: 3,
      placements: [buildPlacedBottle()],
    });
  });

  it("sums the bottles of several wines in the same slot", () => {
    const occupancy = buildOccupancy([
      buildPlacedBottle(),
      buildPlacedBottle({ id: 2, wineId: 8, bottleCount: 2 }),
    ]);

    expect(occupancy.get("location:1:2:1")?.bottleCount).toBe(5);
    expect(occupancy.get("location:1:2:1")?.placements).toHaveLength(2);
  });

  it("keys a simple location by the location alone", () => {
    const occupancy = buildOccupancy([
      buildPlacedBottle({ rowIndex: null, slotIndex: null, description: "Regal 1" }),
    ]);

    expect(occupancy.get("location:1")?.bottleCount).toBe(3);
  });

  it("ignores placements that belong to no location", () => {
    const occupancy = buildOccupancy([
      buildPlacedBottle({ locationId: null, rowIndex: null, slotIndex: null, freeText: "Kiste" }),
    ]);

    expect(occupancy.size).toBe(0);
  });
});
