import type {
  ApiErrorBody,
  CellarSummaryResponse,
  DishRecommendationResponse,
  SettingsResponse,
  TastingHistoryEntry,
  TastingRequest,
  TastingResponse,
  WineConfirmationRequest,
  WineEditRequest,
  WineListQuery,
  WineResponse,
} from "@/shared/api-contract";

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(`API request failed: ${code}`);
    this.name = "ApiClientError";
  }
}

const NO_CONTENT_STATUS = 204;

async function request<ResponseBody>(path: string, init?: RequestInit): Promise<ResponseBody> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiClientError("offline", 0);
  }
  // `src/shared/api-contract.ts` is the source of truth for these response shapes; the
  // two casts below trust the server at this single network boundary rather than
  // re-validating a shape the API routes already guarantee.
  if (response.status === NO_CONTENT_STATUS) return undefined as ResponseBody;

  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const errorCode = (responseBody as ApiErrorBody | null)?.error?.code ?? "unexpected";
    throw new ApiClientError(errorCode, response.status);
  }
  return responseBody as ResponseBody;
}

function sendJson<ResponseBody>(
  path: string,
  method: string,
  body: unknown,
): Promise<ResponseBody> {
  return request<ResponseBody>(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildQueryString(query: WineListQuery): string {
  const searchParameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") searchParameters.set(key, String(value));
  }
  const queryString = searchParameters.toString();
  return queryString === "" ? "" : `?${queryString}`;
}

type WineEnvelope = { wine: WineResponse };

export const apiClient = {
  listWines: (query: WineListQuery) =>
    request<{ wines: WineResponse[] }>(`/api/wines${buildQueryString(query)}`),

  uploadLabelPhoto: (photo: File) => {
    const formData = new FormData();
    formData.set("photo", photo);
    return request<WineEnvelope>("/api/wines", { method: "POST", body: formData });
  },

  getWine: (wineId: number) =>
    request<{ wine: WineResponse; tastings: TastingResponse[] }>(`/api/wines/${wineId}`),

  editWine: (wineId: number, changes: WineEditRequest) =>
    sendJson<WineEnvelope>(`/api/wines/${wineId}`, "PATCH", changes),

  deleteWine: (wineId: number) => request<void>(`/api/wines/${wineId}`, { method: "DELETE" }),

  confirmWine: (wineId: number, fields: WineConfirmationRequest) =>
    sendJson<WineEnvelope>(`/api/wines/${wineId}/confirmation`, "POST", fields),

  mergeWine: (wineId: number) => sendJson<WineEnvelope>(`/api/wines/${wineId}/merge`, "POST", {}),

  startAnalysis: (wineId: number, mode: "full" | "researchOnly") =>
    sendJson<WineEnvelope>(`/api/wines/${wineId}/analysis`, "POST", { mode }),

  recordTasting: (wineId: number, tasting: TastingRequest) =>
    sendJson<WineEnvelope & { tasting: TastingResponse }>(
      `/api/wines/${wineId}/tastings`,
      "POST",
      tasting,
    ),

  listTastings: () => request<{ tastings: TastingHistoryEntry[] }>("/api/tastings"),

  listRecentDishes: () => request<{ recentDishes: string[] }>("/api/dish-recommendations"),

  recommendForDish: (dish: string, shouldForceRefresh: boolean) =>
    sendJson<DishRecommendationResponse>("/api/dish-recommendations", "POST", {
      dish,
      shouldForceRefresh,
    }),

  getCellarSummary: () => request<CellarSummaryResponse>("/api/cellar-summary"),

  getSettings: () => request<SettingsResponse>("/api/settings"),

  saveSettings: (settings: SettingsResponse) =>
    sendJson<SettingsResponse>("/api/settings", "PUT", settings),
};
