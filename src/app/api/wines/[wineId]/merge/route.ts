import { ApiError } from "@/server/http/api-error";
import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { MergeRequestSchema, readJsonBody } from "@/server/http/request-schemas";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/errors";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

/** Adds the bottles of a duplicate capture to the wine that already exists. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(async () => {
    const duplicateWineId = parseRecordId((await context.params).wineId);
    const { bottleCount } = MergeRequestSchema.parse(await readJsonBody(request));
    const { wineRepository, photoStorage } = getServiceContainer();

    const duplicateWine = wineRepository.findWineById(duplicateWineId);
    if (duplicateWine === null) throw new RecordNotFoundError(`Wine ${duplicateWineId}`);
    if (duplicateWine.duplicateOfWineId === null) {
      throw new ApiError(409, "notADuplicate", "This wine is not marked as a duplicate");
    }
    const existingWine = wineRepository.findWineById(duplicateWine.duplicateOfWineId);
    if (existingWine === null) throw new RecordNotFoundError("The original wine");

    const mergedWine = wineRepository.updateWine(existingWine.id, {
      bottleCount: existingWine.bottleCount + bottleCount,
    });
    wineRepository.deleteWine(duplicateWineId);
    await photoStorage.deleteLabelPhoto(duplicateWine.photoFileName);

    return Response.json({ wine: toWineResponse(mergedWine, getCurrentYear()) });
  });
}
