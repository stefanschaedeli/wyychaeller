import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limiter";
import { ApiError } from "./api-error";
import { enforceAiRateLimit } from "./ai-rate-limit";

function containerWithLimiter(aiRateLimiter: RateLimiter) {
  return { aiRateLimiter };
}

describe("enforceAiRateLimit", () => {
  it("does not throw while the limiter still allows requests", () => {
    const container = containerWithLimiter(new RateLimiter(1, 60_000));
    expect(() => enforceAiRateLimit(container)).not.toThrow();
  });

  it("throws a 429 ApiError once the limiter is exhausted", () => {
    const limiter = new RateLimiter(1, 60_000);
    limiter.tryConsume("ai");
    const container = containerWithLimiter(limiter);

    try {
      enforceAiRateLimit(container);
      expect.unreachable("enforceAiRateLimit should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(429);
      expect((error as ApiError).code).toBe("rateLimited");
    }
  });
});
