import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StorageLocationRecord } from "@/server/database/schema";
import { jsonRequest } from "@/server/testing/json-request";
import { createTestContainer, type TestContainer } from "@/server/testing/test-container";
import { POST as recordTasting } from "./[wineId]/tastings/route";
import {
  BASE_URL,
  describePlacements,
  freeTextPlacement,
  putPlacements,
  routeContext,
  uploadAndConfirm,
  uploadLabel,
} from "./wine-test-helpers";

let testContainer: TestContainer;

function createGridLocation(): StorageLocationRecord {
  return testContainer.container.storageLocationRepository.createLocation({
    name: "Weinschrank",
    kind: "grid",
    rowCount: 3,
    slotsPerRow: 2,
    slotLabelStyle: "leftRight",
  });
}

function tastingRequest(wineId: number, placementId: number | null): Request {
  return jsonRequest(`${BASE_URL}/${wineId}/tastings`, "POST", {
    placementId,
    tastedOn: "2026-09-19",
    starRating: null,
    tastingNote: null,
    occasionOrDish: null,
  });
}

beforeEach(async () => {
  testContainer = await createTestContainer();
});

afterEach(async () => {
  await testContainer.cleanUp();
});

describe("wine placements", () => {
  it("stores a grid position and describes it in the wine response", async () => {
    const wineId = await uploadLabel(testContainer);
    const location = createGridLocation();

    const response = await putPlacements(wineId, [
      { locationId: location.id, rowIndex: 2, slotIndex: 1, freeText: null, bottleCount: 4 },
    ]);

    expect(response.status).toBe(200);
    const { wine } = await response.json();
    expect(wine.bottleCount).toBe(4);
    expect(wine.placements).toHaveLength(1);
    expect(wine.placements[0]).toMatchObject({
      locationId: location.id,
      rowIndex: 2,
      slotIndex: 1,
      locationName: "Weinschrank",
      description: "Weinschrank, Reihe 2, links",
      bottleCount: 4,
    });
  });

  it("rejects a position outside the grid of its storage location", async () => {
    const wineId = await uploadLabel(testContainer);
    const location = createGridLocation();

    const response = await putPlacements(wineId, [
      { locationId: location.id, rowIndex: 9, slotIndex: 1, freeText: null, bottleCount: 4 },
    ]);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalidPlacement");
  });

  it("replaces the placements of a wine that is already in the cellar", async () => {
    const wineId = await uploadAndConfirm(testContainer);

    const response = await putPlacements(wineId, [
      freeTextPlacement("Regal 2", 4),
      freeTextPlacement("Kiste", 2),
    ]);

    expect(response.status).toBe(200);
    const { wine } = await response.json();
    expect(wine.bottleCount).toBe(6);
    expect(describePlacements(wine.placements)).toEqual([
      ["Regal 2", 4],
      ["Kiste", 2],
    ]);
  });

  // Emptying a cellared wine is deliberate: the last bottle can be given away rather than
  // drunk, and the cellar list keeps such wines reachable through its "include empty" filter.
  it("empties a cellared wine when the placement list is empty", async () => {
    const wineId = await uploadAndConfirm(testContainer);

    const response = await putPlacements(wineId, []);

    expect(response.status).toBe(200);
    const { wine } = await response.json();
    expect(wine.bottleCount).toBe(0);
    expect(wine.placements).toEqual([]);
    expect(wine.analysisStatus).toBe("complete");
  });
});

describe("tasting with placements", () => {
  it("takes the bottle from the chosen placement when a wine sits in several", async () => {
    const wineId = await uploadAndConfirm(testContainer);
    const placed = await (
      await putPlacements(wineId, [freeTextPlacement("Regal 2", 6), freeTextPlacement("Kiste", 2)])
    ).json();
    const kistePlacement = placed.wine.placements.find(
      (placement: { description: string }) => placement.description === "Kiste",
    );

    const response = await recordTasting(
      tastingRequest(wineId, kistePlacement.id),
      routeContext(wineId),
    );

    expect(response.status).toBe(201);
    const { wine } = await response.json();
    expect(wine.bottleCount).toBe(7);
    expect(describePlacements(wine.placements)).toEqual([
      ["Regal 2", 6],
      ["Kiste", 1],
    ]);
  });

  it("asks which placement to empty when the wine sits in several", async () => {
    const wineId = await uploadAndConfirm(testContainer);
    await putPlacements(wineId, [freeTextPlacement("Regal 2", 6), freeTextPlacement("Kiste", 2)]);

    const response = await recordTasting(tastingRequest(wineId, null), routeContext(wineId));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("placementRequired");
  });
});
