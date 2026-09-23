import { readdir } from "node:fs/promises";
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
import {
  BASE_URL,
  buildLabelUploadRequest,
  confirmation,
  describePlacements,
  freeTextPlacement,
  putPlacements,
  routeContext,
  uploadAndConfirm,
  uploadLabel,
} from "./wine-test-helpers";

let testContainer: TestContainer;

beforeEach(async () => {
  testContainer = await createTestContainer();
});

afterEach(async () => {
  await testContainer.cleanUp();
});

describe("wine capture flow", () => {
  it("uploads a label, analyzes it in the background and confirms it", async () => {
    const wineId = await uploadLabel(testContainer);

    const analyzed = await (await getWine(new Request(BASE_URL), routeContext(wineId))).json();
    expect(analyzed.wine.analysisStatus).toBe("awaitingConfirmation");
    expect(analyzed.wine.photoUrl).toMatch(/^\/api\/photos\/[0-9a-f-]{36}\.jpg$/);
    expect(analyzed.wine).not.toHaveProperty("photoFileName");
    expect(analyzed.wine).not.toHaveProperty("storageLocation");
    expect(analyzed.wine.placements).toEqual([]);

    await uploadAndConfirm(testContainer);
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

  it("rejects confirmation with unknown fields", async () => {
    const wineId = await uploadLabel(testContainer);
    const response = await confirmWine(
      jsonRequest(`${BASE_URL}/${wineId}/confirmation`, "POST", {
        ...confirmation,
        analysisStatus: "complete",
      }),
      routeContext(wineId),
    );
    expect(response.status).toBe(400);
  });

  it("refuses to confirm a wine that has no bottles placed", async () => {
    const wineId = await uploadLabel(testContainer);

    const response = await confirmWine(
      jsonRequest(`${BASE_URL}/${wineId}/confirmation`, "POST", confirmation),
      routeContext(wineId),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("noBottles");
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

  it("offers a merge for duplicates and moves the placements to the existing wine", async () => {
    const existingWineId = await uploadAndConfirm(testContainer);
    const duplicateWineId = await uploadLabel(testContainer);
    await putPlacements(duplicateWineId, [freeTextPlacement("Kiste", 3)]);

    const confirmResponse = await confirmWine(
      jsonRequest(`${BASE_URL}/${duplicateWineId}/confirmation`, "POST", confirmation),
      routeContext(duplicateWineId),
    );
    expect((await confirmResponse.json()).error.code).toBe("isDuplicate");

    const mergeResponse = await mergeWine(
      new Request(`${BASE_URL}/${duplicateWineId}/merge`, { method: "POST" }),
      routeContext(duplicateWineId),
    );
    const merged = await mergeResponse.json();
    expect(merged.wine.id).toBe(existingWineId);
    expect(merged.wine.bottleCount).toBe(9);
    expect(describePlacements(merged.wine.placements)).toEqual([
      ["Regal 2", 6],
      ["Kiste", 3],
    ]);
    expect((await getWine(new Request(BASE_URL), routeContext(duplicateWineId))).status).toBe(404);
  });

  it("refuses to merge a duplicate that has no bottles placed", async () => {
    await uploadAndConfirm(testContainer);
    const duplicateWineId = await uploadLabel(testContainer);

    const response = await mergeWine(
      new Request(`${BASE_URL}/${duplicateWineId}/merge`, { method: "POST" }),
      routeContext(duplicateWineId),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("noBottles");
  });
});

describe("wine maintenance", () => {
  it("edits, records a tasting and deletes", async () => {
    const wineId = await uploadAndConfirm(testContainer);

    const edited = await editWine(
      jsonRequest(`${BASE_URL}/${wineId}`, "PATCH", { purchasePricePerBottle: 110 }),
      routeContext(wineId),
    );
    expect((await edited.json()).wine.purchasePricePerBottle).toBe(110);

    const tastingResponse = await recordTasting(
      jsonRequest(`${BASE_URL}/${wineId}/tastings`, "POST", {
        placementId: null,
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
    const wineId = await uploadAndConfirm(testContainer);
    const response = await startAnalysis(
      jsonRequest(`${BASE_URL}/${wineId}/analysis`, "POST", { mode: "researchOnly" }),
      routeContext(wineId),
    );
    expect(response.status).toBe(202);

    const invalidContext = { params: Promise.resolve({ wineId: "../etc" }) };
    expect((await getWine(new Request(BASE_URL), invalidContext)).status).toBe(400);
  });

  it("filters the list", async () => {
    await uploadAndConfirm(testContainer);
    const found = await (await listWines(new Request(`${BASE_URL}?search=tignan`))).json();
    const notFound = await (await listWines(new Request(`${BASE_URL}?wineType=white`))).json();
    expect(found.wines).toHaveLength(1);
    expect(notFound.wines).toHaveLength(0);
    expect((await listWines(new Request(`${BASE_URL}?wineType=beer`))).status).toBe(400);
  });
});
