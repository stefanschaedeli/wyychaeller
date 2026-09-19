import { createHash } from "node:crypto";

export interface FingerprintableWine {
  id: number;
  bottleCount: number;
  analyzedAt: Date | null;
}

/** Same fingerprint means a stored dish recommendation is still valid. */
export function buildCellarFingerprint(wines: FingerprintableWine[]): string {
  const stateLines = wines
    .filter((wine) => wine.bottleCount > 0)
    .map((wine) => `${wine.id}:${wine.bottleCount}:${wine.analyzedAt?.getTime() ?? 0}`)
    .sort();

  return createHash("sha256").update(stateLines.join("\n")).digest("hex");
}
