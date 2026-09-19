import { ZodError } from "zod";
import type { ApiErrorBody } from "@/shared/api-contract";
import type { InvalidPhotoReason } from "../photo-storage/photo-storage";
import type { WineIntelligenceErrorReason } from "../wine-intelligence/wine-intelligence";
import { ApiError } from "./api-error";

const RECORD_ID_PATTERN = /^[1-9][0-9]{0,14}$/;

export function parseRecordId(rawId: string): number {
  if (!RECORD_ID_PATTERN.test(rawId)) throw new ApiError(400, "invalidInput", "Invalid id");
  return Number(rawId);
}

// Turbopack production builds can duplicate a class across route chunks (a known
// Next.js issue: https://github.com/vercel/next.js/issues/89192), which breaks
// `instanceof` for our own error classes when the throwing code and this handler
// end up in different chunks. `error.name` is a plain string and survives that
// duplication, so every custom error here is recognized by name, not by class.
function hasName(error: unknown, name: string): error is Error {
  return error instanceof Error && error.name === name;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (hasName(error, "RecordNotFoundError")) return new ApiError(404, "notFound", error.message);
  if (hasName(error, "AiBudgetExceededError")) {
    return new ApiError(429, "budgetExceeded", error.message);
  }
  if (error instanceof ZodError) {
    const fieldPath = error.issues[0]?.path.join(".") || "request";
    return new ApiError(400, "invalidInput", `Invalid field: ${fieldPath}`);
  }
  if (hasName(error, "InvalidPhotoError")) {
    const reason = (error as Error & { reason: InvalidPhotoReason }).reason;
    return reason === "tooLarge"
      ? new ApiError(413, "photoTooLarge", "The photo is too large")
      : new ApiError(400, "invalidPhoto", "The upload is not a supported image");
  }
  if (hasName(error, "WineIntelligenceError")) {
    const reason = (error as Error & { reason: WineIntelligenceErrorReason }).reason;
    const status = reason === "invalidResponse" ? 502 : 503;
    return new ApiError(status, reason, "The AI service could not answer");
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
