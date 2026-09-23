import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { readJsonBody } from "@/server/http/request-schemas";
import { toStorageLocationResponse } from "@/server/http/storage-response";
import { StorageLocationSchema, toLocationShape } from "@/server/http/storage-schemas";
import { createLogger } from "@/server/logging/logger";
import { getServiceContainer } from "@/server/service-container";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ locationId: string }> };

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const locationId = parseRecordId((await context.params).locationId);
    const locationRequest = StorageLocationSchema.parse(await readJsonBody(request));
    const { storageLocationRepository } = getServiceContainer();

    const { location, convertedPlacementCount } = storageLocationRepository.updateLocation(
      locationId,
      toLocationShape(locationRequest),
    );
    const bottleCount =
      storageLocationRepository.listLocations().find((entry) => entry.id === locationId)
        ?.bottleCount ?? 0;
    logger.info("Storage location updated", { locationId, convertedPlacementCount });

    return Response.json({
      location: toStorageLocationResponse(location, bottleCount),
      convertedPlacementCount,
    });
  });
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(request, async () => {
    const locationId = parseRecordId((await context.params).locationId);
    const convertedPlacementCount =
      getServiceContainer().storageLocationRepository.deleteLocation(locationId);
    logger.info("Storage location deleted", { locationId, convertedPlacementCount });
    return new Response(null, { status: 204 });
  });
}
