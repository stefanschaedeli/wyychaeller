import { beforeEach, describe, expect, it } from "vitest";
import type { BottlePlacement } from "@/domain/storage-location";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { InvalidPlacementError, RecordNotFoundError } from "./errors";
import { PlacementRepository } from "./placement-repository";
import { StorageLocationRepository } from "./storage-location-repository";
import { WineRepository } from "./wine-repository";

let wineRepository: WineRepository;
let placementRepository: PlacementRepository;
let storageLocationRepository: StorageLocationRepository;

beforeEach(() => {
  const database = openDatabase(IN_MEMORY_DATABASE);
  wineRepository = new WineRepository(database);
  placementRepository = new PlacementRepository(database);
  storageLocationRepository = new StorageLocationRepository(database);
});

function freeTextPlacement(bottleCount: number, freeText = "Keller"): BottlePlacement {
  return { locationId: null, rowIndex: null, slotIndex: null, freeText, bottleCount };
}

describe("PlacementRepository", () => {
  it("replaces placements, merges duplicates and refreshes the cached bottle count", () => {
    const wine = wineRepository.createPendingWine("label.jpg");

    const result = placementRepository.replacePlacements(wine.id, [
      freeTextPlacement(2, "Keller"),
      freeTextPlacement(1, "Keller"),
      freeTextPlacement(3, "Buffet"),
    ]);

    expect(result).toHaveLength(2);
    const kellerPlacement = result.find((placement) => placement.freeText === "Keller");
    expect(kellerPlacement?.bottleCount).toBe(3);
    expect(wineRepository.findWineById(wine.id)?.bottleCount).toBe(6);
  });

  it("rejects placements for an unknown wine", () => {
    expect(() => placementRepository.replacePlacements(999, [freeTextPlacement(1)])).toThrow(
      RecordNotFoundError,
    );
  });

  it("rejects an inconsistent position (grid indices without a location)", () => {
    const wine = wineRepository.createPendingWine("label.jpg");
    const inconsistent: BottlePlacement = {
      locationId: null,
      rowIndex: 1,
      slotIndex: 1,
      freeText: null,
      bottleCount: 1,
    };
    expect(() => placementRepository.replacePlacements(wine.id, [inconsistent])).toThrow(
      InvalidPlacementError,
    );
  });

  it("rejects a placement referencing an unknown location", () => {
    const wine = wineRepository.createPendingWine("label.jpg");
    const placement: BottlePlacement = {
      locationId: 999,
      rowIndex: null,
      slotIndex: null,
      freeText: null,
      bottleCount: 1,
    };
    expect(() => placementRepository.replacePlacements(wine.id, [placement])).toThrow(
      InvalidPlacementError,
    );
  });

  it("rejects a grid position outside the location's range", () => {
    const wine = wineRepository.createPendingWine("label.jpg");
    const location = storageLocationRepository.createLocation({
      name: "Weinregal",
      kind: "grid",
      rowCount: 2,
      slotsPerRow: 3,
      slotLabelStyle: "numbered",
    });
    const placement: BottlePlacement = {
      locationId: location.id,
      rowIndex: 5,
      slotIndex: 1,
      freeText: null,
      bottleCount: 1,
    };
    expect(() => placementRepository.replacePlacements(wine.id, [placement])).toThrow(
      InvalidPlacementError,
    );
  });

  it("accepts a valid grid position and reports the joined location shape", () => {
    const wine = wineRepository.createPendingWine("label.jpg");
    const location = storageLocationRepository.createLocation({
      name: "Weinregal",
      kind: "grid",
      rowCount: 2,
      slotsPerRow: 3,
      slotLabelStyle: "numbered",
    });
    const placement: BottlePlacement = {
      locationId: location.id,
      rowIndex: 1,
      slotIndex: 2,
      freeText: null,
      bottleCount: 4,
    };

    const [placed] = placementRepository.replacePlacements(wine.id, [placement]);

    expect(placed.location).toMatchObject({ name: "Weinregal", kind: "grid" });
    expect(placementRepository.listPlacementsForWine(wine.id)).toHaveLength(1);
  });

  it("drops non-positive merged placements and clears bottle count to zero", () => {
    const wine = wineRepository.createPendingWine("label.jpg");
    placementRepository.replacePlacements(wine.id, [freeTextPlacement(3)]);

    const result = placementRepository.replacePlacements(wine.id, [
      { ...freeTextPlacement(3), bottleCount: -3 },
    ]);

    expect(result).toEqual([]);
    expect(wineRepository.findWineById(wine.id)?.bottleCount).toBe(0);
  });

  it("lists placements grouped by wine and lists all placed bottles with wine details", () => {
    const firstWine = wineRepository.createPendingWine("first.jpg");
    wineRepository.updateWine(firstWine.id, { name: "Barolo" });
    const secondWine = wineRepository.createPendingWine("second.jpg");
    wineRepository.updateWine(secondWine.id, { name: "Chianti" });
    placementRepository.replacePlacements(firstWine.id, [freeTextPlacement(2)]);
    placementRepository.replacePlacements(secondWine.id, [freeTextPlacement(1)]);

    const byWine = placementRepository.listPlacementsByWine();
    expect(byWine.get(firstWine.id)).toHaveLength(1);
    expect(byWine.get(secondWine.id)).toHaveLength(1);

    const all = placementRepository.listAllPlacements();
    expect(all).toHaveLength(2);
    expect(all.find((entry) => entry.wineId === firstWine.id)?.wineName).toBe("Barolo");
  });

  it("merges a duplicate wine's placements into the existing wine and deletes the duplicate", () => {
    const existingWine = wineRepository.createPendingWine("existing.jpg");
    wineRepository.updateWine(existingWine.id, { name: "Amarone" });
    const duplicateWine = wineRepository.createPendingWine("duplicate.jpg");
    placementRepository.replacePlacements(existingWine.id, [freeTextPlacement(2, "Keller")]);
    placementRepository.replacePlacements(duplicateWine.id, [freeTextPlacement(3, "Keller")]);

    const merged = placementRepository.mergeDuplicateInto(duplicateWine.id, existingWine.id);

    expect(merged.id).toBe(existingWine.id);
    expect(merged.bottleCount).toBe(5);
    expect(placementRepository.listPlacementsForWine(existingWine.id)).toHaveLength(1);
    expect(wineRepository.findWineById(duplicateWine.id)).toBeNull();
  });

  it("keeps both wines' placements apart when they sit in different places", () => {
    const existingWine = wineRepository.createPendingWine("existing.jpg");
    const duplicateWine = wineRepository.createPendingWine("duplicate.jpg");
    placementRepository.replacePlacements(existingWine.id, [freeTextPlacement(6, "Regal 2")]);
    placementRepository.replacePlacements(duplicateWine.id, [freeTextPlacement(3, "Kiste")]);

    const merged = placementRepository.mergeDuplicateInto(duplicateWine.id, existingWine.id);

    expect(merged.bottleCount).toBe(9);
    expect(
      placementRepository
        .listPlacementsForWine(existingWine.id)
        .map((placement) => [placement.freeText, placement.bottleCount]),
    ).toEqual([
      ["Regal 2", 6],
      ["Kiste", 3],
    ]);
  });
});
