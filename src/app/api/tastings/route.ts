import { handleRoute } from "@/server/http/handle-route";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRoute(request, async () => {
    const tastings = getServiceContainer()
      .tastingRepository.listAllTastings()
      .map(({ createdAt: _createdAt, ...publicFields }) => publicFields);
    return Response.json({ tastings });
  });
}
