import { ApiError } from "@/server/http/api-error";
import { enforceAiRateLimit } from "@/server/http/ai-rate-limit";
import { handleRoute, parseRecordId } from "@/server/http/handle-route";
import { AnalysisRequestSchema, readJsonBody } from "@/server/http/request-schemas";
import { getCurrentYear, toWineResponse } from "@/server/http/wine-response";
import { RecordNotFoundError } from "@/server/repository/wine-repository";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ wineId: string }> };

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handleRoute(async () => {
    const wineId = parseRecordId((await context.params).wineId);
    const { mode } = AnalysisRequestSchema.parse(await readJsonBody(request));
    const container = getServiceContainer();

    const wine = container.wineRepository.findWineById(wineId);
    if (wine === null) throw new RecordNotFoundError(`Wine ${wineId}`);
    if (wine.analysisStatus === "analyzing") {
      throw new ApiError(409, "analysisRunning", "An analysis is already running");
    }
    const hasIdentity = wine.producer !== null || wine.name !== null;
    if (mode === "researchOnly" && !hasIdentity) {
      throw new ApiError(400, "identityMissing", "Enter producer or name before researching");
    }
    enforceAiRateLimit(container);

    // The status is left untouched here: analyzeWine reads it to know whether the wine
    // was already complete, then sets "analyzing" itself before its first await.
    const preparedWine = container.wineRepository.updateWine(wineId, {
      analysisError: null,
      duplicateOfWineId: null,
    });
    container.backgroundTasks.run(container.wineAnalysisService.analyzeWine(wineId, mode));

    const responseWine = {
      ...toWineResponse(preparedWine, getCurrentYear()),
      analysisStatus: "analyzing" as const,
    };
    return Response.json({ wine: responseWine }, { status: 202 });
  });
}
