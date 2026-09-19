import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { InvalidPhotoError } from "../photo-storage/photo-storage";
import { RecordNotFoundError } from "../repository/wine-repository";
import { AiBudgetExceededError } from "../services/ai-budget-guard";
import { WineIntelligenceError } from "../wine-intelligence/wine-intelligence";
import { ApiError } from "./api-error";
import { handleRoute, parseRecordId } from "./handle-route";

async function runFailing(error: unknown) {
  const response = await handleRoute(async () => {
    throw error;
  });
  return { status: response.status, body: await response.json() };
}

describe("handleRoute", () => {
  it("passes successful responses through", async () => {
    const response = await handleRoute(async () => Response.json({ ok: true }, { status: 201 }));
    expect(response.status).toBe(201);
  });

  it.each([
    [new ApiError(409, "analysisRunning", "Analysis is already running"), 409, "analysisRunning"],
    [new RecordNotFoundError("Wine 1"), 404, "notFound"],
    [new InvalidPhotoError("tooLarge"), 413, "photoTooLarge"],
    [new InvalidPhotoError("notAnImage"), 400, "invalidPhoto"],
    [new AiBudgetExceededError(), 429, "budgetExceeded"],
    [new WineIntelligenceError("missingApiKey"), 503, "missingApiKey"],
    [new WineIntelligenceError("invalidResponse"), 502, "invalidResponse"],
  ])("maps %o to status %i with code %s", async (error, expectedStatus, expectedCode) => {
    const result = await runFailing(error);
    expect(result.status).toBe(expectedStatus);
    expect(result.body.error.code).toBe(expectedCode);
  });

  it("reports validation problems without echoing values", async () => {
    const validationError = z.object({ bottleCount: z.number() }).safeParse({ bottleCount: "x" });
    const result = await runFailing(validationError.error);
    expect(result.status).toBe(400);
    expect(result.body.error).toEqual({
      code: "invalidInput",
      message: "Invalid field: bottleCount",
    });
  });

  it("hides internal details of unexpected errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await runFailing(new Error("SQLITE_BUSY at /app/secret/path"));
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain("secret");
    consoleSpy.mockRestore();
  });

  // Turbopack production builds can duplicate a class across route chunks
  // (https://github.com/vercel/next.js/issues/89192), so an error thrown from a
  // different chunk can fail `instanceof` even though it is "the same" error type.
  // This simulates that: same name and shape, but not the real class.
  it("recognizes known errors by name, not by class identity", async () => {
    class ForeignInvalidPhotoError extends Error {
      readonly reason = "tooLarge";
      constructor() {
        super("Invalid photo: tooLarge");
        this.name = "InvalidPhotoError";
      }
    }
    const result = await runFailing(new ForeignInvalidPhotoError());
    expect(result.status).toBe(413);
    expect(result.body.error.code).toBe("photoTooLarge");
  });
});

describe("parseRecordId", () => {
  it("accepts positive integers only", () => {
    expect(parseRecordId("42")).toBe(42);
    for (const invalidId of ["0", "-1", "1.5", "abc", "1e3", ""]) {
      expect(() => parseRecordId(invalidId)).toThrow(ApiError);
    }
  });
});
