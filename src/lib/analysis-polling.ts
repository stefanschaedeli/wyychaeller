import type { WineResponse } from "@/shared/api-contract";

const RUNNING_ANALYSIS_STATUSES = new Set(["pending", "analyzing"]);

/** True while any wine in the list is still being analyzed by the AI. */
export function hasRunningAnalysis(result: { wines: WineResponse[] }): boolean {
  return result.wines.some((wine) => RUNNING_ANALYSIS_STATUSES.has(wine.analysisStatus));
}
