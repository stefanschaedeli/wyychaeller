import { summarizeCellar } from "@/domain/cellar-summary";
import type { CellarSummaryResponse } from "@/shared/api-contract";
import { handleRoute } from "@/server/http/handle-route";
import { getCurrentYear } from "@/server/http/wine-response";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handleRoute(async () => {
    const container = getServiceContainer();
    const completeWines = container.wineRepository
      .listWines()
      .filter((wine) => wine.analysisStatus === "complete");
    const usageSummary = container.aiBudgetGuard.getUsageSummary();

    const responseBody: CellarSummaryResponse = {
      ...summarizeCellar(completeWines, getCurrentYear()),
      currency: container.settingsRepository.getCurrency(),
      aiCallsThisMonth: usageSummary.callsThisMonth,
      monthlyAiCallLimit: usageSummary.monthlyLimit,
      isAiConfigured: container.isAiConfigured,
    };
    return Response.json(responseBody);
  });
}
