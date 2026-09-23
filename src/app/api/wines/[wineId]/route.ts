import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { readJsonBody, WineEditSchema } from "@/server/http/request-schemas";
import { getCurrentYear, toTastingResponse, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/errors";
import { getServiceContainer } from "@/server/service-container";
import { createLogger } from "@/server/logging/logger";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const { wineRepository, tastingRepository, placementRepository } = getServiceContainer();
    const wine = wineRepository.findWineById(wineId);
    if (wine === null) throw new RecordNotFoundError(`Wine ${wineId}`);

    return Response.json({
      wine: toWineResponse(
        wine,
        getCurrentYear(),
        placementRepository.listPlacementsForWine(wineId),
      ),
      tastings: tastingRepository.listTastingsForWine(wineId).map(toTastingResponse),
    });
  });
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const changes = WineEditSchema.parse(await readJsonBody(request));
    const { wineRepository, placementRepository } = getServiceContainer();
    const wine = wineRepository.updateWine(wineId, changes);
    logger.info("Wine edited", { wineId, changedFields: Object.keys(changes) });
    return Response.json({
      wine: toWineResponse(
        wine,
        getCurrentYear(),
        placementRepository.listPlacementsForWine(wineId),
      ),
    });
  });
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const { wineRepository, photoStorage } = getServiceContainer();
    const wine = wineRepository.findWineById(wineId);
    if (wine !== null) {
      wineRepository.deleteWine(wineId);
      await photoStorage.deleteLabelPhoto(wine.photoFileName);
      logger.info("Wine deleted", { wineId, producer: wine.producer, name: wine.name });
    }
    return new Response(null, { status: 204 });
  });
}
