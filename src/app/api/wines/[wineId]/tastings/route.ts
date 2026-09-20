import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { readJsonBody, TastingSchema } from "@/server/http/request-schemas";
import { getCurrentYear, toTastingResponse, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/errors";
import { getServiceContainer } from "@/server/service-container";
import { createLogger } from "@/server/logging/logger";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const tastingFields = TastingSchema.parse(await readJsonBody(request));
    const { tastingRepository, wineRepository } = getServiceContainer();

    const tasting = tastingRepository.recordTasting({ wineId, ...tastingFields });
    const wine = wineRepository.findWineById(wineId);
    if (wine === null) throw new RecordNotFoundError(`Wine ${wineId}`);
    logger.info("Tasting recorded", {
      wineId,
      tastingId: tasting.id,
      bottleCount: wine.bottleCount,
    });

    return Response.json(
      { tasting: toTastingResponse(tasting), wine: toWineResponse(wine, getCurrentYear()) },
      { status: 201 },
    );
  });
}
