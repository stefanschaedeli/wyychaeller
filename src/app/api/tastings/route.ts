import { handleRoute } from "@/server/http/handle-route";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const tastings = getServiceContainer()
      .tastingRepository.listAllTastings()
      .map(({ createdAt: _createdAt, ...publicFields }) => publicFields);
    return Response.json({ tastings });
  });
}
