import { ApiError } from "@/server/http/api-error";
import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { readJsonBody, WineConfirmationSchema } from "@/server/http/request-schemas";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/wine-repository";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const confirmedFields = WineConfirmationSchema.parse(await readJsonBody(request));
    const { wineRepository } = getServiceContainer();

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

    const confirmedWine = wineRepository.updateWine(wineId, {
      ...confirmedFields,
      analysisStatus: "complete",
    });
    return Response.json({ wine: toWineResponse(confirmedWine, getCurrentYear()) });
  });
}
