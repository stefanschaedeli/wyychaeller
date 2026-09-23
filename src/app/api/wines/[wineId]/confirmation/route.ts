import { MINIMUM_NEW_BOTTLE_COUNT } from "@/domain/constants";
import { ApiError } from "@/server/http/api-error";
import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { readJsonBody, WineConfirmationSchema } from "@/server/http/request-schemas";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/errors";
import { getServiceContainer } from "@/server/service-container";
import { createLogger } from "@/server/logging/logger";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const confirmedFields = WineConfirmationSchema.parse(await readJsonBody(request));
    const { wineRepository, placementRepository } = getServiceContainer();

    const wine = wineRepository.findWineById(wineId);
    if (wine === null) throw new RecordNotFoundError(`Wine ${wineId}`);
    if (wine.analysisStatus !== "awaitingConfirmation") {
      throw new ApiError(
        409,
        "notAwaitingConfirmation",
        "This wine is not waiting for confirmation",
      );
    }
    if (wine.duplicateOfWineId !== null) {
      throw new ApiError(409, "isDuplicate", "This wine is already in the cellar, use merge");
    }
    // The bottles arrive through the placements route, which runs before confirmation.
    if (wine.bottleCount < MINIMUM_NEW_BOTTLE_COUNT) {
      throw new ApiError(409, "noBottles", "Place at least one bottle before confirming");
    }

    const confirmedWine = wineRepository.updateWine(wineId, {
      ...confirmedFields,
      analysisStatus: "complete",
    });
    logger.info("Wine confirmed and added to the cellar", {
      wineId,
      bottleCount: confirmedWine.bottleCount,
    });
    return Response.json({
      wine: toWineResponse(
        confirmedWine,
        getCurrentYear(),
        placementRepository.listPlacementsForWine(wineId),
      ),
    });
  });
}
