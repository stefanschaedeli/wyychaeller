import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { TastingRepository } from "./tasting-repository";
import { RecordNotFoundError, WineRepository } from "./wine-repository";

let wineRepository: WineRepository;
let tastingRepository: TastingRepository;

beforeEach(() => {
  const database = openDatabase(IN_MEMORY_DATABASE);
  wineRepository = new WineRepository(database);
  tastingRepository = new TastingRepository(database);
});

function createWineWithBottles(bottleCount: number): number {
  const wine = wineRepository.createPendingWine("label.jpg");
  wineRepository.updateWine(wine.id, { name: "Tignanello", bottleCount });
  return wine.id;
}

describe("TastingRepository", () => {
  it("records a tasting and removes one bottle", () => {
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
  });

  it("never lets the bottle count fall below zero", () => {
    const wineId = createWineWithBottles(0);
    tastingRepository.recordTasting({ wineId, tastedOn: "2026-09-19" });
    expect(wineRepository.findWineById(wineId)?.bottleCount).toBe(0);
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
