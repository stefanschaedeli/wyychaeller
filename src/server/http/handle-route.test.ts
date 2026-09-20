import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { InvalidPhotoError } from "../photo-storage/photo-storage";
import { RecordNotFoundError } from "../repository/errors";
import { AiBudgetExceededError } from "../services/ai-budget-guard";
import { WineIntelligenceError } from "../wine-intelligence/wine-intelligence";
import { ApiError } from "./api-error";
import { resetLogging } from "../logging/logger";
import { captureLogLines } from "../testing/capture-log";
import { handleRoute, parseRecordId } from "./handle-route";

function createRequest(path = "/api/wines", method = "GET"): Request {
  return new Request(`http://localhost${path}?dish=secret-query`, { method });
}

async function runFailing(error: unknown) {
  const response = await handleRoute(createRequest(), async () => {
    throw error;
  });
  return { status: response.status, body: await response.json() };
}

describe("handleRoute", () => {
  it("passes successful responses through", async () => {
    const response = await handleRoute(createRequest(), async () =>
      Response.json({ ok: true }, { status: 201 }),
    );
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
    const result = await runFailing(new Error("SQLITE_BUSY at /app/secret/path"));
    expect(result.status).toBe(500);
    expect(JSON.stringify(result.body)).not.toContain("secret");
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

  it("recognizes a foreign ApiError by name when it carries a valid status and code", async () => {
    class ForeignApiError extends Error {
      readonly status = 409;
      readonly code = "analysisRunning";
      constructor() {
        super("Analysis is already running");
        this.name = "ApiError";
      }
    }
    const result = await runFailing(new ForeignApiError());
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("analysisRunning");
  });

  it("never forwards a foreign ApiError's message to the response body", async () => {
    class ForeignApiError extends Error {
      readonly status = 409;
      readonly code = "analysisRunning";
      constructor() {
        super("/app/secret/path");
        this.name = "ApiError";
      }
    }
    const result = await runFailing(new ForeignApiError());
    expect(result.status).toBe(409);
    expect(JSON.stringify(result.body)).not.toContain("secret");
  });

  it("falls back to 500 unexpected for a foreign ApiError with a malformed status", async () => {
    class ForeignApiError extends Error {
      readonly status = "not-a-number";
      readonly code = "analysisRunning";
      constructor() {
        super("Analysis is already running");
        this.name = "ApiError";
      }
    }
    const result = await runFailing(new ForeignApiError());
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("unexpected");
  });

  it("recognizes a foreign WineIntelligenceError by name with a known reason", async () => {
    class ForeignWineIntelligenceError extends Error {
      readonly reason = "invalidResponse";
      constructor() {
        super("Wine intelligence failed: invalidResponse");
        this.name = "WineIntelligenceError";
      }
    }
    const result = await runFailing(new ForeignWineIntelligenceError());
    expect(result.status).toBe(502);
    expect(result.body.error.code).toBe("invalidResponse");
  });

  it("falls back to 500 unexpected for a foreign WineIntelligenceError with an unknown reason", async () => {
    class ForeignWineIntelligenceError extends Error {
      readonly reason = "somethingMadeUp";
      constructor() {
        super("Wine intelligence failed: somethingMadeUp");
        this.name = "WineIntelligenceError";
      }
    }
    const result = await runFailing(new ForeignWineIntelligenceError());
    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("unexpected");
  });
});

describe("handleRoute request log", () => {
  afterEach(() => resetLogging());

  it("logs method, path, status and duration without the query string", async () => {
    const lines = captureLogLines();
    await handleRoute(createRequest("/api/wines", "POST"), async () =>
      Response.json({}, { status: 201 }),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/INFO {2}\[http\] POST \/api\/wines status=201 durationMs=\d+$/);
  });

  it("logs client errors as warnings with their code", async () => {
    const lines = captureLogLines();
    await runFailing(new RecordNotFoundError("Wine 1"));
    expect(lines[0]).toMatch(
      /WARN {2}\[http\] GET \/api\/wines status=404 durationMs=\d+ code=notFound$/,
    );
  });

  it("logs unexpected failures as errors, with the cause on its own line", async () => {
    const lines = captureLogLines();
    await runFailing(new Error("SQLITE_BUSY"));
    expect(lines[0]).toContain("ERROR [http] Unexpected error in API route");
    expect(lines[0]).toContain("SQLITE_BUSY");
    expect(lines[1]).toMatch(/ERROR \[http\] GET \/api\/wines status=500/);
  });

  it.each(["/api/health", "/api/photos/abc.jpg"])(
    "keeps successful %s requests out of the info log",
    async (path) => {
      const infoLines = captureLogLines("info");
      await handleRoute(createRequest(path), async () => Response.json({}));
      expect(infoLines).toEqual([]);

      const debugLines = captureLogLines("debug");
      await handleRoute(createRequest(path), async () => Response.json({}));
      expect(debugLines[0]).toContain(`DEBUG [http] GET ${path} status=200`);
    },
  );
});

describe("parseRecordId", () => {
  it("accepts positive integers only", () => {
    expect(parseRecordId("42")).toBe(42);
    for (const invalidId of ["0", "-1", "1.5", "abc", "1e3", ""]) {
      expect(() => parseRecordId(invalidId)).toThrow(ApiError);
    }
  });
});
