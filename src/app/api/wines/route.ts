import { sortByDrinkingUrgency } from "@/domain/drinking-maturity";
import { filterWines } from "@/domain/wine-filter";
import { ApiError } from "@/server/http/api-error";
import { enforceAiRateLimit } from "@/server/http/ai-rate-limit";
import { handleRoute } from "@/server/http/handle-route";
import { WineListQuerySchema } from "@/server/http/request-schemas";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { getServiceContainer, type ServiceContainer } from "@/server/service-container";
import { createLogger } from "@/server/logging/logger";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRoute(request, async () => {
    const queryEntries = Object.fromEntries(new URL(request.url).searchParams);
    const query = WineListQuerySchema.parse(queryEntries);
    const currentYear = getCurrentYear();

    const { wineRepository, placementRepository } = getServiceContainer();
    const allWines = wineRepository.listWines();
    const visibleWines = filterWines(
      allWines,
      {
        searchText: query.search,
        wineType: query.wineType,
        maturity: query.maturity,
        shouldIncludeEmpty: query.includeEmpty === "true",
      },
      currentYear,
    );
    // Wines still in the capture flow have no bottles yet but must stay visible.
    const winesInCapture = allWines.filter(
      (wine) => wine.analysisStatus !== "complete" && !visibleWines.includes(wine),
    );
    const hasFilter = Boolean(query.search || query.wineType || query.maturity);
    const combinedWines = hasFilter ? visibleWines : [...winesInCapture, ...visibleWines];
    const orderedWines =
      query.sort === "urgency" ? sortByDrinkingUrgency(combinedWines, currentYear) : combinedWines;

    const placementsByWine = placementRepository.listPlacementsByWine();
    return Response.json({
      wines: orderedWines.map((wine) =>
        toWineResponse(wine, currentYear, placementsByWine.get(wine.id) ?? []),
      ),
    });
  });
}

async function storeUploadedPhoto(container: ServiceContainer, request: Request): Promise<string> {
  const formData = await request.formData();
  const photo = formData.get("photo");
  if (!(photo instanceof File)) throw new ApiError(400, "invalidPhoto", "Field photo is missing");
  return container.photoStorage.storeLabelPhoto(Buffer.from(await photo.arrayBuffer()));
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(request, async () => {
    const container = getServiceContainer();
    // Validate and store the photo before spending an AI rate-limit token, so a
    // garbage upload never blocks a real analysis request. If the limit is then
    // exhausted, remove the photo we just stored so no orphan file is left behind.
    const photoFileName = await storeUploadedPhoto(container, request);
    try {
      enforceAiRateLimit(container);
    } catch (error) {
      await container.photoStorage.deleteLabelPhoto(photoFileName);
      throw error;
    }

    const wine = container.wineRepository.createPendingWine(photoFileName);
    logger.info("Wine captured, analysis queued", { wineId: wine.id, photoFileName });
    container.backgroundTasks.run(container.wineAnalysisService.analyzeWine(wine.id, "full"));

    // A freshly captured wine has no placements yet; they are set after confirmation.
    return Response.json({ wine: toWineResponse(wine, getCurrentYear(), []) }, { status: 201 });
  });
}
