import type { SettingsResponse } from "@/shared/api-contract";
import { handleRoute } from "@/server/http/handle-route";
import { readJsonBody, SettingsSchema } from "@/server/http/request-schemas";
import { getServiceContainer } from "@/server/service-container";
import { createLogger } from "@/server/logging/logger";

const logger = createLogger("cellar");

export const dynamic = "force-dynamic";

function readSettings(): SettingsResponse {
  const { settingsRepository } = getServiceContainer();
  return {
    currency: settingsRepository.getCurrency(),
    monthlyAiCallLimit: settingsRepository.getMonthlyAiCallLimit(),
  };
}

export async function GET(request: Request): Promise<Response> {
  return handleRoute(request, async () => Response.json(readSettings()));
}

export async function PUT(request: Request): Promise<Response> {
  return handleRoute(request, async () => {
    const newSettings = SettingsSchema.parse(await readJsonBody(request));
    const { settingsRepository } = getServiceContainer();
    settingsRepository.setCurrency(newSettings.currency);
    settingsRepository.setMonthlyAiCallLimit(newSettings.monthlyAiCallLimit);
    logger.info("Settings changed", { ...newSettings });
    return Response.json(readSettings());
  });
}
