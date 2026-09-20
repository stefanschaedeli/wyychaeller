import { handleRoute } from "@/server/http/handle-route";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleRoute(request, async () => Response.json({ status: "ok" }));
}
