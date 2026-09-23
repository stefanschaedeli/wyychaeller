import { describe, expect, it } from "vitest";
import type { PlacedBottleResponse } from "@/shared/api-contract";
import { groupUnplacedByDescription } from "./storage-overview-groups";

function buildPlacement(overrides: Partial<PlacedBottleResponse>): PlacedBottleResponse {
  return {
    id: 1,
    locationId: null,
    rowIndex: null,
    slotIndex: null,
    freeText: null,
    bottleCount: 1,
    locationName: null,
    description: "Lagerort noch offen",
    wineId: 10,
    wineProducer: "Antinori",
    wineName: "Tignanello",
    wineVintage: 2018,
    ...overrides,
  };
}

describe("groupUnplacedByDescription", () => {
  it("drops placements that belong to a storage location", () => {
    const placed = buildPlacement({ id: 2, locationId: 7, description: "Keller" });
    expect(groupUnplacedByDescription([placed])).toEqual([]);
  });

  it("groups placements with the same description and sums their bottles", () => {
    const first = buildPlacement({ id: 1, freeText: "Küche", description: "Küche" });
    const second = buildPlacement({
      id: 2,
      freeText: "Küche",
      description: "Küche",
      bottleCount: 3,
      wineId: 11,
    });
    expect(groupUnplacedByDescription([first, second])).toEqual([
      { description: "Küche", bottleCount: 4, placements: [first, second] },
    ]);
  });

  it("keeps the order in which the descriptions first appear", () => {
    const open = buildPlacement({ id: 1 });
    const kitchen = buildPlacement({ id: 2, freeText: "Küche", description: "Küche" });
    const openAgain = buildPlacement({ id: 3, wineId: 12 });
    const groups = groupUnplacedByDescription([open, kitchen, openAgain]);
    expect(groups.map((group) => group.description)).toEqual(["Lagerort noch offen", "Küche"]);
    expect(groups[0].placements).toEqual([open, openAgain]);
  });

  it("returns no groups when every placement is placed", () => {
    expect(groupUnplacedByDescription([])).toEqual([]);
  });
});
