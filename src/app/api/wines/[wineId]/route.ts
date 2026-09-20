import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { readJsonBody, WineEditSchema } from "@/server/http/request-schemas";
import { getCurrentYear, toTastingResponse, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/errors";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const { wineRepository, tastingRepository } = getServiceContainer();
    const wine = wineRepository.findWineById(wineId);
    if (wine === null) throw new RecordNotFoundError(`Wine ${wineId}`);

    return Response.json({
      wine: toWineResponse(wine, getCurrentYear()),
      tastings: tastingRepository.listTastingsForWine(wineId).map(toTastingResponse),
    });
  });
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const changes = WineEditSchema.parse(await readJsonBody(request));
    const wine = getServiceContainer().wineRepository.updateWine(wineId, changes);
    return Response.json({ wine: toWineResponse(wine, getCurrentYear()) });
  });
}

export async function DELETE(_request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const { wineRepository, photoStorage } = getServiceContainer();
    const wine = wineRepository.findWineById(wineId);
    if (wine !== null) {
      wineRepository.deleteWine(wineId);
      await photoStorage.deleteLabelPhoto(wine.photoFileName);
    }
    return new Response(null, { status: 204 });
  });
}
