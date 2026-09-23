import type { StorageOverviewResponse } from "@/shared/api-contract";
import { handleRoute } from "@/server/http/handle-route";
import { toPlacedBottleResponse, toStorageLocationResponse } from "@/server/http/storage-response";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRoute(request, async () => {
    const { storageLocationRepository, placementRepository } = getServiceContainer();

    const responseBody: StorageOverviewResponse = {
      locations: storageLocationRepository
        .listLocations()
        .map((location) => toStorageLocationResponse(location, location.bottleCount)),
      placements: placementRepository
        .listAllPlacements()
        .sort((left, right) => left.id - right.id)
        .map(toPlacedBottleResponse),
    };
    return Response.json(responseBody);
  });
}
