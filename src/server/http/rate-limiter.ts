/** Sliding-window limiter kept in memory. Enough for a single-container home app. */
export class RateLimiter {
  private readonly requestTimesByKey = new Map<string, number[]>();

  constructor(
    private readonly maximumRequests: number,
    private readonly windowMilliseconds: number,
    private readonly getCurrentTime: () => number = Date.now,
  ) {}

  tryConsume(key: string): boolean {
    const currentTime = this.getCurrentTime();
    const windowStart = currentTime - this.windowMilliseconds;
    const recentRequestTimes = (this.requestTimesByKey.get(key) ?? []).filter(
      (requestTime) => requestTime > windowStart,
    );
    if (recentRequestTimes.length >= this.maximumRequests) {
      this.requestTimesByKey.set(key, recentRequestTimes);
      return false;
    }
    recentRequestTimes.push(currentTime);
    this.requestTimesByKey.set(key, recentRequestTimes);
    return true;
  }
}
