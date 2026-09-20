import { ZodError } from "zod";
import type { ApiErrorBody } from "@/shared/api-contract";
import {
  WINE_INTELLIGENCE_ERROR_REASONS,
  type WineIntelligenceErrorReason,
} from "../wine-intelligence/wine-intelligence";
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
// duplication, so every custom error here is recognized by name, not by class,
// and every extra property is read through a guard instead of an `as` cast.
function hasName(error: unknown, name: string): error is Error {
  return error instanceof Error && error.name === name;
}

function readProperty(error: Error, property: string): unknown {
  return (error as unknown as Record<string, unknown>)[property];
}

function readStringProperty(error: Error, property: string): string | null {
  const value = readProperty(error, property);
  return typeof value === "string" ? value : null;
}

function toApiErrorFromForeignApiError(error: Error): ApiError | null {
  const status = readProperty(error, "status");
  const code = readStringProperty(error, "code");
  if (typeof status !== "number" || status < 400 || status > 599 || code === null) return null;
  return new ApiError(status, code, "Request failed");
}

function toApiErrorFromInvalidPhotoError(error: Error): ApiError {
  const reason = readStringProperty(error, "reason");
  return reason === "tooLarge"
    ? new ApiError(413, "photoTooLarge", "The photo is too large")
    : new ApiError(400, "invalidPhoto", "The upload is not a supported image");
}

function isKnownWineIntelligenceErrorReason(
  reason: string | null,
): reason is WineIntelligenceErrorReason {
  return WINE_INTELLIGENCE_ERROR_REASONS.some((knownReason) => knownReason === reason);
}

function toApiErrorFromWineIntelligenceError(error: Error): ApiError | null {
  const reason = readStringProperty(error, "reason");
  if (!isKnownWineIntelligenceErrorReason(reason)) return null;
  const status = reason === "invalidResponse" ? 502 : 503;
  return new ApiError(status, reason, "The AI service could not answer");
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (hasName(error, "ApiError")) {
    return toApiErrorFromForeignApiError(error) ?? logUnexpected(error);
  }
  if (hasName(error, "RecordNotFoundError")) return new ApiError(404, "notFound", error.message);
  if (hasName(error, "AiBudgetExceededError")) {
    return new ApiError(429, "budgetExceeded", error.message);
  }
  if (error instanceof ZodError) {
    const fieldPath = error.issues[0]?.path.join(".") || "request";
    return new ApiError(400, "invalidInput", `Invalid field: ${fieldPath}`);
  }
  if (hasName(error, "InvalidPhotoError")) return toApiErrorFromInvalidPhotoError(error);
  if (hasName(error, "WineIntelligenceError")) {
    return toApiErrorFromWineIntelligenceError(error) ?? logUnexpected(error);
  }
  return logUnexpected(error);
}

function logUnexpected(error: unknown): ApiError {
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
