# Weinkeller Part 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable walking skeleton (Next.js in Docker with health check) plus the domain logic, database, repositories and photo storage that every later part builds on.

**Architecture:** One Next.js 16 App Router application in one container. Pure domain functions in `src/domain`, all database access in `src/server/repository`, SQLite file and photos in one mounted data directory.

**Tech Stack:** Next.js 16, React 19, TypeScript (strict), Tailwind CSS 4, Drizzle ORM + better-sqlite3, Zod, sharp, Vitest, ESLint 9 + Prettier, Docker.

**Spec:** `docs/superpowers/specs/2026-09-19-weinkeller-design.md`

**Plan series:** 1 Foundation (this file) → 2 Intelligence and API → 3 User Interface → 4 Release. Execute in order.

## Global Constraints

- UI text German; code, identifiers, comments and commits English.
- TypeScript strict, no `any`, no non-null assertions without a comment explaining why.
- Files ≤ 250 lines (ESLint `max-lines`, error). Functions ≤ 40 lines in `.ts`, ≤ 80 in `.tsx`.
- Descriptive, fully spelled-out names. No abbreviations (`wineRepository`, not `repo`; `request`, not `req`). Booleans start with `is`/`has`/`should`/`can`.
- Layers: `src/components` and pages never import `@/server/*`. Only `src/server/wine-intelligence` imports `@anthropic-ai/sdk`. Only `src/server/database` and `src/server/repository` import `drizzle-orm` or `better-sqlite3`.
- No magic values: named constants live in `src/domain/constants.ts`.
- TDD: failing test first, then code.
- Secrets only via environment variables. `.env` is never committed.
- **Every task ends with:** `npm run verify` green → commit → `npm run deploy:local` reports healthy. A task is not done before the health check passes.
- Conventional Commits. End every commit message with the line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## File Structure (this part)

```
Dockerfile, docker-compose.yml, .dockerignore, .env.example
scripts/deploy-local.sh              build + start container, wait for health
drizzle.config.ts, drizzle/          generated SQL migrations
src/instrumentation.ts               runs server start-up once
src/app/api/health/route.ts          liveness endpoint
src/domain/constants.ts              named constants
src/domain/wine-types.ts             shared types and enumerations
src/domain/drinking-maturity.ts      maturity from drinking window + urgency sort
src/domain/wine-identity.ts          duplicate detection key
src/domain/cellar-fingerprint.ts     hash of cellar state for cached pairings
src/domain/wine-filter.ts            search and filter for the cellar list
src/server/config/environment.ts     validated environment variables
src/server/database/schema.ts        Drizzle tables
src/server/database/connection.ts    open database, run migrations
src/server/repository/*.ts           one repository per table
src/server/photo-storage/photo-storage.ts   validate, re-encode, store, read photos
src/server/startup.ts                create data folders, migrate, reset stuck analyses
```

---

### Task 1: Walking skeleton — scaffold, quality gates, health endpoint, local Docker deploy

**Files:**
- Create: project scaffold, `vitest.config.ts`, `.prettierrc.json`, `.env.example`, `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `scripts/deploy-local.sh`, `src/app/api/health/route.ts`
- Modify: `package.json`, `eslint.config.mjs`, `next.config.ts`, `.gitignore`
- Test: `src/app/api/health/route.test.ts`

**Interfaces:**
- Produces: `GET /api/health` → `200 {"status":"ok"}`; npm scripts `verify`, `deploy:local`, `test`, `typecheck`, `lint`, `format`.

- [ ] **Step 1: Scaffold Next.js into a temporary folder and copy it in**

`create-next-app` refuses non-empty folders, so scaffold next to the project and copy.

```bash
cd /Users/stefan/demoChallenge
npx create-next-app@latest ../weinkeller-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack --yes
cp .gitignore /tmp/weinkeller-gitignore-backup
rsync -a --exclude .git --exclude node_modules ../weinkeller-scaffold/ ./
cat /tmp/weinkeller-gitignore-backup >> .gitignore
rm -rf ../weinkeller-scaffold
npm install
```

Expected: `package.json`, `src/app/page.tsx`, `eslint.config.mjs`, `next.config.ts` exist. `.gitignore` still contains `.superpowers/`, `.env` and `data/`.

- [ ] **Step 2: Install tooling**

```bash
npm install zod
npm install --save-dev vitest prettier eslint-config-prettier
```

- [ ] **Step 3: Set `package.json` name and scripts**

Set `"name": "weinkeller"` and replace the `scripts` block:

```json
"scripts": {
  "dev": "next dev --turbopack --port 3001",
  "build": "next build",
  "start": "next start",
  "lint": "eslint . --max-warnings 0",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "verify": "npm run format:check && npm run lint && npm run typecheck && npm run test && npm audit --audit-level=high",
  "deploy:local": "bash scripts/deploy-local.sh"
}
```

- [ ] **Step 4: Add Prettier and Vitest configuration**

`.prettierrc.json`:

```json
{ "printWidth": 100, "trailingComma": "all" }
```

`.prettierignore`:

```
.next
node_modules
drizzle
data
docs
.superpowers
package-lock.json
```

`vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
```

- [ ] **Step 5: Add the quality rules to `eslint.config.mjs`**

Keep the generated imports and entries. Add `import prettierConfig from "eslint-config-prettier";` at the top, and insert these objects into the config array directly before the `globalIgnores([...])` entry:

```js
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "max-lines": ["error", { max: 250, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "id-length": ["error", { min: 2, exceptions: ["_"] }],
      "no-console": ["error", { allow: ["error", "warn"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variable",
          types: ["boolean"],
          format: ["PascalCase"],
          prefix: ["is", "has", "should", "can"],
        },
        { selector: "typeLike", format: ["PascalCase"] },
      ],
    },
  },
  {
    files: ["src/**/*.tsx"],
    rules: {
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ["src/**/*.test.ts"],
    rules: { "max-lines-per-function": "off" },
  },
  {
    files: ["src/**"],
    ignores: ["src/server/wine-intelligence/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@anthropic-ai/*"], message: "Only wine-intelligence may call Claude." },
          ],
        },
      ],
    },
  },
  // Must come after the block above: for UI files the last matching block wins,
  // so it repeats the Claude restriction and adds the server restriction.
  {
    files: ["src/components/**", "src/app/**"],
    ignores: ["src/app/api/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/server/*", "@/server/**"], message: "UI must go through the API routes." },
            { group: ["@anthropic-ai/*"], message: "Only wine-intelligence may call Claude." },
          ],
        },
      ],
    },
  },
  prettierConfig,
```

Also add `"drizzle/**"` and `"data/**"` to the `globalIgnores` list.

- [ ] **Step 6: Write the failing health test**

`src/app/api/health/route.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("reports that the server is alive", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 7: Run it to see it fail**

Run: `npx vitest run src/app/api/health`
Expected: FAIL — cannot resolve `./route`.

- [ ] **Step 8: Implement the health route**

`src/app/api/health/route.ts`:

```ts
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({ status: "ok" });
}
```

Run: `npx vitest run src/app/api/health` → PASS.

- [ ] **Step 9: Configure Next.js for Docker and security headers**

Replace `next.config.ts`:

```ts
import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

// Next.js needs inline scripts without a nonce. The app is LAN-only and renders
// all AI and user content as plain text, so 'unsafe-inline' is an accepted trade-off.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3", "sharp"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

- [ ] **Step 10: Add Docker files and the deploy script**

`.env.example`:

```
# Copy to .env and fill in. Never commit .env.
ANTHROPIC_API_KEY=
# Must support the web_search_20260209 tool (Opus 5, Sonnet 5, Opus/Sonnet 4.6+).
CLAUDE_MODEL=claude-opus-5
# "claude" calls the real API. "recorded" returns canned answers (tests, demos, no cost).
WINE_INTELLIGENCE_MODE=claude
```

`.dockerignore`:

```
node_modules
.next
.git
.env
.env.*
!.env.example
data
docs
.superpowers
```

`Dockerfile`:

```dockerfile
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIRECTORY=/data
RUN mkdir -p /data /app/.next/cache && chown -R node:node /data /app/.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
VOLUME /data
CMD ["node", "server.js"]
```

`docker-compose.yml`:

```yaml
services:
  weinkeller:
    build: .
    image: weinkeller:latest
    container_name: weinkeller
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      CLAUDE_MODEL: ${CLAUDE_MODEL:-claude-opus-5}
      WINE_INTELLIGENCE_MODE: ${WINE_INTELLIGENCE_MODE:-claude}
    volumes:
      - ./data:/data
    read_only: true
    tmpfs:
      - /tmp
      - /app/.next/cache:uid=1000,gid=1000
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
```

`scripts/deploy-local.sh`:

```bash
#!/usr/bin/env bash
# Builds and starts the container locally, then waits until the health endpoint answers.
set -euo pipefail

HEALTH_URL="http://localhost:3000/api/health"
MAXIMUM_ATTEMPTS=30

mkdir -p data
docker compose up --detach --build

for attempt in $(seq 1 "$MAXIMUM_ATTEMPTS"); do
  if curl --silent --fail "$HEALTH_URL" > /dev/null; then
    echo "Deployed and healthy: http://localhost:3000"
    exit 0
  fi
  sleep 2
done

echo "Health check failed after $MAXIMUM_ATTEMPTS attempts. Recent logs:" >&2
docker compose logs --tail 50 >&2
exit 1
```

Run: `chmod +x scripts/deploy-local.sh`

- [ ] **Step 11: Verify the quality gates work**

Run: `npm run format && npm run verify`
Expected: all green. If the scaffolded `src/app/page.tsx` violates a rule, replace its body with a minimal component:

```tsx
export default function HomePage() {
  return <main>Weinkeller</main>;
}
```

Prove the layer rule: temporarily add `import "@/server/x";` to `src/app/page.tsx`, run `npm run lint`, expect a `no-restricted-imports` error, then remove the line.

- [ ] **Step 12: Commit and deploy**

```bash
git add -A
git commit -m "feat: scaffold app with quality gates, health endpoint and docker deploy"
npm run deploy:local
```

Expected: `Deployed and healthy: http://localhost:3000`. Check the headers: `curl -sI http://localhost:3000 | grep -i content-security-policy` prints the policy.

---

### Task 2: Domain logic — maturity, identity, fingerprint, filter

**Files:**
- Create: `src/domain/constants.ts`, `src/domain/wine-types.ts`, `src/domain/drinking-maturity.ts`, `src/domain/wine-identity.ts`, `src/domain/cellar-fingerprint.ts`, `src/domain/wine-filter.ts`
- Test: `src/domain/drinking-maturity.test.ts`, `src/domain/wine-identity.test.ts`, `src/domain/cellar-fingerprint.test.ts`, `src/domain/wine-filter.test.ts`

**Interfaces:**
- Produces:
  - `WineType`, `AnalysisStatus`, `DrinkingMaturity`, `ResearchConfidence`, `CriticScore`, `DrinkingWindow`
  - `determineDrinkingMaturity(window: DrinkingWindow, currentYear: number): DrinkingMaturity`
  - `sortByDrinkingUrgency<T extends DrinkingWindow>(wines: T[], currentYear: number): T[]`
  - `buildWineIdentityKey(identity: { producer: string | null; name: string | null; vintage: number | null }): string | null`
  - `buildCellarFingerprint(wines: FingerprintableWine[]): string`
  - `filterWines<T extends FilterableWine>(wines: T[], filter: WineFilter, currentYear: number): T[]`

- [ ] **Step 1: Create constants and types (no test needed — declarations only)**

`src/domain/constants.ts`:

```ts
/** A wine counts as "drink soon" during the last N years of its drinking window. */
export const DRINK_SOON_WINDOW_YEARS = 2;

export const DEFAULT_CURRENCY = "CHF";
export const DEFAULT_MONTHLY_AI_CALL_LIMIT = 300;

export const MAXIMUM_PHOTO_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAXIMUM_PHOTO_EDGE_PIXELS = 1500;
export const PHOTO_JPEG_QUALITY = 85;

export const MAXIMUM_SHORT_TEXT_LENGTH = 200;
export const MAXIMUM_LONG_TEXT_LENGTH = 2000;
export const MAXIMUM_BOTTLE_COUNT = 9999;

export const MAXIMUM_DISH_RECOMMENDATIONS = 3;
export const AI_REQUESTS_PER_MINUTE = 20;
```

`src/domain/wine-types.ts`:

```ts
export const WINE_TYPES = ["red", "white", "rose", "sparkling", "sweet"] as const;
export type WineType = (typeof WINE_TYPES)[number];

export const ANALYSIS_STATUSES = [
  "pending",
  "analyzing",
  "awaitingConfirmation",
  "complete",
  "failed",
] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export const DRINKING_MATURITIES = ["tooYoung", "ready", "drinkSoon", "overdue", "unknown"] as const;
export type DrinkingMaturity = (typeof DRINKING_MATURITIES)[number];

export const RESEARCH_CONFIDENCES = ["researched", "estimated"] as const;
export type ResearchConfidence = (typeof RESEARCH_CONFIDENCES)[number];

export interface CriticScore {
  source: string;
  points: number;
  url: string | null;
}

export interface DrinkingWindow {
  drinkFromYear: number | null;
  drinkUntilYear: number | null;
}
```

- [ ] **Step 2: Write the failing maturity tests**

`src/domain/drinking-maturity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { determineDrinkingMaturity, sortByDrinkingUrgency } from "./drinking-maturity";

const CURRENT_YEAR = 2026;

describe("determineDrinkingMaturity", () => {
  it.each([
    [{ drinkFromYear: 2028, drinkUntilYear: 2040 }, "tooYoung"],
    [{ drinkFromYear: 2023, drinkUntilYear: 2038 }, "ready"],
    [{ drinkFromYear: 2018, drinkUntilYear: 2027 }, "drinkSoon"],
    [{ drinkFromYear: 2018, drinkUntilYear: 2026 }, "drinkSoon"],
    [{ drinkFromYear: 2015, drinkUntilYear: 2025 }, "overdue"],
    [{ drinkFromYear: null, drinkUntilYear: null }, "unknown"],
    [{ drinkFromYear: 2020, drinkUntilYear: null }, "unknown"],
  ] as const)("maps %o to %s", (window, expectedMaturity) => {
    expect(determineDrinkingMaturity(window, CURRENT_YEAR)).toBe(expectedMaturity);
  });

  it("treats the first year of the window as ready", () => {
    const window = { drinkFromYear: 2026, drinkUntilYear: 2035 };
    expect(determineDrinkingMaturity(window, CURRENT_YEAR)).toBe("ready");
  });
});

describe("sortByDrinkingUrgency", () => {
  it("orders overdue first, then drink soon, then by the end of the window", () => {
    const wines = [
      { name: "ready", drinkFromYear: 2023, drinkUntilYear: 2038 },
      { name: "soonLater", drinkFromYear: 2018, drinkUntilYear: 2027 },
      { name: "unknown", drinkFromYear: null, drinkUntilYear: null },
      { name: "overdue", drinkFromYear: 2010, drinkUntilYear: 2024 },
      { name: "soonEarlier", drinkFromYear: 2018, drinkUntilYear: 2026 },
    ];

    const sortedNames = sortByDrinkingUrgency(wines, CURRENT_YEAR).map((wine) => wine.name);

    expect(sortedNames).toEqual(["overdue", "soonEarlier", "soonLater", "ready", "unknown"]);
  });

  it("does not mutate the input", () => {
    const wines = [{ drinkFromYear: 2023, drinkUntilYear: 2038 }];
    expect(sortByDrinkingUrgency(wines, CURRENT_YEAR)).not.toBe(wines);
  });
});
```

Run: `npx vitest run src/domain/drinking-maturity` → FAIL (module missing).

- [ ] **Step 3: Implement drinking maturity**

`src/domain/drinking-maturity.ts`:

```ts
import { DRINK_SOON_WINDOW_YEARS } from "./constants";
import type { DrinkingMaturity, DrinkingWindow } from "./wine-types";

const URGENCY_RANK: Record<DrinkingMaturity, number> = {
  overdue: 0,
  drinkSoon: 1,
  ready: 2,
  tooYoung: 3,
  unknown: 4,
};

export function determineDrinkingMaturity(
  window: DrinkingWindow,
  currentYear: number,
): DrinkingMaturity {
  const { drinkFromYear, drinkUntilYear } = window;
  if (drinkFromYear === null || drinkUntilYear === null) return "unknown";
  if (currentYear < drinkFromYear) return "tooYoung";
  if (currentYear > drinkUntilYear) return "overdue";

  const firstDrinkSoonYear = drinkUntilYear - DRINK_SOON_WINDOW_YEARS + 1;
  return currentYear >= firstDrinkSoonYear ? "drinkSoon" : "ready";
}

export function sortByDrinkingUrgency<T extends DrinkingWindow>(
  wines: T[],
  currentYear: number,
): T[] {
  return [...wines].sort((firstWine, secondWine) => {
    const rankDifference =
      URGENCY_RANK[determineDrinkingMaturity(firstWine, currentYear)] -
      URGENCY_RANK[determineDrinkingMaturity(secondWine, currentYear)];
    if (rankDifference !== 0) return rankDifference;

    const firstEnd = firstWine.drinkUntilYear ?? Number.MAX_SAFE_INTEGER;
    const secondEnd = secondWine.drinkUntilYear ?? Number.MAX_SAFE_INTEGER;
    return firstEnd - secondEnd;
  });
}
```

Run: `npx vitest run src/domain/drinking-maturity` → PASS.

- [ ] **Step 4: Write the failing identity tests**

`src/domain/wine-identity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildWineIdentityKey } from "./wine-identity";

describe("buildWineIdentityKey", () => {
  it("ignores case, accents, punctuation and spacing", () => {
    const firstKey = buildWineIdentityKey({
      producer: "Château  Pétrus",
      name: "Pomerol",
      vintage: 2015,
    });
    const secondKey = buildWineIdentityKey({
      producer: "chateau petrus",
      name: "POMEROL.",
      vintage: 2015,
    });

    expect(firstKey).toBe(secondKey);
  });

  it("separates vintages", () => {
    const base = { producer: "Antinori", name: "Tignanello" };
    expect(buildWineIdentityKey({ ...base, vintage: 2018 })).not.toBe(
      buildWineIdentityKey({ ...base, vintage: 2019 }),
    );
  });

  it("supports non-vintage wines", () => {
    expect(buildWineIdentityKey({ producer: "Krug", name: "Grande Cuvée", vintage: null })).toBe(
      "krug|grandecuvee|nv",
    );
  });

  it("returns null when producer and name are both missing", () => {
    expect(buildWineIdentityKey({ producer: null, name: " ", vintage: 2020 })).toBeNull();
  });
});
```

Run: `npx vitest run src/domain/wine-identity` → FAIL.

- [ ] **Step 5: Implement wine identity**

`src/domain/wine-identity.ts`:

```ts
export interface WineIdentityFields {
  producer: string | null;
  name: string | null;
  vintage: number | null;
}

const DIACRITIC_MARKS = /[̀-ͯ]/g;
const NON_ALPHANUMERIC = /[^a-z0-9]/g;

function normalizeText(text: string | null): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(DIACRITIC_MARKS, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC, "");
}

/** Two wines with the same key are treated as the same cellar entry. */
export function buildWineIdentityKey(identity: WineIdentityFields): string | null {
  const producer = normalizeText(identity.producer);
  const name = normalizeText(identity.name);
  if (producer === "" && name === "") return null;

  return `${producer}|${name}|${identity.vintage ?? "nv"}`;
}
```

Run → PASS.

- [ ] **Step 6: Write the failing fingerprint tests**

`src/domain/cellar-fingerprint.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildCellarFingerprint } from "./cellar-fingerprint";

const tignanello = { id: 1, bottleCount: 6, analyzedAt: new Date("2026-01-01") };
const chablis = { id: 2, bottleCount: 3, analyzedAt: new Date("2026-02-01") };

describe("buildCellarFingerprint", () => {
  it("is independent of the order of wines", () => {
    expect(buildCellarFingerprint([tignanello, chablis])).toBe(
      buildCellarFingerprint([chablis, tignanello]),
    );
  });

  it("changes when a bottle is drunk", () => {
    const afterDrinking = { ...tignanello, bottleCount: 5 };
    expect(buildCellarFingerprint([afterDrinking, chablis])).not.toBe(
      buildCellarFingerprint([tignanello, chablis]),
    );
  });

  it("changes when a wine is re-analyzed", () => {
    const reanalyzed = { ...chablis, analyzedAt: new Date("2026-03-01") };
    expect(buildCellarFingerprint([tignanello, reanalyzed])).not.toBe(
      buildCellarFingerprint([tignanello, chablis]),
    );
  });

  it("ignores wines without bottles", () => {
    const emptyWine = { id: 3, bottleCount: 0, analyzedAt: null };
    expect(buildCellarFingerprint([tignanello, emptyWine])).toBe(
      buildCellarFingerprint([tignanello]),
    );
  });
});
```

Run → FAIL.

- [ ] **Step 7: Implement the fingerprint**

`src/domain/cellar-fingerprint.ts`:

```ts
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
```

Run → PASS.

- [ ] **Step 8: Write the failing filter tests**

`src/domain/wine-filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterWines, type FilterableWine } from "./wine-filter";

const CURRENT_YEAR = 2026;

function buildWine(overrides: Partial<FilterableWine>): FilterableWine {
  return {
    producer: "Antinori",
    name: "Tignanello",
    region: "Toskana",
    country: "Italien",
    grapeVarieties: ["Sangiovese"],
    wineType: "red",
    bottleCount: 6,
    drinkFromYear: 2023,
    drinkUntilYear: 2038,
    ...overrides,
  };
}

describe("filterWines", () => {
  it("hides wines without bottles by default", () => {
    const wines = [buildWine({}), buildWine({ name: "Empty", bottleCount: 0 })];
    expect(filterWines(wines, {}, CURRENT_YEAR)).toHaveLength(1);
    expect(filterWines(wines, { shouldIncludeEmpty: true }, CURRENT_YEAR)).toHaveLength(2);
  });

  it("searches producer, name, region, country and grapes without case or accents", () => {
    const wines = [buildWine({}), buildWine({ producer: "Gantenbein", region: "Graubünden" })];
    expect(filterWines(wines, { searchText: "graubunden" }, CURRENT_YEAR)).toHaveLength(1);
    expect(filterWines(wines, { searchText: "SANGIO" }, CURRENT_YEAR)).toHaveLength(2);
  });

  it("filters by wine type", () => {
    const wines = [buildWine({}), buildWine({ wineType: "white" })];
    expect(filterWines(wines, { wineType: "white" }, CURRENT_YEAR)).toHaveLength(1);
  });

  it("filters by computed maturity", () => {
    const wines = [buildWine({}), buildWine({ drinkFromYear: 2015, drinkUntilYear: 2027 })];
    expect(filterWines(wines, { maturity: "drinkSoon" }, CURRENT_YEAR)).toHaveLength(1);
  });
});
```

Run → FAIL.

- [ ] **Step 9: Implement the filter**

`src/domain/wine-filter.ts`:

```ts
import { determineDrinkingMaturity } from "./drinking-maturity";
import type { DrinkingMaturity, DrinkingWindow, WineType } from "./wine-types";

export interface FilterableWine extends DrinkingWindow {
  producer: string | null;
  name: string | null;
  region: string | null;
  country: string | null;
  grapeVarieties: string[];
  wineType: WineType | null;
  bottleCount: number;
}

export interface WineFilter {
  searchText?: string;
  wineType?: WineType;
  maturity?: DrinkingMaturity;
  shouldIncludeEmpty?: boolean;
}

const DIACRITIC_MARKS = /[̀-ͯ]/g;

function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(DIACRITIC_MARKS, "").toLowerCase().trim();
}

function matchesSearchText(wine: FilterableWine, searchText: string): boolean {
  const searchableText = [wine.producer, wine.name, wine.region, wine.country, ...wine.grapeVarieties]
    .filter((part): part is string => part !== null)
    .join(" ");
  return normalizeForSearch(searchableText).includes(normalizeForSearch(searchText));
}

export function filterWines<T extends FilterableWine>(
  wines: T[],
  filter: WineFilter,
  currentYear: number,
): T[] {
  return wines.filter((wine) => {
    if (!filter.shouldIncludeEmpty && wine.bottleCount === 0) return false;
    if (filter.wineType && wine.wineType !== filter.wineType) return false;
    if (filter.maturity && determineDrinkingMaturity(wine, currentYear) !== filter.maturity) {
      return false;
    }
    if (filter.searchText && !matchesSearchText(wine, filter.searchText)) return false;
    return true;
  });
}
```

Run: `npx vitest run src/domain` → all PASS.

- [ ] **Step 10: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add domain logic for maturity, identity, fingerprint and filtering"
npm run deploy:local
```

---

### Task 3: Environment, database schema, migrations, start-up

**Files:**
- Create: `src/server/config/environment.ts`, `src/server/database/schema.ts`, `src/server/database/connection.ts`, `drizzle.config.ts`, `drizzle/` (generated), `src/server/startup.ts`, `src/instrumentation.ts`
- Modify: `Dockerfile` (copy migrations), `package.json` (script `database:generate`)
- Test: `src/server/config/environment.test.ts`, `src/server/database/connection.test.ts`

**Interfaces:**
- Consumes: types from `src/domain/wine-types.ts`.
- Produces:
  - `readEnvironment(source?: NodeJS.ProcessEnv): Environment` with `dataDirectory`, `anthropicApiKey: string | null`, `claudeModel`, `wineIntelligenceMode: "claude" | "recorded"`
  - Tables `wines`, `tastings`, `dishRecommendations`, `aiUsage`, `settings`; row types `WineRecord`, `NewWineRecord`, `TastingRecord`, `DishRecommendationRecord`
  - `openDatabase(databaseFilePath: string): WineCellarDatabase` (runs migrations), `IN_MEMORY_DATABASE = ":memory:"`
  - `initializeServer(): Promise<void>`

- [ ] **Step 1: Install dependencies**

```bash
npm install drizzle-orm better-sqlite3
npm install --save-dev drizzle-kit @types/better-sqlite3
```

Add to `package.json` scripts: `"database:generate": "drizzle-kit generate"`.

- [ ] **Step 2: Write the failing environment tests**

`src/server/config/environment.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readEnvironment } from "./environment";

describe("readEnvironment", () => {
  it("applies defaults", () => {
    expect(readEnvironment({})).toEqual({
      dataDirectory: "./data",
      anthropicApiKey: null,
      claudeModel: "claude-opus-5",
      wineIntelligenceMode: "claude",
    });
  });

  it("treats an empty API key as missing", () => {
    expect(readEnvironment({ ANTHROPIC_API_KEY: "  " }).anthropicApiKey).toBeNull();
  });

  it("reads configured values", () => {
    const environment = readEnvironment({
      DATA_DIRECTORY: "/data",
      ANTHROPIC_API_KEY: "test-key",
      CLAUDE_MODEL: "claude-sonnet-5",
      WINE_INTELLIGENCE_MODE: "recorded",
    });
    expect(environment.dataDirectory).toBe("/data");
    expect(environment.anthropicApiKey).toBe("test-key");
    expect(environment.claudeModel).toBe("claude-sonnet-5");
    expect(environment.wineIntelligenceMode).toBe("recorded");
  });

  it("rejects an unknown intelligence mode", () => {
    expect(() => readEnvironment({ WINE_INTELLIGENCE_MODE: "magic" })).toThrow();
  });
});
```

Run → FAIL.

- [ ] **Step 3: Implement the environment reader**

`src/server/config/environment.ts`:

```ts
import { z } from "zod";

const EnvironmentSchema = z.object({
  DATA_DIRECTORY: z.string().min(1).default("./data"),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().min(1).default("claude-opus-5"),
  WINE_INTELLIGENCE_MODE: z.enum(["claude", "recorded"]).default("claude"),
});

export interface Environment {
  dataDirectory: string;
  anthropicApiKey: string | null;
  claudeModel: string;
  wineIntelligenceMode: "claude" | "recorded";
}

export function readEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const parsed = EnvironmentSchema.parse(source);
  const trimmedApiKey = parsed.ANTHROPIC_API_KEY?.trim() ?? "";

  return {
    dataDirectory: parsed.DATA_DIRECTORY,
    anthropicApiKey: trimmedApiKey === "" ? null : trimmedApiKey,
    claudeModel: parsed.CLAUDE_MODEL,
    wineIntelligenceMode: parsed.WINE_INTELLIGENCE_MODE,
  };
}
```

Run → PASS.

- [ ] **Step 4: Define the schema**

`src/server/database/schema.ts`:

```ts
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type {
  AnalysisStatus,
  CriticScore,
  ResearchConfidence,
  WineType,
} from "@/domain/wine-types";

export interface StoredDishRecommendation {
  wineId: number;
  reasoning: string;
  servingTip: string | null;
}

const timestamp = (columnName: string) => integer(columnName, { mode: "timestamp_ms" });

export const wines = sqliteTable("wines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  producer: text("producer"),
  name: text("name"),
  vintage: integer("vintage"),
  country: text("country"),
  region: text("region"),
  appellation: text("appellation"),
  grapeVarieties: text("grape_varieties", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  wineType: text("wine_type").$type<WineType>(),
  alcoholPercent: real("alcohol_percent"),

  bottleCount: integer("bottle_count").notNull().default(0),
  storageLocation: text("storage_location"),
  purchasePricePerBottle: real("purchase_price_per_bottle"),
  photoFileName: text("photo_file_name").notNull(),

  styleClassification: text("style_classification"),
  description: text("description"),
  criticScores: text("critic_scores", { mode: "json" })
    .$type<CriticScore[]>()
    .notNull()
    .$defaultFn(() => []),
  aggregateScore: integer("aggregate_score"),
  drinkFromYear: integer("drink_from_year"),
  drinkUntilYear: integer("drink_until_year"),
  foodPairings: text("food_pairings", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  estimatedMarketValue: real("estimated_market_value"),
  confidence: text("confidence").$type<ResearchConfidence>(),
  analyzedAt: timestamp("analyzed_at"),

  analysisStatus: text("analysis_status").$type<AnalysisStatus>().notNull().default("pending"),
  analysisError: text("analysis_error"),
  duplicateOfWineId: integer("duplicate_of_wine_id"),

  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const tastings = sqliteTable("tastings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  wineId: integer("wine_id")
    .notNull()
    .references(() => wines.id, { onDelete: "cascade" }),
  tastedOn: text("tasted_on").notNull(),
  starRating: integer("star_rating"),
  tastingNote: text("tasting_note"),
  occasionOrDish: text("occasion_or_dish"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const dishRecommendations = sqliteTable("dish_recommendations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dish: text("dish").notNull(),
  normalizedDish: text("normalized_dish").notNull(),
  recommendations: text("recommendations", { mode: "json" })
    .$type<StoredDishRecommendation[]>()
    .notNull(),
  cellarFingerprint: text("cellar_fingerprint").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const aiUsage = sqliteTable("ai_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  operation: text("operation").notNull(),
  inputTokens: integer("input_tokens").notNull(),
  outputTokens: integer("output_tokens").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type WineRecord = typeof wines.$inferSelect;
export type NewWineRecord = typeof wines.$inferInsert;
export type TastingRecord = typeof tastings.$inferSelect;
export type DishRecommendationRecord = typeof dishRecommendations.$inferSelect;
```

`tastedOn` is an ISO date string (`YYYY-MM-DD`): a tasting has a calendar day, not a moment.

- [ ] **Step 5: Generate the first migration**

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/database/schema.ts",
  out: "./drizzle",
});
```

Run: `npm run database:generate`
Expected: a new folder or `.sql` file under `drizzle/` containing `CREATE TABLE \`wines\``. Commit the generated files; never edit them by hand.

- [ ] **Step 6: Write the failing connection test**

`src/server/database/connection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "./connection";
import { wines } from "./schema";

describe("openDatabase", () => {
  it("creates all tables through migrations", () => {
    const database = openDatabase(IN_MEMORY_DATABASE);

    const insertedWine = database
      .insert(wines)
      .values({ photoFileName: "label.jpg" })
      .returning()
      .get();

    expect(insertedWine.id).toBe(1);
    expect(insertedWine.analysisStatus).toBe("pending");
    expect(insertedWine.grapeVarieties).toEqual([]);
    expect(insertedWine.createdAt).toBeInstanceOf(Date);
  });
});
```

Run → FAIL.

- [ ] **Step 7: Implement the connection**

`src/server/database/connection.ts`:

```ts
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type WineCellarDatabase = BetterSQLite3Database<typeof schema>;

export const IN_MEMORY_DATABASE = ":memory:";
const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export function openDatabase(databaseFilePath: string): WineCellarDatabase {
  const sqliteClient = new Database(databaseFilePath);
  sqliteClient.pragma("journal_mode = WAL");
  sqliteClient.pragma("foreign_keys = ON");

  const database = drizzle({ client: sqliteClient, schema });
  migrate(database, { migrationsFolder: MIGRATIONS_FOLDER });
  return database;
}
```

Run: `npx vitest run src/server/database` → PASS.

- [ ] **Step 8: Add start-up and instrumentation**

`src/server/startup.ts` (the repository wiring is added in Part 2, Task 3; for now it prepares folders and migrates):

```ts
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { readEnvironment } from "./config/environment";
import { openDatabase } from "./database/connection";

export const DATABASE_FILE_NAME = "weinkeller.db";
export const PHOTO_FOLDER_NAME = "photos";

export async function initializeServer(): Promise<void> {
  const { dataDirectory } = readEnvironment();
  await mkdir(path.join(dataDirectory, PHOTO_FOLDER_NAME), { recursive: true });
  openDatabase(path.join(dataDirectory, DATABASE_FILE_NAME));
}
```

`src/instrumentation.ts`:

```ts
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initializeServer } = await import("./server/startup");
  await initializeServer();
}
```

- [ ] **Step 9: Ship migrations in the image**

In `Dockerfile`, add after the `.next/static` copy line:

```dockerfile
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
```

- [ ] **Step 10: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add environment config, database schema, migrations and start-up"
npm run deploy:local
ls data/
```

Expected: healthy, and `data/` now contains `weinkeller.db` and `photos/`.
If the container logs show `better_sqlite3.node` missing, the standalone trace dropped the native module: add `outputFileTracingIncludes: { "/**": ["./node_modules/better-sqlite3/build/Release/*.node"] }` to `next.config.ts` and redeploy.

---

### Task 4: Repositories

**Files:**
- Create: `src/server/repository/wine-repository.ts`, `tasting-repository.ts`, `dish-recommendation-repository.ts`, `ai-usage-repository.ts`, `settings-repository.ts` (all in `src/server/repository/`)
- Test: one `*.test.ts` next to each file

**Interfaces:**
- Consumes: `openDatabase`, `IN_MEMORY_DATABASE`, schema tables and record types, `buildWineIdentityKey`.
- Produces:
  - `WineRepository`: `createPendingWine(photoFileName): WineRecord`, `findWineById(id): WineRecord | null`, `listWines(): WineRecord[]`, `updateWine(id, changes: WineChanges): WineRecord`, `deleteWine(id): void`, `findCompleteWineByIdentity(identity, excludedWineId): WineRecord | null`, `resetInterruptedAnalyses(): number`
  - `type WineChanges = Partial<Omit<NewWineRecord, "id" | "createdAt" | "updatedAt">>`
  - `TastingRepository`: `recordTasting(tasting: NewTasting): TastingRecord` (also decrements `bottleCount`, never below 0, in one transaction), `listTastingsForWine(wineId)`, `listAllTastings(): TastingWithWine[]`
  - `DishRecommendationRepository`: `saveRecommendation(entry)`, `findLatestForDish(dish): DishRecommendationRecord | null`, `listRecentDishes(limit): string[]`, `normalizeDish(dish): string`
  - `AiUsageRepository`: `recordUsage({ operation, inputTokens, outputTokens })`, `countCallsSince(since: Date): number`
  - `SettingsRepository`: `getCurrency()`, `setCurrency(currency)`, `getMonthlyAiCallLimit()`, `setMonthlyAiCallLimit(limit)`
  - `class RecordNotFoundError extends Error`

- [ ] **Step 1: Write the failing wine repository tests**

`src/server/repository/wine-repository.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { RecordNotFoundError, WineRepository } from "./wine-repository";

let wineRepository: WineRepository;

beforeEach(() => {
  wineRepository = new WineRepository(openDatabase(IN_MEMORY_DATABASE));
});

describe("WineRepository", () => {
  it("creates a pending wine and finds it again", () => {
    const createdWine = wineRepository.createPendingWine("label.jpg");

    expect(createdWine.analysisStatus).toBe("pending");
    expect(wineRepository.findWineById(createdWine.id)?.photoFileName).toBe("label.jpg");
  });

  it("returns null for an unknown wine", () => {
    expect(wineRepository.findWineById(999)).toBeNull();
  });

  it("updates fields and refreshes updatedAt", async () => {
    const createdWine = wineRepository.createPendingWine("label.jpg");
    await new Promise((resolve) => setTimeout(resolve, 5));

    const updatedWine = wineRepository.updateWine(createdWine.id, {
      producer: "Antinori",
      bottleCount: 6,
    });

    expect(updatedWine.producer).toBe("Antinori");
    expect(updatedWine.bottleCount).toBe(6);
    expect(updatedWine.updatedAt.getTime()).toBeGreaterThan(createdWine.updatedAt.getTime());
  });

  it("throws RecordNotFoundError when updating an unknown wine", () => {
    expect(() => wineRepository.updateWine(999, { bottleCount: 1 })).toThrow(RecordNotFoundError);
  });

  it("deletes a wine", () => {
    const createdWine = wineRepository.createPendingWine("label.jpg");
    wineRepository.deleteWine(createdWine.id);
    expect(wineRepository.listWines()).toEqual([]);
  });

  it("finds a complete wine with the same identity, excluding the wine itself", () => {
    const existingWine = wineRepository.createPendingWine("first.jpg");
    wineRepository.updateWine(existingWine.id, {
      producer: "Marchesi Antinori",
      name: "Tignanello",
      vintage: 2018,
      analysisStatus: "complete",
    });
    const newWine = wineRepository.createPendingWine("second.jpg");
    const identity = { producer: "marchesi antinori", name: "TIGNANELLO", vintage: 2018 };

    expect(wineRepository.findCompleteWineByIdentity(identity, newWine.id)?.id).toBe(
      existingWine.id,
    );
    expect(wineRepository.findCompleteWineByIdentity(identity, existingWine.id)).toBeNull();
  });

  it("resets analyses that were interrupted by a restart", () => {
    const interruptedWine = wineRepository.createPendingWine("label.jpg");
    wineRepository.updateWine(interruptedWine.id, { analysisStatus: "analyzing" });

    expect(wineRepository.resetInterruptedAnalyses()).toBe(1);
    expect(wineRepository.findWineById(interruptedWine.id)?.analysisStatus).toBe("pending");
  });
});
```

Run → FAIL.

- [ ] **Step 2: Implement the wine repository**

`src/server/repository/wine-repository.ts`:

```ts
import { desc, eq } from "drizzle-orm";
import { buildWineIdentityKey, type WineIdentityFields } from "@/domain/wine-identity";
import type { WineCellarDatabase } from "../database/connection";
import { wines, type NewWineRecord, type WineRecord } from "../database/schema";

export type WineChanges = Partial<Omit<NewWineRecord, "id" | "createdAt" | "updatedAt">>;

export class RecordNotFoundError extends Error {
  constructor(recordDescription: string) {
    super(`${recordDescription} was not found`);
    this.name = "RecordNotFoundError";
  }
}

export class WineRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  createPendingWine(photoFileName: string): WineRecord {
    return this.database.insert(wines).values({ photoFileName }).returning().get();
  }

  findWineById(wineId: number): WineRecord | null {
    return this.database.select().from(wines).where(eq(wines.id, wineId)).get() ?? null;
  }

  listWines(): WineRecord[] {
    return this.database.select().from(wines).orderBy(desc(wines.createdAt)).all();
  }

  updateWine(wineId: number, changes: WineChanges): WineRecord {
    const updatedWine = this.database
      .update(wines)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(wines.id, wineId))
      .returning()
      .get();
    if (!updatedWine) throw new RecordNotFoundError(`Wine ${wineId}`);
    return updatedWine;
  }

  deleteWine(wineId: number): void {
    this.database.delete(wines).where(eq(wines.id, wineId)).run();
  }

  /** The cellar holds a few hundred wines, so comparing keys in memory is fine. */
  findCompleteWineByIdentity(
    identity: WineIdentityFields,
    excludedWineId: number,
  ): WineRecord | null {
    const searchedKey = buildWineIdentityKey(identity);
    if (searchedKey === null) return null;

    const matchingWine = this.listWines().find(
      (wine) =>
        wine.id !== excludedWineId &&
        wine.analysisStatus === "complete" &&
        buildWineIdentityKey(wine) === searchedKey,
    );
    return matchingWine ?? null;
  }

  resetInterruptedAnalyses(): number {
    const resetResult = this.database
      .update(wines)
      .set({ analysisStatus: "pending", updatedAt: new Date() })
      .where(eq(wines.analysisStatus, "analyzing"))
      .run();
    return resetResult.changes;
  }
}
```

Run: `npx vitest run src/server/repository/wine-repository` → PASS.

- [ ] **Step 3: Write the failing tasting repository tests**

`src/server/repository/tasting-repository.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { TastingRepository } from "./tasting-repository";
import { RecordNotFoundError, WineRepository } from "./wine-repository";

let wineRepository: WineRepository;
let tastingRepository: TastingRepository;

beforeEach(() => {
  const database = openDatabase(IN_MEMORY_DATABASE);
  wineRepository = new WineRepository(database);
  tastingRepository = new TastingRepository(database);
});

function createWineWithBottles(bottleCount: number): number {
  const wine = wineRepository.createPendingWine("label.jpg");
  wineRepository.updateWine(wine.id, { name: "Tignanello", bottleCount });
  return wine.id;
}

describe("TastingRepository", () => {
  it("records a tasting and removes one bottle", () => {
    const wineId = createWineWithBottles(6);

    const tasting = tastingRepository.recordTasting({
      wineId,
      tastedOn: "2026-09-19",
      starRating: 4,
      tastingNote: "Dunkle Kirsche",
      occasionOrDish: "Bistecca",
    });

    expect(tasting.starRating).toBe(4);
    expect(wineRepository.findWineById(wineId)?.bottleCount).toBe(5);
  });

  it("never lets the bottle count fall below zero", () => {
    const wineId = createWineWithBottles(0);
    tastingRepository.recordTasting({ wineId, tastedOn: "2026-09-19" });
    expect(wineRepository.findWineById(wineId)?.bottleCount).toBe(0);
  });

  it("rejects a tasting for an unknown wine and stores nothing", () => {
    expect(() => tastingRepository.recordTasting({ wineId: 999, tastedOn: "2026-09-19" })).toThrow(
      RecordNotFoundError,
    );
    expect(tastingRepository.listAllTastings()).toEqual([]);
  });

  it("lists the history with wine names, newest first", () => {
    const wineId = createWineWithBottles(3);
    tastingRepository.recordTasting({ wineId, tastedOn: "2026-01-01" });
    tastingRepository.recordTasting({ wineId, tastedOn: "2026-09-19" });

    const history = tastingRepository.listAllTastings();

    expect(history.map((entry) => entry.tastedOn)).toEqual(["2026-09-19", "2026-01-01"]);
    expect(history[0].wineName).toBe("Tignanello");
    expect(tastingRepository.listTastingsForWine(wineId)).toHaveLength(2);
  });
});
```

Run → FAIL.

- [ ] **Step 4: Implement the tasting repository**

`src/server/repository/tasting-repository.ts`:

```ts
import { desc, eq, sql } from "drizzle-orm";
import type { WineCellarDatabase } from "../database/connection";
import { tastings, wines, type TastingRecord } from "../database/schema";
import { RecordNotFoundError } from "./wine-repository";

export interface NewTasting {
  wineId: number;
  tastedOn: string;
  starRating?: number | null;
  tastingNote?: string | null;
  occasionOrDish?: string | null;
}

export interface TastingWithWine extends TastingRecord {
  wineProducer: string | null;
  wineName: string | null;
  wineVintage: number | null;
}

export class TastingRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  /** Storing the tasting and removing the bottle must succeed or fail together. */
  recordTasting(tasting: NewTasting): TastingRecord {
    return this.database.transaction((transaction) => {
      const bottleUpdate = transaction
        .update(wines)
        .set({ bottleCount: sql`max(${wines.bottleCount} - 1, 0)`, updatedAt: new Date() })
        .where(eq(wines.id, tasting.wineId))
        .run();
      if (bottleUpdate.changes === 0) throw new RecordNotFoundError(`Wine ${tasting.wineId}`);

      return transaction.insert(tastings).values(tasting).returning().get();
    });
  }

  listTastingsForWine(wineId: number): TastingRecord[] {
    return this.database
      .select()
      .from(tastings)
      .where(eq(tastings.wineId, wineId))
      .orderBy(desc(tastings.tastedOn), desc(tastings.id))
      .all();
  }

  listAllTastings(): TastingWithWine[] {
    return this.database
      .select({
        id: tastings.id,
        wineId: tastings.wineId,
        tastedOn: tastings.tastedOn,
        starRating: tastings.starRating,
        tastingNote: tastings.tastingNote,
        occasionOrDish: tastings.occasionOrDish,
        createdAt: tastings.createdAt,
        wineProducer: wines.producer,
        wineName: wines.name,
        wineVintage: wines.vintage,
      })
      .from(tastings)
      .innerJoin(wines, eq(tastings.wineId, wines.id))
      .orderBy(desc(tastings.tastedOn), desc(tastings.id))
      .all();
  }
}
```

Run → PASS.

- [ ] **Step 5: Write the failing tests for the three small repositories**

`src/server/repository/dish-recommendation-repository.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { DishRecommendationRepository, normalizeDish } from "./dish-recommendation-repository";

let repository: DishRecommendationRepository;
const recommendations = [{ wineId: 1, reasoning: "Passt zur Sauce", servingTip: null }];

beforeEach(() => {
  repository = new DishRecommendationRepository(openDatabase(IN_MEMORY_DATABASE));
});

describe("DishRecommendationRepository", () => {
  it("normalizes dishes for lookup", () => {
    expect(normalizeDish("  Rindsfilet   mit MORCHELN ")).toBe("rindsfilet mit morcheln");
  });

  it("finds the latest stored answer for a dish regardless of spelling", () => {
    repository.saveRecommendation({
      dish: "Rindsfilet",
      recommendations,
      cellarFingerprint: "old",
    });
    repository.saveRecommendation({
      dish: "rindsfilet ",
      recommendations,
      cellarFingerprint: "new",
    });

    expect(repository.findLatestForDish("RINDSFILET")?.cellarFingerprint).toBe("new");
    expect(repository.findLatestForDish("Fondue")).toBeNull();
  });

  it("lists recent distinct dishes, newest first", () => {
    for (const dish of ["Fondue", "Lachs", "fondue"]) {
      repository.saveRecommendation({ dish, recommendations, cellarFingerprint: "x" });
    }
    expect(repository.listRecentDishes(5)).toEqual(["fondue", "Lachs"]);
  });
});
```

`src/server/repository/ai-usage-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { AiUsageRepository } from "./ai-usage-repository";

describe("AiUsageRepository", () => {
  it("counts calls since a point in time", () => {
    const repository = new AiUsageRepository(openDatabase(IN_MEMORY_DATABASE));
    repository.recordUsage({ operation: "analyzeLabel", inputTokens: 1200, outputTokens: 150 });
    repository.recordUsage({ operation: "researchWine", inputTokens: 30000, outputTokens: 900 });

    expect(repository.countCallsSince(new Date(Date.now() - 60_000))).toBe(2);
    expect(repository.countCallsSince(new Date(Date.now() + 60_000))).toBe(0);
  });
});
```

`src/server/repository/settings-repository.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IN_MEMORY_DATABASE, openDatabase } from "../database/connection";
import { SettingsRepository } from "./settings-repository";

describe("SettingsRepository", () => {
  it("returns defaults and persists changes", () => {
    const repository = new SettingsRepository(openDatabase(IN_MEMORY_DATABASE));

    expect(repository.getCurrency()).toBe("CHF");
    expect(repository.getMonthlyAiCallLimit()).toBe(300);

    repository.setCurrency("EUR");
    repository.setMonthlyAiCallLimit(50);
    repository.setMonthlyAiCallLimit(80);

    expect(repository.getCurrency()).toBe("EUR");
    expect(repository.getMonthlyAiCallLimit()).toBe(80);
  });
});
```

Run: `npx vitest run src/server/repository` → the three new files FAIL.

- [ ] **Step 6: Implement the three small repositories**

`src/server/repository/dish-recommendation-repository.ts`:

```ts
import { desc, eq } from "drizzle-orm";
import type { WineCellarDatabase } from "../database/connection";
import {
  dishRecommendations,
  type DishRecommendationRecord,
  type StoredDishRecommendation,
} from "../database/schema";

export interface NewDishRecommendation {
  dish: string;
  recommendations: StoredDishRecommendation[];
  cellarFingerprint: string;
}

export function normalizeDish(dish: string): string {
  return dish.trim().replace(/\s+/g, " ").toLowerCase();
}

export class DishRecommendationRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  saveRecommendation(entry: NewDishRecommendation): DishRecommendationRecord {
    return this.database
      .insert(dishRecommendations)
      .values({ ...entry, dish: entry.dish.trim(), normalizedDish: normalizeDish(entry.dish) })
      .returning()
      .get();
  }

  findLatestForDish(dish: string): DishRecommendationRecord | null {
    const latestEntry = this.database
      .select()
      .from(dishRecommendations)
      .where(eq(dishRecommendations.normalizedDish, normalizeDish(dish)))
      .orderBy(desc(dishRecommendations.id))
      .limit(1)
      .get();
    return latestEntry ?? null;
  }

  listRecentDishes(limit: number): string[] {
    const allEntries = this.database
      .select({ dish: dishRecommendations.dish, normalizedDish: dishRecommendations.normalizedDish })
      .from(dishRecommendations)
      .orderBy(desc(dishRecommendations.id))
      .all();

    const seenDishes = new Set<string>();
    const recentDishes: string[] = [];
    for (const entry of allEntries) {
      if (seenDishes.has(entry.normalizedDish)) continue;
      seenDishes.add(entry.normalizedDish);
      recentDishes.push(entry.dish);
      if (recentDishes.length === limit) break;
    }
    return recentDishes;
  }
}
```

`src/server/repository/ai-usage-repository.ts`:

```ts
import { count, gte } from "drizzle-orm";
import type { WineCellarDatabase } from "../database/connection";
import { aiUsage } from "../database/schema";

export interface AiUsageEntry {
  operation: string;
  inputTokens: number;
  outputTokens: number;
}

export class AiUsageRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  recordUsage(entry: AiUsageEntry): void {
    this.database.insert(aiUsage).values(entry).run();
  }

  countCallsSince(since: Date): number {
    const result = this.database
      .select({ callCount: count() })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, since))
      .get();
    return result?.callCount ?? 0;
  }
}
```

`src/server/repository/settings-repository.ts`:

```ts
import { eq } from "drizzle-orm";
import { DEFAULT_CURRENCY, DEFAULT_MONTHLY_AI_CALL_LIMIT } from "@/domain/constants";
import type { WineCellarDatabase } from "../database/connection";
import { settings } from "../database/schema";

const CURRENCY_KEY = "currency";
const MONTHLY_AI_CALL_LIMIT_KEY = "monthlyAiCallLimit";

export class SettingsRepository {
  constructor(private readonly database: WineCellarDatabase) {}

  getCurrency(): string {
    return this.readValue(CURRENCY_KEY) ?? DEFAULT_CURRENCY;
  }

  setCurrency(currency: string): void {
    this.writeValue(CURRENCY_KEY, currency);
  }

  getMonthlyAiCallLimit(): number {
    const storedLimit = Number(this.readValue(MONTHLY_AI_CALL_LIMIT_KEY));
    return Number.isInteger(storedLimit) && storedLimit > 0
      ? storedLimit
      : DEFAULT_MONTHLY_AI_CALL_LIMIT;
  }

  setMonthlyAiCallLimit(limit: number): void {
    this.writeValue(MONTHLY_AI_CALL_LIMIT_KEY, String(limit));
  }

  private readValue(key: string): string | null {
    return this.database.select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
  }

  private writeValue(key: string, value: string): void {
    this.database
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
  }
}
```

Run: `npx vitest run src/server/repository` → all PASS.

- [ ] **Step 7: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add repositories for wines, tastings, pairings, ai usage and settings"
npm run deploy:local
```

---

### Task 5: Photo storage

**Files:**
- Create: `src/server/photo-storage/photo-storage.ts`
- Test: `src/server/photo-storage/photo-storage.test.ts`

**Interfaces:**
- Consumes: photo constants from `src/domain/constants.ts`.
- Produces:
  - `class PhotoStorage { constructor(photoDirectory: string) }`
  - `storeLabelPhoto(uploadedBytes: Buffer): Promise<string>` → generated file name `<uuid>.jpg`
  - `readLabelPhoto(fileName: string): Promise<Buffer>`
  - `deleteLabelPhoto(fileName: string): Promise<void>` (missing file is not an error)
  - `class InvalidPhotoError extends Error` with `reason: "tooLarge" | "notAnImage" | "invalidFileName"`

- [ ] **Step 1: Install sharp**

```bash
npm install sharp
```

- [ ] **Step 2: Write the failing tests**

`src/server/photo-storage/photo-storage.test.ts`:

```ts
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MAXIMUM_PHOTO_UPLOAD_BYTES } from "@/domain/constants";
import { InvalidPhotoError, PhotoStorage } from "./photo-storage";

let photoDirectory: string;
let photoStorage: PhotoStorage;

async function createTestImage(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: "#7b2d3a" } })
    .png()
    .withExif({ IFD0: { Copyright: "secret-location-data" } })
    .toBuffer();
}

beforeEach(async () => {
  photoDirectory = await mkdtemp(path.join(tmpdir(), "weinkeller-photos-"));
  photoStorage = new PhotoStorage(photoDirectory);
});

afterEach(async () => {
  await rm(photoDirectory, { recursive: true, force: true });
});

describe("PhotoStorage", () => {
  it("re-encodes uploads as downsized JPEG without metadata", async () => {
    const fileName = await photoStorage.storeLabelPhoto(await createTestImage(3000, 2000));

    expect(fileName).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    const storedBytes = await photoStorage.readLabelPhoto(fileName);
    const metadata = await sharp(storedBytes).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(1500);
    expect(metadata.height).toBe(1000);
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects files that are not images", async () => {
    const notAnImage = Buffer.from("<script>alert(1)</script>");
    await expect(photoStorage.storeLabelPhoto(notAnImage)).rejects.toMatchObject({
      reason: "notAnImage",
    });
    expect(await readdir(photoDirectory)).toEqual([]);
  });

  it("rejects oversized uploads before decoding them", async () => {
    const oversizedUpload = Buffer.alloc(MAXIMUM_PHOTO_UPLOAD_BYTES + 1);
    await expect(photoStorage.storeLabelPhoto(oversizedUpload)).rejects.toMatchObject({
      reason: "tooLarge",
    });
  });

  it.each(["../weinkeller.db", "..%2Fsecret.jpg", "photo.png", "/etc/passwd"])(
    "refuses to read %s",
    async (maliciousFileName) => {
      await expect(photoStorage.readLabelPhoto(maliciousFileName)).rejects.toBeInstanceOf(
        InvalidPhotoError,
      );
    },
  );

  it("deletes photos and tolerates missing files", async () => {
    const fileName = await photoStorage.storeLabelPhoto(await createTestImage(100, 100));
    await photoStorage.deleteLabelPhoto(fileName);
    await photoStorage.deleteLabelPhoto(fileName);
    expect(await readdir(photoDirectory)).toEqual([]);
  });
});
```

Run → FAIL.

- [ ] **Step 3: Implement photo storage**

`src/server/photo-storage/photo-storage.ts`:

```ts
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  MAXIMUM_PHOTO_EDGE_PIXELS,
  MAXIMUM_PHOTO_UPLOAD_BYTES,
  PHOTO_JPEG_QUALITY,
} from "@/domain/constants";

export type InvalidPhotoReason = "tooLarge" | "notAnImage" | "invalidFileName";

export class InvalidPhotoError extends Error {
  constructor(readonly reason: InvalidPhotoReason) {
    super(`Invalid photo: ${reason}`);
    this.name = "InvalidPhotoError";
  }
}

const ACCEPTED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);
// File names are generated here. Anything else never reaches the file system.
const GENERATED_FILE_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/;

export class PhotoStorage {
  constructor(private readonly photoDirectory: string) {}

  async storeLabelPhoto(uploadedBytes: Buffer): Promise<string> {
    if (uploadedBytes.byteLength > MAXIMUM_PHOTO_UPLOAD_BYTES) {
      throw new InvalidPhotoError("tooLarge");
    }
    const reencodedBytes = await this.reencodeAsJpeg(uploadedBytes);
    const fileName = `${randomUUID()}.jpg`;
    await writeFile(path.join(this.photoDirectory, fileName), reencodedBytes);
    return fileName;
  }

  async readLabelPhoto(fileName: string): Promise<Buffer> {
    return readFile(this.resolveSafePath(fileName));
  }

  async deleteLabelPhoto(fileName: string): Promise<void> {
    await rm(this.resolveSafePath(fileName), { force: true });
  }

  /** Re-encoding checks the real content type and strips EXIF data such as GPS positions. */
  private async reencodeAsJpeg(uploadedBytes: Buffer): Promise<Buffer> {
    try {
      const metadata = await sharp(uploadedBytes).metadata();
      if (!metadata.format || !ACCEPTED_IMAGE_FORMATS.has(metadata.format)) {
        throw new InvalidPhotoError("notAnImage");
      }
      return await sharp(uploadedBytes)
        .rotate()
        .resize({
          width: MAXIMUM_PHOTO_EDGE_PIXELS,
          height: MAXIMUM_PHOTO_EDGE_PIXELS,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: PHOTO_JPEG_QUALITY })
        .toBuffer();
    } catch (error) {
      if (error instanceof InvalidPhotoError) throw error;
      throw new InvalidPhotoError("notAnImage");
    }
  }

  private resolveSafePath(fileName: string): string {
    if (!GENERATED_FILE_NAME_PATTERN.test(fileName)) {
      throw new InvalidPhotoError("invalidFileName");
    }
    return path.join(this.photoDirectory, fileName);
  }
}
```

Run: `npx vitest run src/server/photo-storage` → PASS.

- [ ] **Step 4: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add photo storage with content validation and metadata stripping"
npm run deploy:local
```

Expected: healthy. If the container fails to start with a sharp/libvips error, apply the same `outputFileTracingIncludes` remedy as in Task 3 Step 10 with `./node_modules/@img/**/*`.

---

## Part 1 Done When

- `npm run verify` is green.
- `npm run deploy:local` prints `Deployed and healthy`.
- `data/weinkeller.db` and `data/photos/` exist after the first deploy.
- Continue with `2026-09-19-weinkeller-2-intelligence-and-api.md`.
