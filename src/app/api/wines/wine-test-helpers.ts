import sharp from "sharp";
import { expect } from "vitest";
import { jsonRequest } from "@/server/testing/json-request";
import type { TestContainer } from "@/server/testing/test-container";
import { POST as confirmWine } from "./[wineId]/confirmation/route";
import { PUT as replacePlacements } from "./[wineId]/placements/route";
import { POST as uploadWine } from "./route";

export const BASE_URL = "http://localhost/api/wines";

export const confirmation = {
  producer: "Marchesi Antinori",
  name: "Tignanello",
  vintage: 2018,
  country: "Italien",
  region: "Toskana",
  appellation: "Toscana IGT",
  grapeVarieties: ["Sangiovese"],
  wineType: "red",
  purchasePricePerBottle: 95,
};

export function freeTextPlacement(freeText: string | null, bottleCount: number) {
  return { locationId: null, rowIndex: null, slotIndex: null, freeText, bottleCount };
}

export function routeContext(wineId: number) {
  return { params: Promise.resolve({ wineId: String(wineId) }) };
}

export async function buildLabelUploadRequest(): Promise<Request> {
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

export async function uploadLabel(testContainer: TestContainer): Promise<number> {
  const response = await uploadWine(await buildLabelUploadRequest());
  expect(response.status).toBe(201);
  const { wine } = await response.json();
  await testContainer.container.backgroundTasks.waitUntilIdle();
  return wine.id;
}

export async function putPlacements(wineId: number, placements: unknown[]): Promise<Response> {
  return replacePlacements(
    jsonRequest(`${BASE_URL}/${wineId}/placements`, "PUT", { placements }),
    routeContext(wineId),
  );
}

/** Uploads a label, places its bottles and confirms it into the cellar. */
export async function uploadAndConfirm(
  testContainer: TestContainer,
  bottleCount = 6,
): Promise<number> {
  const wineId = await uploadLabel(testContainer);
  expect((await putPlacements(wineId, [freeTextPlacement("Regal 2", bottleCount)])).status).toBe(
    200,
  );
  const response = await confirmWine(
    jsonRequest(`${BASE_URL}/${wineId}/confirmation`, "POST", confirmation),
    routeContext(wineId),
  );
  expect(response.status).toBe(200);
  return wineId;
}

export function describePlacements(placements: { description: string; bottleCount: number }[]) {
  return placements.map((placement) => [placement.description, placement.bottleCount]);
}
