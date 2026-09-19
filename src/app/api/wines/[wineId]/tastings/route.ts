import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { readJsonBody, TastingSchema } from "@/server/http/request-schemas";
import { getCurrentYear, toTastingResponse, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/wine-repository";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const tastingFields = TastingSchema.parse(await readJsonBody(request));
    const { tastingRepository, wineRepository } = getServiceContainer();

    const tasting = tastingRepository.recordTasting({ wineId, ...tastingFields });
    const wine = wineRepository.findWineById(wineId);
    if (wine === null) throw new RecordNotFoundError(`Wine ${wineId}`);

    return Response.json(
      { tasting: toTastingResponse(tasting), wine: toWineResponse(wine, getCurrentYear()) },
      { status: 201 },
    );
  });
}
