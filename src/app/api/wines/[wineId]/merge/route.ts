import { MINIMUM_NEW_BOTTLE_COUNT } from "@/domain/constants";
import { ApiError } from "@/server/http/api-error";
import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/errors";
import { getServiceContainer } from "@/server/service-container";
import { createLogger } from "@/server/logging/logger";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

/** Moves the placements of a duplicate capture onto the wine that already exists. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const duplicateWineId = parseRecordId((await context.params).wineId);
    const { wineRepository, placementRepository, photoStorage } = getServiceContainer();

    const duplicateWine = wineRepository.findWineById(duplicateWineId);
    if (duplicateWine === null) throw new RecordNotFoundError(`Wine ${duplicateWineId}`);
    if (duplicateWine.duplicateOfWineId === null) {
      throw new ApiError(409, "notADuplicate", "This wine is not marked as a duplicate");
    }
    const existingWine = wineRepository.findWineById(duplicateWine.duplicateOfWineId);
    if (existingWine === null) throw new RecordNotFoundError("The original wine");
    if (duplicateWine.bottleCount < MINIMUM_NEW_BOTTLE_COUNT) {
      throw new ApiError(409, "noBottles", "Place at least one bottle before merging");
    }

    const mergedWine = placementRepository.mergeDuplicateInto(duplicateWineId, existingWine.id);
    await photoStorage.deleteLabelPhoto(duplicateWine.photoFileName);
    logger.info("Duplicate merged into the existing wine", {
      duplicateWineId,
      wineId: existingWine.id,
      addedBottles: duplicateWine.bottleCount,
      bottleCount: mergedWine.bottleCount,
    });

    return Response.json({
      wine: toWineResponse(
        mergedWine,
        getCurrentYear(),
        placementRepository.listPlacementsForWine(mergedWine.id),
      ),
    });
  });
}
