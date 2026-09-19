import type { ServiceContainer } from "../service-container";
import { ApiError } from "./api-error";

const AI_RATE_LIMIT_KEY = "ai";

/** Shared by every route that triggers an AI call, so the limit applies across all of them. */
export function enforceAiRateLimit(container: ServiceContainer): void {
  if (!container.aiRateLimiter.tryConsume(AI_RATE_LIMIT_KEY)) {
    throw new ApiError(429, "rateLimited", "Too many AI requests, try again in a minute");
  }
}
