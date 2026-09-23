import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAXIMUM_STORAGE_LOCATIONS } from "@/domain/constants";
import { getRequest, jsonRequest } from "@/server/testing/json-request";
import { placeUnplacedBottles } from "@/server/testing/place-bottles";
import { createTestContainer, type TestContainer } from "@/server/testing/test-container";
import { PUT as replacePlacements } from "../wines/[wineId]/placements/route";
import { GET as getOverview } from "../storage-overview/route";
import { DELETE as deleteLocation, PUT as updateLocation } from "./[locationId]/route";
import { GET as listLocations, POST as createLocation } from "./route";

const BASE_URL = "http://localhost/api/storage-locations";
let testContainer: TestContainer;

const gridLocation = {
  kind: "grid",
  name: "Weinschrank",
  rowCount: 3,
  slotsPerRow: 2,
  slotLabelStyle: "leftRight",
};

function locationContext(locationId: number) {
  return { params: Promise.resolve({ locationId: String(locationId) }) };
}

async function postLocation(body: unknown): Promise<Response> {
  return createLocation(jsonRequest(BASE_URL, "POST", body));
}

async function createGridLocation(): Promise<number> {
  const response = await postLocation(gridLocation);
  expect(response.status).toBe(201);
  return (await response.json()).location.id;
}

/** Puts `bottleCount` bottles of a fresh wine into one grid slot of the location. */
async function placeWineInGrid(locationId: number, bottleCount: number): Promise<number> {
  const wine = testContainer.container.wineRepository.createPendingWine("label.jpg");
  const response = await replacePlacements(
    jsonRequest(`http://localhost/api/wines/${wine.id}/placements`, "PUT", {
      placements: [{ locationId, rowIndex: 3, slotIndex: 2, freeText: null, bottleCount }],
    }),
    { params: Promise.resolve({ wineId: String(wine.id) }) },
  );
  expect(response.status).toBe(200);
  return wine.id;
}

beforeEach(async () => {
  testContainer = await createTestContainer();
});

afterEach(async () => {
  await testContainer.cleanUp();
});

describe("storage locations", () => {
  it("creates, lists and updates a storage location", async () => {
    const locationId = await createGridLocation();

    const listed = await (await listLocations(getRequest("/api/storage-locations"))).json();
    expect(listed.locations).toEqual([
      {
        id: locationId,
        name: "Weinschrank",
        kind: "grid",
        rowCount: 3,
        slotsPerRow: 2,
        slotLabelStyle: "leftRight",
        bottleCount: 0,
      },
    ]);

    const updated = await updateLocation(
      jsonRequest(`${BASE_URL}/${locationId}`, "PUT", { kind: "simple", name: "Keller" }),
      locationContext(locationId),
    );
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      location: { id: locationId, name: "Keller", kind: "simple", rowCount: null },
      convertedPlacementCount: 0,
    });
  });

  it("rejects a slot count that does not match the label style", async () => {
    const response = await postLocation({ ...gridLocation, slotsPerRow: 4 });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalidInput");
  });

  it("rejects a location without a name", async () => {
    const response = await postLocation({ kind: "simple", name: "  " });
    expect(response.status).toBe(400);
  });

  it("reports how many placements a shrunk grid converted to free text", async () => {
    const locationId = await createGridLocation();
    await placeWineInGrid(locationId, 4);

    const response = await updateLocation(
      jsonRequest(`${BASE_URL}/${locationId}`, "PUT", { ...gridLocation, rowCount: 1 }),
      locationContext(locationId),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.convertedPlacementCount).toBe(1);
    expect(body.location).toMatchObject({ rowCount: 1, bottleCount: 0 });
  });

  it("keeps the bottles in the overview as free text after deleting a location", async () => {
    const locationId = await createGridLocation();
    await placeWineInGrid(locationId, 4);

    const deleted = await deleteLocation(
      new Request(`${BASE_URL}/${locationId}`, { method: "DELETE" }),
      locationContext(locationId),
    );
    expect(deleted.status).toBe(204);

    const overview = await (await getOverview(getRequest("/api/storage-overview"))).json();
    expect(overview.locations).toEqual([]);
    expect(overview.placements).toHaveLength(1);
    expect(overview.placements[0]).toMatchObject({
      locationId: null,
      locationName: null,
      description: "Weinschrank, Reihe 3, rechts",
      bottleCount: 4,
    });
  });

  it("reports 404 when updating or deleting an unknown location", async () => {
    const updated = await updateLocation(
      jsonRequest(`${BASE_URL}/999`, "PUT", { kind: "simple", name: "Keller" }),
      locationContext(999),
    );
    const deleted = await deleteLocation(
      new Request(`${BASE_URL}/999`, { method: "DELETE" }),
      locationContext(999),
    );

    expect(updated.status).toBe(404);
    expect(deleted.status).toBe(404);
  });

  it("refuses to create more locations than the cellar allows", async () => {
    const { storageLocationRepository } = testContainer.container;
    for (let index = 0; index < MAXIMUM_STORAGE_LOCATIONS; index += 1) {
      storageLocationRepository.createLocation({
        name: `Regal ${index}`,
        kind: "simple",
        rowCount: null,
        slotsPerRow: null,
        slotLabelStyle: null,
      });
    }

    const response = await postLocation({ kind: "simple", name: "Eines zu viel" });

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("tooManyLocations");
  });
});

describe("storage overview", () => {
  it("lists every location with its bottle count and every placed bottle with its wine", async () => {
    const locationId = await createGridLocation();
    const wineId = await placeWineInGrid(locationId, 4);
    testContainer.container.wineRepository.updateWine(wineId, {
      producer: "Antinori",
      name: "Tignanello",
      vintage: 2018,
    });
    const unplacedWine = testContainer.container.wineRepository.createPendingWine("other.jpg");
    placeUnplacedBottles(testContainer.container.placementRepository, unplacedWine.id, 2);

    const overview = await (await getOverview(getRequest("/api/storage-overview"))).json();

    expect(overview.locations).toEqual([
      {
        id: locationId,
        name: "Weinschrank",
        kind: "grid",
        rowCount: 3,
        slotsPerRow: 2,
        slotLabelStyle: "leftRight",
        bottleCount: 4,
      },
    ]);
    expect(overview.placements).toHaveLength(2);
    expect(overview.placements[0]).toMatchObject({
      wineId,
      wineProducer: "Antinori",
      wineName: "Tignanello",
      wineVintage: 2018,
      locationName: "Weinschrank",
      description: "Weinschrank, Reihe 3, rechts",
    });
    expect(overview.placements[1]).toMatchObject({
      wineId: unplacedWine.id,
      description: "Lagerort noch offen",
      bottleCount: 2,
    });
  });
});
