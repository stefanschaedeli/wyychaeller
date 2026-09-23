import { MAXIMUM_STORAGE_LOCATIONS } from "@/domain/constants";
import { ApiError } from "@/server/http/api-error";
import { handleRoute } from "@/server/http/handle-route";
import { readJsonBody } from "@/server/http/request-schemas";
import { toStorageLocationResponse } from "@/server/http/storage-response";
import { StorageLocationSchema, toLocationShape } from "@/server/http/storage-schemas";
import { createLogger } from "@/server/logging/logger";
import { getServiceContainer } from "@/server/service-container";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRoute(request, async () => {
    const locations = getServiceContainer().storageLocationRepository.listLocations();
    return Response.json({
      locations: locations.map((location) =>
        toStorageLocationResponse(location, location.bottleCount),
      ),
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleRoute(request, async () => {
    const locationRequest = StorageLocationSchema.parse(await readJsonBody(request));
    const { storageLocationRepository } = getServiceContainer();

    if (storageLocationRepository.countLocations() >= MAXIMUM_STORAGE_LOCATIONS) {
      throw new ApiError(409, "tooManyLocations", "The cellar already has too many locations");
    }

    const location = storageLocationRepository.createLocation(toLocationShape(locationRequest));
    logger.info("Storage location created", { locationId: location.id, name: location.name });
    return Response.json({ location: toStorageLocationResponse(location, 0) }, { status: 201 });
  });
}
