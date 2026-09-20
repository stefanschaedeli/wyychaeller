import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { jsonRequest } from "@/server/testing/json-request";
import { createTestContainer, type TestContainer } from "@/server/testing/test-container";
import { GET as getSummary } from "./cellar-summary/route";
import { GET as listRecentDishes, POST as recommend } from "./dish-recommendations/route";
import { GET as getPhoto } from "./photos/[fileName]/route";
import { GET as getSettings, PUT as saveSettings } from "./settings/route";
import { GET as listTastings } from "./tastings/route";

let testContainer: TestContainer;

function addCompleteWine(): number {
  const { wineRepository } = testContainer.container;
  const wine = wineRepository.createPendingWine("unused.jpg");
  wineRepository.updateWine(wine.id, {
    name: "Tignanello",
    bottleCount: 6,
    purchasePricePerBottle: 95,
    estimatedMarketValue: 140,
    drinkFromYear: 2023,
    drinkUntilYear: 2038,
    analysisStatus: "complete",
  });
  return wine.id;
}

beforeEach(async () => {
  testContainer = await createTestContainer();
});

afterEach(async () => {
  await testContainer.cleanUp();
});

describe("photos", () => {
  it("serves stored photos as immutable JPEG", async () => {
    const imageBytes = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#ffffff" },
    })
      .jpeg()
      .toBuffer();
    const fileName = await testContainer.container.photoStorage.storeLabelPhoto(imageBytes);

    const response = await getPhoto(new Request("http://localhost"), {
      params: Promise.resolve({ fileName }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toContain("immutable");
  });

  it("refuses path traversal and reports missing files", async () => {
    const traversal = await getPhoto(new Request("http://localhost"), {
      params: Promise.resolve({ fileName: "../weinkeller.db" }),
    });
    // Next.js decodes route params before the handler ever sees them, so this call
    // exercises the name guard on both the raw and the already-decoded form; real
    // URL decoding of an incoming request is covered by the production curl smoke check.
    const encodedTraversal = await getPhoto(new Request("http://localhost"), {
      params: Promise.resolve({ fileName: "..%2Fweinkeller.db" }),
    });
    const missing = await getPhoto(new Request("http://localhost"), {
      params: Promise.resolve({ fileName: "00000000-0000-0000-0000-000000000000.jpg" }),
    });
    expect(traversal.status).toBe(400);
    expect(encodedTraversal.status).toBe(400);
    expect(missing.status).toBe(404);
  });
});

describe("dish recommendations", () => {
  it("recommends from the cellar and remembers the dish", async () => {
    addCompleteWine();
    const url = "http://localhost/api/dish-recommendations";

    const first = await (await recommend(jsonRequest(url, "POST", { dish: "Rindsfilet" }))).json();
    const second = await (await recommend(jsonRequest(url, "POST", { dish: "Rindsfilet" }))).json();

    expect(first.recommendations[0].wine.name).toBe("Tignanello");
    expect(first.isFromCache).toBe(false);
    expect(second.isFromCache).toBe(true);
    expect((await (await listRecentDishes()).json()).recentDishes).toEqual(["Rindsfilet"]);
  });

  it("rejects empty dishes", async () => {
    const response = await recommend(
      jsonRequest("http://localhost/api/dish-recommendations", "POST", { dish: " " }),
    );
    expect(response.status).toBe(400);
  });
});

describe("summary, history and settings", () => {
  it("summarizes the cellar including AI usage", async () => {
    addCompleteWine();
    const summary = await (await getSummary()).json();
    expect(summary).toMatchObject({
      wineCount: 1,
      bottleCount: 6,
      purchaseValue: 570,
      estimatedMarketValue: 840,
      currency: "CHF",
      aiCallsThisMonth: 0,
      monthlyAiCallLimit: 300,
      isAiConfigured: true,
    });
  });

  it("lists the tasting history", async () => {
    const wineId = addCompleteWine();
    testContainer.container.tastingRepository.recordTasting({ wineId, tastedOn: "2026-09-19" });
    const history = await (await listTastings()).json();
    expect(history.tastings[0]).toMatchObject({ wineName: "Tignanello", tastedOn: "2026-09-19" });
  });

  it("reads and validates settings", async () => {
    const url = "http://localhost/api/settings";
    const saved = await saveSettings(
      jsonRequest(url, "PUT", { currency: "EUR", monthlyAiCallLimit: 50 }),
    );
    expect(await saved.json()).toEqual({ currency: "EUR", monthlyAiCallLimit: 50 });
    expect(await (await getSettings()).json()).toEqual({ currency: "EUR", monthlyAiCallLimit: 50 });

    const invalid = await saveSettings(
      jsonRequest(url, "PUT", { currency: "euro", monthlyAiCallLimit: 0 }),
    );
    expect(invalid.status).toBe(400);
  });
});
