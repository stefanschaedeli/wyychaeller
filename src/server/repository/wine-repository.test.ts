import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { RecordNotFoundError, WineRepository } from "./wine-repository";

let wineRepository: WineRepository;

beforeEach(() => {
  wineRepository = new WineRepository(openDatabase(IN_MEMORY_DATABASE));
});

describe("WineRepository", () => {
  it("creates a pending wine and finds it again", () => {
    const createdWine = wineRepository.createPendingWine("label.jpg");

    expect(createdWine.analysisStatus).toBe("pending");
    expect(wineRepository.findWineById(createdWine.id)?.photoFileName).toBe("label.jpg");
  });

  it("returns null for an unknown wine", () => {
    expect(wineRepository.findWineById(999)).toBeNull();
  });

  it("updates fields and refreshes updatedAt", async () => {
    const createdWine = wineRepository.createPendingWine("label.jpg");
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updatedWine = wineRepository.updateWine(createdWine.id, {
      producer: "Antinori",
      bottleCount: 6,
    });

    expect(updatedWine.producer).toBe("Antinori");
    expect(updatedWine.bottleCount).toBe(6);
    expect(updatedWine.updatedAt.getTime()).toBeGreaterThan(createdWine.updatedAt.getTime());
  });

  it("throws RecordNotFoundError when updating an unknown wine", () => {
    expect(() => wineRepository.updateWine(999, { bottleCount: 1 })).toThrow(RecordNotFoundError);
  });

  it("deletes a wine", () => {
    const createdWine = wineRepository.createPendingWine("label.jpg");
    wineRepository.deleteWine(createdWine.id);
    expect(wineRepository.listWines()).toEqual([]);
  });

  it("finds a complete wine with the same identity, excluding the wine itself", () => {
    const existingWine = wineRepository.createPendingWine("first.jpg");
    wineRepository.updateWine(existingWine.id, {
      producer: "Marchesi Antinori",
      name: "Tignanello",
      vintage: 2018,
      analysisStatus: "complete",
    });
    const newWine = wineRepository.createPendingWine("second.jpg");
    const identity = { producer: "marchesi antinori", name: "TIGNANELLO", vintage: 2018 };

    expect(wineRepository.findCompleteWineByIdentity(identity, newWine.id)?.id).toBe(
      existingWine.id,
    );
    expect(wineRepository.findCompleteWineByIdentity(identity, existingWine.id)).toBeNull();
  });

  it("resets analyses that were interrupted by a restart", () => {
    const interruptedWine = wineRepository.createPendingWine("label.jpg");
    wineRepository.updateWine(interruptedWine.id, { analysisStatus: "analyzing" });

    expect(wineRepository.resetInterruptedAnalyses()).toBe(1);
    expect(wineRepository.findWineById(interruptedWine.id)?.analysisStatus).toBe("pending");
  });
});
