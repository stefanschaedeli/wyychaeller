import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { readJsonBody } from "@/server/http/request-schemas";
import { PlacementsSchema } from "@/server/http/storage-schemas";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { createLogger } from "@/server/logging/logger";
import { RecordNotFoundError } from "@/server/repository/errors";
import { getServiceContainer } from "@/server/service-container";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

/** Replaces every placement of a wine; allowed in any analysis status. */
export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const { placements } = PlacementsSchema.parse(await readJsonBody(request));
    const { placementRepository, wineRepository } = getServiceContainer();

    const storedPlacements = placementRepository.replacePlacements(wineId, placements);
    const wine = wineRepository.findWineById(wineId);
    if (wine === null) throw new RecordNotFoundError(`Wine ${wineId}`);
    logger.info("Placements replaced", {
      wineId,
      placementCount: storedPlacements.length,
      bottleCount: wine.bottleCount,
    });

    return Response.json({ wine: toWineResponse(wine, getCurrentYear(), storedPlacements) });
  });
}
