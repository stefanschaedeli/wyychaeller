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
    await apiClient.mergeWine(7, 3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/wines/7/merge");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ bottleCount: 3 });
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
});
