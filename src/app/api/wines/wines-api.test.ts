import { readdir } from "node:fs/promises";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AI_REQUESTS_PER_MINUTE } from "@/domain/constants";
import { jsonRequest } from "@/server/testing/json-request";
import { createTestContainer, type TestContainer } from "@/server/testing/test-container";
import { POST as startAnalysis } from "./[wineId]/analysis/route";
import { POST as confirmWine } from "./[wineId]/confirmation/route";
import { POST as mergeWine } from "./[wineId]/merge/route";
import { DELETE as deleteWine, GET as getWine, PATCH as editWine } from "./[wineId]/route";
import { POST as recordTasting } from "./[wineId]/tastings/route";
import { GET as listWines, POST as uploadWine } from "./route";

const BASE_URL = "http://localhost/api/wines";
let testContainer: TestContainer;

const confirmation = {
  producer: "Marchesi Antinori",
  name: "Tignanello",
  vintage: 2018,
  country: "Italien",
  region: "Toskana",
  appellation: "Toscana IGT",
  grapeVarieties: ["Sangiovese"],
  wineType: "red",
  bottleCount: 6,
  storageLocation: "Regal 2, Fach C",
  purchasePricePerBottle: 95,
};

function routeContext(wineId: number) {
  return { params: Promise.resolve({ wineId: String(wineId) }) };
}

async function buildLabelUploadRequest(): Promise<Request> {
  const imageBytes = await sharp({
    create: { width: 60, height: 80, channels: 3, background: "#f6f1e7" },
  })
    .jpeg()
    .toBuffer();
  const formData = new FormData();
  formData.set(
    "photo",
    new File([new Uint8Array(imageBytes)], "label.jpg", { type: "image/jpeg" }),
  );
  return new Request(BASE_URL, { method: "POST", body: formData });
}

async function uploadLabel(): Promise<number> {
  const response = await uploadWine(await buildLabelUploadRequest());
  expect(response.status).toBe(201);
  const { wine } = await response.json();
  await testContainer.container.backgroundTasks.waitUntilIdle();
  return wine.id;
}

async function uploadAndConfirm(): Promise<number> {
  const wineId = await uploadLabel();
  const url = `${BASE_URL}/${wineId}/confirmation`;
  const response = await confirmWine(jsonRequest(url, "POST", confirmation), routeContext(wineId));
  expect(response.status).toBe(200);
  return wineId;
}

beforeEach(async () => {
  testContainer = await createTestContainer();
});

afterEach(async () => {
  await testContainer.cleanUp();
});

describe("wine capture flow", () => {
  it("uploads a label, analyzes it in the background and confirms it", async () => {
    const wineId = await uploadLabel();

    const analyzed = await (await getWine(new Request(BASE_URL), routeContext(wineId))).json();
    expect(analyzed.wine.analysisStatus).toBe("awaitingConfirmation");
    expect(analyzed.wine.photoUrl).toMatch(/^\/api\/photos\/[0-9a-f-]{36}\.jpg$/);
    expect(analyzed.wine).not.toHaveProperty("photoFileName");

    await uploadAndConfirm();
    const listed = await (await listWines(new Request(BASE_URL))).json();
    expect(
      listed.wines.filter((wine: { bottleCount: number }) => wine.bottleCount === 6),
    ).toHaveLength(1);
  });

  it("rejects uploads that are not images without spending the AI rate limit", async () => {
    const formData = new FormData();
    formData.set("photo", new File(["not an image"], "evil.jpg", { type: "image/jpeg" }));
    const response = await uploadWine(new Request(BASE_URL, { method: "POST", body: formData }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("invalidPhoto");

    // A garbage upload never reaches the AI, so it must not drain the shared budget.
    for (let attempt = 0; attempt < AI_REQUESTS_PER_MINUTE; attempt += 1) {
      expect(testContainer.container.aiRateLimiter.tryConsume("ai")).toBe(true);
    }
  });

  it("rejects confirmation with unknown fields or an invalid bottle count", async () => {
    const wineId = await uploadLabel();
    const url = `${BASE_URL}/${wineId}/confirmation`;
    for (const invalidBody of [
      { ...confirmation, bottleCount: 0 },
      { ...confirmation, analysisStatus: "complete" },
    ]) {
      const response = await confirmWine(
        jsonRequest(url, "POST", invalidBody),
        routeContext(wineId),
      );
      expect(response.status).toBe(400);
    }
  });

  it("rejects an upload once the AI rate limit is exhausted, leaving no orphan file", async () => {
    for (let attempt = 0; attempt < AI_REQUESTS_PER_MINUTE; attempt += 1) {
      testContainer.container.aiRateLimiter.tryConsume("ai");
    }

    const response = await uploadWine(await buildLabelUploadRequest());
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("rateLimited");

    expect(await readdir(testContainer.photoDirectory)).toHaveLength(0);
    const listed = await (await listWines(new Request(BASE_URL))).json();
    expect(listed.wines).toHaveLength(0);
  });

  it("offers a merge for duplicates and adds the bottles to the existing wine", async () => {
    const existingWineId = await uploadAndConfirm();
    const duplicateWineId = await uploadLabel();

    const confirmResponse = await confirmWine(
      jsonRequest(`${BASE_URL}/${duplicateWineId}/confirmation`, "POST", confirmation),
      routeContext(duplicateWineId),
    );
    expect((await confirmResponse.json()).error.code).toBe("isDuplicate");

    const mergeResponse = await mergeWine(
      jsonRequest(`${BASE_URL}/${duplicateWineId}/merge`, "POST", { bottleCount: 3 }),
      routeContext(duplicateWineId),
    );
    const merged = await mergeResponse.json();
    expect(merged.wine.id).toBe(existingWineId);
    expect(merged.wine.bottleCount).toBe(9);
    expect((await getWine(new Request(BASE_URL), routeContext(duplicateWineId))).status).toBe(404);
  });
});

describe("wine maintenance", () => {
  it("edits, records a tasting and deletes", async () => {
    const wineId = await uploadAndConfirm();

    const edited = await editWine(
      jsonRequest(`${BASE_URL}/${wineId}`, "PATCH", { storageLocation: "Regal 1" }),
      routeContext(wineId),
    );
    expect((await edited.json()).wine.storageLocation).toBe("Regal 1");

    const tastingResponse = await recordTasting(
      jsonRequest(`${BASE_URL}/${wineId}/tastings`, "POST", {
        tastedOn: "2026-09-19",
        starRating: 5,
        tastingNote: "Grossartig",
        occasionOrDish: null,
      }),
      routeContext(wineId),
    );
    expect(tastingResponse.status).toBe(201);
    expect((await tastingResponse.json()).wine.bottleCount).toBe(5);

    expect((await deleteWine(new Request(BASE_URL), routeContext(wineId))).status).toBe(204);
    expect((await getWine(new Request(BASE_URL), routeContext(wineId))).status).toBe(404);
  });

  it("re-rates a wine on request and refuses unknown ids", async () => {
    const wineId = await uploadAndConfirm();
    const response = await startAnalysis(
      jsonRequest(`${BASE_URL}/${wineId}/analysis`, "POST", { mode: "researchOnly" }),
      routeContext(wineId),
    );
    expect(response.status).toBe(202);

    const invalidContext = { params: Promise.resolve({ wineId: "../etc" }) };
    expect((await getWine(new Request(BASE_URL), invalidContext)).status).toBe(400);
  });

  it("filters the list", async () => {
    await uploadAndConfirm();
    const found = await (await listWines(new Request(`${BASE_URL}?search=tignan`))).json();
    const notFound = await (await listWines(new Request(`${BASE_URL}?wineType=white`))).json();
    expect(found.wines).toHaveLength(1);
    expect(notFound.wines).toHaveLength(0);
    expect((await listWines(new Request(`${BASE_URL}?wineType=beer`))).status).toBe(400);
  });
});
