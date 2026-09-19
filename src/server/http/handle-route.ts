import { ZodError } from "zod";
import type { ApiErrorBody } from "@/shared/api-contract";
import { InvalidPhotoError } from "../photo-storage/photo-storage";
import { RecordNotFoundError } from "../repository/wine-repository";
import { AiBudgetExceededError } from "../services/ai-budget-guard";
import { WineIntelligenceError } from "../wine-intelligence/wine-intelligence";
import { ApiError } from "./api-error";

const RECORD_ID_PATTERN = /^[1-9][0-9]{0,14}$/;

export function parseRecordId(rawId: string): number {
  if (!RECORD_ID_PATTERN.test(rawId)) throw new ApiError(400, "invalidInput", "Invalid id");
  return Number(rawId);
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof RecordNotFoundError) return new ApiError(404, "notFound", error.message);
  if (error instanceof AiBudgetExceededError)
    return new ApiError(429, "budgetExceeded", error.message);
  if (error instanceof ZodError) {
    const fieldPath = error.issues[0]?.path.join(".") || "request";
    return new ApiError(400, "invalidInput", `Invalid field: ${fieldPath}`);
  }
  if (error instanceof InvalidPhotoError) {
    return error.reason === "tooLarge"
      ? new ApiError(413, "photoTooLarge", "The photo is too large")
      : new ApiError(400, "invalidPhoto", "The upload is not a supported image");
  }
  if (error instanceof WineIntelligenceError) {
    const status = error.reason === "invalidResponse" ? 502 : 503;
    return new ApiError(status, error.reason, "The AI service could not answer");
  }
  console.error("Unexpected error in API route", error);
  return new ApiError(500, "unexpected", "Something went wrong");
}

/** Wraps every route so all failures become the same safe JSON shape. */
export async function handleRoute(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    const apiError = toApiError(error);
    const body: ApiErrorBody = { error: { code: apiError.code, message: apiError.message } };
    return Response.json(body, { status: apiError.status });
  }
}
