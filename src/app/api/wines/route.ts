import { sortByDrinkingUrgency } from "@/domain/drinking-maturity";
import { filterWines } from "@/domain/wine-filter";
import { ApiError } from "@/server/http/api-error";
import { enforceAiRateLimit } from "@/server/http/ai-rate-limit";
import { handleRoute } from "@/server/http/handle-route";
import { WineListQuerySchema } from "@/server/http/request-schemas";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const queryEntries = Object.fromEntries(new URL(request.url).searchParams);
    const query = WineListQuerySchema.parse(queryEntries);
    const currentYear = getCurrentYear();

    const allWines = getServiceContainer().wineRepository.listWines();
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

    return Response.json({ wines: orderedWines.map((wine) => toWineResponse(wine, currentYear)) });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const container = getServiceContainer();
    enforceAiRateLimit(container);
    const formData = await request.formData();
    const photo = formData.get("photo");
    if (!(photo instanceof File)) throw new ApiError(400, "invalidPhoto", "Field photo is missing");

    const photoFileName = await container.photoStorage.storeLabelPhoto(
      Buffer.from(await photo.arrayBuffer()),
    );
    const wine = container.wineRepository.createPendingWine(photoFileName);
    container.backgroundTasks.run(container.wineAnalysisService.analyzeWine(wine.id, "full"));

    return Response.json({ wine: toWineResponse(wine, getCurrentYear()) }, { status: 201 });
  });
}
