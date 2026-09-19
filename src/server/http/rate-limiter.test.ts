import { describe, expect, it } from "vitest";
import { RateLimiter } from "./rate-limiter";

describe("RateLimiter", () => {
  it("allows a fixed number of requests per window and recovers afterwards", () => {
    let currentTime = 1_000;
    const limiter = new RateLimiter(2, 60_000, () => currentTime);

    expect(limiter.tryConsume("ai")).toBe(true);
    expect(limiter.tryConsume("ai")).toBe(true);
    expect(limiter.tryConsume("ai")).toBe(false);
    expect(limiter.tryConsume("other")).toBe(true);

    currentTime += 60_001;
    expect(limiter.tryConsume("ai")).toBe(true);
  });
});
