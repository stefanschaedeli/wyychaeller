import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { placeUnplacedBottles } from "../testing/place-bottles";
import { PlacementChoiceRequiredError, RecordNotFoundError } from "./errors";
import { PlacementRepository } from "./placement-repository";
import { TastingRepository } from "./tasting-repository";
import { WineRepository } from "./wine-repository";

let wineRepository: WineRepository;
let placementRepository: PlacementRepository;
let tastingRepository: TastingRepository;

beforeEach(() => {
  const database = openDatabase(IN_MEMORY_DATABASE);
  wineRepository = new WineRepository(database);
  placementRepository = new PlacementRepository(database);
  tastingRepository = new TastingRepository(database);
});

function createWineWithBottles(bottleCount: number): number {
  const wine = wineRepository.createPendingWine("label.jpg");
  wineRepository.updateWine(wine.id, { name: "Tignanello" });
  placeUnplacedBottles(placementRepository, wine.id, bottleCount);
  return wine.id;
}

describe("TastingRepository", () => {
  it("records a tasting and removes one bottle from the wine's single placement", () => {
    const wineId = createWineWithBottles(6);

    const tasting = tastingRepository.recordTasting({
      wineId,
      tastedOn: "2026-09-19",
      starRating: 4,
      tastingNote: "Dunkle Kirsche",
      occasionOrDish: "Bistecca",
    });

    expect(tasting.starRating).toBe(4);
    expect(wineRepository.findWineById(wineId)?.bottleCount).toBe(5);
    expect(placementRepository.listPlacementsForWine(wineId)[0]?.bottleCount).toBe(5);
  });

  it("deletes the placement row once its bottle count reaches zero", () => {
    const wineId = createWineWithBottles(1);

    tastingRepository.recordTasting({ wineId, tastedOn: "2026-09-19" });

    expect(wineRepository.findWineById(wineId)?.bottleCount).toBe(0);
    expect(placementRepository.listPlacementsForWine(wineId)).toEqual([]);
  });

  it("records a tasting without decrementing when the wine has no placements", () => {
    const wine = wineRepository.createPendingWine("label.jpg");
    wineRepository.updateWine(wine.id, { name: "Tignanello" });

    tastingRepository.recordTasting({ wineId: wine.id, tastedOn: "2026-09-19" });

    expect(wineRepository.findWineById(wine.id)?.bottleCount).toBe(0);
  });

  it("requires a placement choice when the wine has several placements and none was given", () => {
    const wine = wineRepository.createPendingWine("label.jpg");
    placementRepository.replacePlacements(wine.id, [
      { locationId: null, rowIndex: null, slotIndex: null, freeText: "Keller", bottleCount: 2 },
      { locationId: null, rowIndex: null, slotIndex: null, freeText: "Buffet", bottleCount: 3 },
    ]);

    expect(() =>
      tastingRepository.recordTasting({ wineId: wine.id, tastedOn: "2026-09-19" }),
    ).toThrow(PlacementChoiceRequiredError);
  });

  it("decrements the chosen placement when several placements exist", () => {
    const wine = wineRepository.createPendingWine("label.jpg");
    const placements = placementRepository.replacePlacements(wine.id, [
      { locationId: null, rowIndex: null, slotIndex: null, freeText: "Keller", bottleCount: 2 },
      { locationId: null, rowIndex: null, slotIndex: null, freeText: "Buffet", bottleCount: 3 },
    ]);
    const kellerPlacement = placements.find((placement) => placement.freeText === "Keller");

    tastingRepository.recordTasting({
      wineId: wine.id,
      tastedOn: "2026-09-19",
      placementId: kellerPlacement?.id,
    });

    const remaining = placementRepository.listPlacementsForWine(wine.id);
    expect(remaining.find((placement) => placement.freeText === "Keller")?.bottleCount).toBe(1);
    expect(remaining.find((placement) => placement.freeText === "Buffet")?.bottleCount).toBe(3);
    expect(wineRepository.findWineById(wine.id)?.bottleCount).toBe(4);
  });

  it("rejects a placement id that does not belong to the wine", () => {
    const wineId = createWineWithBottles(2);
    const otherWine = wineRepository.createPendingWine("other.jpg");
    const [otherPlacement] = placementRepository.replacePlacements(otherWine.id, [
      { locationId: null, rowIndex: null, slotIndex: null, freeText: null, bottleCount: 1 },
    ]);

    expect(() =>
      tastingRepository.recordTasting({
        wineId,
        tastedOn: "2026-09-19",
        placementId: otherPlacement.id,
      }),
    ).toThrow(RecordNotFoundError);
  });

  it("rejects a tasting for an unknown wine and stores nothing", () => {
    expect(() => tastingRepository.recordTasting({ wineId: 999, tastedOn: "2026-09-19" })).toThrow(
      RecordNotFoundError,
    );
    expect(tastingRepository.listAllTastings()).toEqual([]);
  });

  it("lists the history with wine names, newest first", () => {
    const wineId = createWineWithBottles(3);
    tastingRepository.recordTasting({ wineId, tastedOn: "2026-01-01" });
    tastingRepository.recordTasting({ wineId, tastedOn: "2026-09-19" });

    const history = tastingRepository.listAllTastings();

    expect(history.map((entry) => entry.tastedOn)).toEqual(["2026-09-19", "2026-01-01"]);
    expect(history[0].wineName).toBe("Tignanello");
    expect(tastingRepository.listTastingsForWine(wineId)).toHaveLength(2);
  });
});
