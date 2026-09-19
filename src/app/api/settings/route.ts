import type { SettingsResponse } from "@/shared/api-contract";
import { handleRoute } from "@/server/http/handle-route";
import { readJsonBody, SettingsSchema } from "@/server/http/request-schemas";
import { getServiceContainer } from "@/server/service-container";

export const dynamic = "force-dynamic";

function readSettings(): SettingsResponse {
  const { settingsRepository } = getServiceContainer();
  return {
    currency: settingsRepository.getCurrency(),
    monthlyAiCallLimit: settingsRepository.getMonthlyAiCallLimit(),
  };
}

export async function GET(): Promise<Response> {
  return handleRoute(async () => Response.json(readSettings()));
}

export async function PUT(request: Request): Promise<Response> {
  return handleRoute(async () => {
    const newSettings = SettingsSchema.parse(await readJsonBody(request));
    const { settingsRepository } = getServiceContainer();
    settingsRepository.setCurrency(newSettings.currency);
    settingsRepository.setMonthlyAiCallLimit(newSettings.monthlyAiCallLimit);
    return Response.json(readSettings());
  });
}
