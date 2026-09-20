import { describe, expect, it } from "vitest";
import { hasRunningAnalysis } from "./analysis-polling";
import type { AnalysisStatus } from "@/domain/wine-types";
import type { WineResponse } from "@/shared/api-contract";

function buildWine(analysisStatus: AnalysisStatus): WineResponse {
  return { analysisStatus } as WineResponse;
}

describe("hasRunningAnalysis", () => {
  it.each<AnalysisStatus>(["pending", "analyzing"])(
    "returns true when a wine is %s",
    (analysisStatus) => {
      expect(hasRunningAnalysis({ wines: [buildWine(analysisStatus)] })).toBe(true);
    },
  );

  it.each<AnalysisStatus>(["awaitingConfirmation", "complete", "failed"])(
    "returns false when every wine is %s",
    (analysisStatus) => {
      expect(hasRunningAnalysis({ wines: [buildWine(analysisStatus)] })).toBe(false);
    },
  );

  it("returns false for an empty list", () => {
    expect(hasRunningAnalysis({ wines: [] })).toBe(false);
  });
});
