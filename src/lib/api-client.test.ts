import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiClientError } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiClient", () => {
  it("builds list queries from defined values only", async () => {
    const fetchMock = stubFetch(Response.json({ wines: [] }));
    await apiClient.listWines({ search: "tig", wineType: undefined, includeEmpty: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/wines?search=tig&includeEmpty=true");
  });

  it("sends JSON bodies", async () => {
    const fetchMock = stubFetch(Response.json({ wine: { id: 1 } }));
    await apiClient.mergeWine(7);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/wines/7/merge");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({});
  });

  it("turns error responses into ApiClientError with the server code", async () => {
    stubFetch(Response.json({ error: { code: "budgetExceeded", message: "x" } }, { status: 429 }));
    await expect(apiClient.getCellarSummary()).rejects.toMatchObject({
      code: "budgetExceeded",
      status: 429,
    });
  });

  it("reports network failures as offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiClient.getSettings()).rejects.toBeInstanceOf(ApiClientError);
    await expect(apiClient.getSettings()).rejects.toMatchObject({ code: "offline" });
  });

  it("lists storage locations", async () => {
    const fetchMock = stubFetch(Response.json({ locations: [] }));
    await apiClient.listStorageLocations();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/storage-locations");
  });

  it("creates a storage location", async () => {
    const fetchMock = stubFetch(Response.json({ location: { id: 1 } }));
    await apiClient.createStorageLocation({ kind: "simple", name: "Keller" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/storage-locations");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ kind: "simple", name: "Keller" });
  });

  it("updates a storage location", async () => {
    const fetchMock = stubFetch(Response.json({ location: { id: 1 }, convertedPlacementCount: 0 }));
    await apiClient.updateStorageLocation(1, { kind: "simple", name: "Keller" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/storage-locations/1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ kind: "simple", name: "Keller" });
  });

  it("deletes a storage location", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    await apiClient.deleteStorageLocation(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/storage-locations/1");
    expect(init.method).toBe("DELETE");
  });

  it("gets the storage overview", async () => {
    const fetchMock = stubFetch(Response.json({ locations: [], placements: [] }));
    await apiClient.getStorageOverview();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/storage-overview");
  });

  it("saves placements for a wine", async () => {
    const fetchMock = stubFetch(Response.json({ wine: { id: 1 } }));
    const placements = [
      { locationId: 1, rowIndex: null, slotIndex: null, freeText: null, bottleCount: 2 },
    ];
    await apiClient.savePlacements(1, placements);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/wines/1/placements");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ placements });
  });
});
