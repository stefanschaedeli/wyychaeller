import { beforeEach, describe, expect, it } from "vitest";
import type { BottlePlacement } from "@/domain/storage-location";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { RecordNotFoundError } from "./errors";
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

describe("StorageLocationRepository", () => {
  it("creates locations with increasing sort order and lists them with bottle counts", () => {
    const first = storageLocationRepository.createLocation({
      name: "Keller",
      kind: "simple",
      rowCount: null,
      slotsPerRow: null,
      slotLabelStyle: null,
    });
    const second = storageLocationRepository.createLocation({
      name: "Weinregal",
      kind: "grid",
      rowCount: 2,
      slotsPerRow: 3,
      slotLabelStyle: "numbered",
    });
    expect(first.sortOrder).toBe(0);
    expect(second.sortOrder).toBe(1);

    const wine = wineRepository.createPendingWine("label.jpg");
    const placement: BottlePlacement = {
      locationId: first.id,
      rowIndex: null,
      slotIndex: null,
      freeText: null,
      bottleCount: 4,
    };
    placementRepository.replacePlacements(wine.id, [placement]);

    const locations = storageLocationRepository.listLocations();
    expect(locations.map((location) => location.name)).toEqual(["Keller", "Weinregal"]);
    expect(locations[0].bottleCount).toBe(4);
    expect(locations[1].bottleCount).toBe(0);
    expect(storageLocationRepository.countLocations()).toBe(2);
    expect(storageLocationRepository.findLocationById(first.id)?.name).toBe("Keller");
    expect(storageLocationRepository.findLocationById(999)).toBeNull();
  });

  it("converts out-of-shape placements to free text when a location shrinks", () => {
    const location = storageLocationRepository.createLocation({
      name: "Weinregal",
      kind: "grid",
      rowCount: 3,
      slotsPerRow: 3,
      slotLabelStyle: "numbered",
    });
    const wine = wineRepository.createPendingWine("label.jpg");
    const placement: BottlePlacement = {
      locationId: location.id,
      rowIndex: 3,
      slotIndex: 2,
      freeText: null,
      bottleCount: 2,
    };
    placementRepository.replacePlacements(wine.id, [placement]);

    const { location: updatedLocation, convertedPlacementCount } =
      storageLocationRepository.updateLocation(location.id, {
        name: "Weinregal",
        kind: "grid",
        rowCount: 1,
        slotsPerRow: 3,
        slotLabelStyle: "numbered",
      });

    expect(updatedLocation.rowCount).toBe(1);
    expect(convertedPlacementCount).toBe(1);
    const [placedBottle] = placementRepository.listPlacementsForWine(wine.id);
    expect(placedBottle.locationId).toBeNull();
    expect(placedBottle.freeText).toBe("Weinregal, Reihe 3, Platz 2");
    expect(placedBottle.bottleCount).toBe(2);
    expect(wineRepository.findWineById(wine.id)?.bottleCount).toBe(2);
  });

  it("throws RecordNotFoundError when updating an unknown location", () => {
    expect(() =>
      storageLocationRepository.updateLocation(999, {
        name: "Nowhere",
        kind: "simple",
        rowCount: null,
        slotsPerRow: null,
        slotLabelStyle: null,
      }),
    ).toThrow(RecordNotFoundError);
  });

  it("converts every placement to free text before deleting a location", () => {
    const location = storageLocationRepository.createLocation({
      name: "Keller",
      kind: "simple",
      rowCount: null,
      slotsPerRow: null,
      slotLabelStyle: null,
    });
    const wine = wineRepository.createPendingWine("label.jpg");
    const placement: BottlePlacement = {
      locationId: location.id,
      rowIndex: null,
      slotIndex: null,
      freeText: null,
      bottleCount: 5,
    };
    placementRepository.replacePlacements(wine.id, [placement]);

    const convertedCount = storageLocationRepository.deleteLocation(location.id);

    expect(convertedCount).toBe(1);
    expect(storageLocationRepository.findLocationById(location.id)).toBeNull();
    const [placedBottle] = placementRepository.listPlacementsForWine(wine.id);
    expect(placedBottle.locationId).toBeNull();
    expect(placedBottle.freeText).toBe("Keller");
    expect(placedBottle.bottleCount).toBe(5);
    expect(wineRepository.findWineById(wine.id)?.bottleCount).toBe(5);
  });

  it("throws RecordNotFoundError when deleting an unknown location", () => {
    expect(() => storageLocationRepository.deleteLocation(999)).toThrow(RecordNotFoundError);
  });

  it("merges a converted placement into an existing free-text placement with the same name", () => {
    const location = storageLocationRepository.createLocation({
      name: "Keller",
      kind: "simple",
      rowCount: null,
      slotsPerRow: null,
      slotLabelStyle: null,
    });
    const wine = wineRepository.createPendingWine("label.jpg");
    const freeTextPlacement: BottlePlacement = {
      locationId: null,
      rowIndex: null,
      slotIndex: null,
      freeText: "Keller",
      bottleCount: 3,
    };
    const locationPlacement: BottlePlacement = {
      locationId: location.id,
      rowIndex: null,
      slotIndex: null,
      freeText: null,
      bottleCount: 5,
    };
    placementRepository.replacePlacements(wine.id, [freeTextPlacement, locationPlacement]);

    const convertedCount = storageLocationRepository.deleteLocation(location.id);

    expect(convertedCount).toBe(1);
    const winePlacements = placementRepository.listPlacementsForWine(wine.id);
    expect(winePlacements).toHaveLength(1);
    expect(winePlacements[0]).toMatchObject({ freeText: "Keller", bottleCount: 8 });
    expect(wineRepository.findWineById(wine.id)?.bottleCount).toBe(8);
  });
});
