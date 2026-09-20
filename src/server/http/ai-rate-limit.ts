import type { ServiceContainer } from "../service-container";
import { createLogger } from "../logging/logger";
import { ApiError } from "./api-error";

const logger = createLogger("budget");

const AI_RATE_LIMIT_KEY = "ai";

/** Shared by every route that triggers an AI call, so the limit applies across all of them. */
export function enforceAiRateLimit(container: Pick<ServiceContainer, "aiRateLimiter">): void {
  if (!container.aiRateLimiter.tryConsume(AI_RATE_LIMIT_KEY)) {
    logger.warn("AI request refused by the per-minute rate limit");
    throw new ApiError(429, "rateLimited", "Too many AI requests, try again in a minute");
  }
}
