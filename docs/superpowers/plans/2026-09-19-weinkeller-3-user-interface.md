# Weinkeller Part 3 — User Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The complete responsive German interface in the «Étiquette» style: cellar list, capture and confirmation, wine detail with tastings, "Bald trinken", food pairing, history, cellar value and settings.

**Architecture:** Client components talk to the API through one typed `apiClient` and one data hook. Pure helpers (labels, formatting, bar layout, form parsing) are unit-tested with Vitest. Behaviour is driven test-first by one serial Playwright journey that runs against a dev server with recorded AI answers and a throw-away data folder.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4 (`@theme` tokens), `next/font`, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-19-weinkeller-design.md` (sections 5 and 8). Approved mockups: `.superpowers/brainstorm/*/content/visual-style.html` (option B) and `screens-flow.html`.

**Prerequisite:** Parts 1 and 2 are complete.

## Global Constraints

Identical to Parts 1 and 2. In addition:

- All visible text is German with Swiss spelling (`ss`, never `ß`). Examples: «Weiss», «Süsswein», «Schliessen».
- UI code never imports `@/server/*`. It uses `@/lib/api-client`, `@/shared/api-contract` and `@/domain/*` only.
- AI and user text is rendered as plain React text. Never use `dangerouslySetInnerHTML`. External links get `target="_blank" rel="noopener noreferrer"`.
- Every input has a visible `<label>`. Every icon-only control has an accessible name. Tap targets are at least 44 px.
- Colours, fonts and radii come from the design tokens only. No hex values inside components.
- Layout works from 360 px width upwards. From `md` the navigation becomes a sidebar and lists use two columns.
- From this part on `npm run verify` also runs the Playwright journey.
- The implementer may load the `frontend-design` skill for visual polish. Tokens, structure, texts and accessible names in this plan are binding because the journey test relies on them.

## File Structure (this part)

```
playwright.config.ts, e2e/global-setup.ts, e2e/fixtures/label.jpg, e2e/journey.spec.ts
src/app/globals.css                         design tokens and component classes
src/app/layout.tsx                          fonts, metadata, shell
src/app/page.tsx                            Keller
src/app/soon/page.tsx                       Bald trinken
src/app/capture/page.tsx                    Erfassen
src/app/wines/[wineId]/page.tsx             detail, confirmation, duplicate, analysis states
src/app/pairing/page.tsx                    Essen → Wein
src/app/more/page.tsx, more/history/page.tsx, more/settings/page.tsx
src/lib/api-client.ts                       typed fetch wrapper
src/lib/use-api-resource.ts                 load / reload / poll hook
src/lib/german-labels.ts                    enum → German, error texts, formatting
src/lib/drinking-window-layout.ts           bar geometry
src/lib/form-values.ts                      text ↔ number / list parsing
src/components/layout/*                     app shell, navigation, page header
src/components/shared/*                     buttons, fields, notices, badges, photo
src/components/wine/*                       list item, window bar, detail, forms, panels
src/components/capture/capture-button.tsx
```

---

### Task 1: Playwright harness, design tokens, app shell

**Files:**
- Create: `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/fixtures/label.jpg`, `e2e/journey.spec.ts`, `src/components/layout/app-shell.tsx`, `navigation.tsx`, `page-header.tsx`, `src/components/capture/capture-button.tsx` (final version; Task 4 connects it to the upload)
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `package.json`, `.gitignore`, `eslint.config.mjs`

**Interfaces:**
- Produces: CSS classes `eyebrow`, `card`, `button-primary`, `button-ghost`, `field-input`, `field-label`, `pill`; `<AppShell>`, `<PageHeader eyebrow title>`; navigation links with the accessible names «Keller», «Bald», «Essen», «Mehr» and the control «Etikett fotografieren».

- [ ] **Step 1: Install Playwright and create the fixture**

```bash
npm install --save-dev @playwright/test
npx playwright install chromium
mkdir -p e2e/fixtures
node -e "require('sharp')({create:{width:600,height:800,channels:3,background:'#f3ead8'}}).jpeg().toFile('e2e/fixtures/label.jpg')"
```

Add to `.gitignore`: `.e2e-data/`, `test-results/`, `playwright-report/`.
Add `"e2e/**"` handling: in `eslint.config.mjs` add `"playwright-report/**"`, `"test-results/**"`, `".e2e-data/**"` to `globalIgnores`.

Add to `package.json` scripts and extend `verify`:

```json
"test:e2e": "playwright test",
"verify": "npm run format:check && npm run lint && npm run typecheck && npm run test && npm run test:e2e && npm audit --audit-level=high"
```

- [ ] **Step 2: Configure Playwright**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

const END_TO_END_PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  // One shared database and an ordered journey: run strictly one after another.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://localhost:${END_TO_END_PORT}`,
    ...devices["Pixel 7"],
    locale: "de-CH",
  },
  webServer: {
    command: `npx next dev --port ${END_TO_END_PORT}`,
    url: `http://localhost:${END_TO_END_PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      WINE_INTELLIGENCE_MODE: "recorded",
      DATA_DIRECTORY: "./.e2e-data",
    },
  },
});
```

`e2e/global-setup.ts`:

```ts
import { rm } from "node:fs/promises";

/** Every run starts with an empty cellar. */
export default async function globalSetup(): Promise<void> {
  await rm("./.e2e-data", { recursive: true, force: true });
}
```

- [ ] **Step 3: Write the first failing journey step**

`e2e/journey.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("shows the German shell with navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Weinkeller");
  await expect(page.locator("html")).toHaveAttribute("lang", "de-CH");
  for (const linkName of ["Keller", "Bald", "Essen", "Mehr"]) {
    await expect(page.getByRole("link", { name: linkName, exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("Etikett fotografieren")).toBeAttached();
});
```

Run: `npm run test:e2e` → FAIL (title is the scaffold default).

- [ ] **Step 4: Define the design tokens**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-paper: #f6f1e7;
  --color-card: #fffdf8;
  --color-ink: #2a2622;
  --color-ink-muted: #6b6259;
  --color-line: #d9d0c0;
  --color-bordeaux: #7b2d3a;
  --color-bordeaux-dark: #5f212c;
  --color-gold: #b79b6c;
  --color-alert: #9a3b12;

  --font-serif: var(--font-garamond), Georgia, "Times New Roman", serif;
  --font-sans: var(--font-inter), system-ui, sans-serif;
}

@layer base {
  body {
    @apply bg-paper text-ink font-serif text-[1.0625rem] leading-relaxed antialiased;
  }
  h1 {
    @apply text-3xl italic font-normal leading-tight;
  }
  h2 {
    @apply text-xl italic font-normal;
  }
  :focus-visible {
    @apply outline-2 outline-offset-2 outline-bordeaux;
  }
}

@layer components {
  .eyebrow {
    @apply font-sans text-[0.6875rem] uppercase tracking-[0.14em] text-bordeaux;
  }
  .card {
    @apply bg-card border border-ink rounded-xs p-4;
  }
  .pill {
    @apply inline-flex items-center font-sans text-xs border border-bordeaux text-bordeaux rounded-full px-2.5 py-0.5;
  }
  .button-primary {
    @apply inline-flex items-center justify-center min-h-11 px-5 bg-bordeaux text-paper font-sans text-xs uppercase tracking-[0.1em] rounded-xs transition-colors hover:bg-bordeaux-dark disabled:opacity-50;
  }
  .button-ghost {
    @apply inline-flex items-center justify-center min-h-11 px-5 border border-bordeaux text-bordeaux font-sans text-xs uppercase tracking-[0.1em] rounded-xs transition-colors hover:bg-bordeaux hover:text-paper disabled:opacity-50;
  }
  .field-label {
    @apply block font-sans text-xs text-ink-muted mb-1;
  }
  .field-input {
    @apply w-full min-h-11 bg-card border border-line rounded-xs px-3 font-serif text-base text-ink focus:border-bordeaux;
  }
}
```

- [ ] **Step 5: Build the shell**

`src/components/capture/capture-button.tsx` (upload behaviour is added in Task 4; the control and its accessible name exist from now on):

```tsx
"use client";

import { useId } from "react";

export interface CaptureButtonProps {
  variant: "navigation" | "large";
  onPhotoSelected?: (photo: File) => void;
}

const VARIANT_CLASSES: Record<CaptureButtonProps["variant"], string> = {
  navigation:
    "flex h-14 w-14 items-center justify-center rounded-full bg-bordeaux text-paper text-3xl leading-none cursor-pointer -mt-6 md:mt-0 shadow-md",
  large: "button-primary w-full cursor-pointer",
};

export function CaptureButton({ variant, onPhotoSelected }: CaptureButtonProps) {
  const inputId = useId();

  return (
    <label htmlFor={inputId} className={VARIANT_CLASSES[variant]}>
      <span className={variant === "navigation" ? "sr-only" : undefined}>Etikett fotografieren</span>
      {variant === "navigation" && <span aria-hidden="true">+</span>}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => {
          const photo = event.target.files?.[0];
          if (photo) onPhotoSelected?.(photo);
          event.target.value = "";
        }}
      />
    </label>
  );
}
```

`src/components/layout/navigation.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAVIGATION_LINKS = [
  { href: "/", label: "Keller" },
  { href: "/soon", label: "Bald" },
  { href: "/pairing", label: "Essen" },
  { href: "/more", label: "Mehr" },
] as const;

function isActivePath(currentPath: string, href: string): boolean {
  return href === "/" ? currentPath === "/" : currentPath.startsWith(href);
}

function NavigationLink({ href, label }: { href: string; label: string }) {
  const isActive = isActivePath(usePathname(), href);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-11 items-center justify-center px-3 font-sans text-xs uppercase tracking-[0.1em] md:justify-start ${
        isActive ? "text-bordeaux font-semibold" : "text-ink-muted"
      }`}
    >
      {label}
    </Link>
  );
}

/** Bottom bar on phones, sidebar from the md breakpoint. The capture control sits in the middle. */
export function Navigation({ captureControl }: { captureControl: ReactNode }) {
  const [cellarLink, soonLink, pairingLink, moreLink] = NAVIGATION_LINKS;
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-ink bg-paper pb-[env(safe-area-inset-bottom)] md:sticky md:top-0 md:h-dvh md:w-52 md:flex-col md:items-stretch md:justify-start md:gap-1 md:border-r md:border-t-0 md:p-6"
    >
      <p className="hidden text-2xl italic md:mb-6 md:block">Weinkeller</p>
      <NavigationLink {...cellarLink} />
      <NavigationLink {...soonLink} />
      <div className="md:order-last md:mt-6 md:flex md:justify-center">{captureControl}</div>
      <NavigationLink {...pairingLink} />
      <NavigationLink {...moreLink} />
    </nav>
  );
}
```

`src/components/layout/app-shell.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CaptureButton } from "@/components/capture/capture-button";
import { Navigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Task 4 replaces this handler with the real upload.
  const openCapturePage = () => router.push("/capture");

  return (
    <div className="min-h-dvh md:flex">
      <Navigation
        captureControl={<CaptureButton variant="navigation" onPhotoSelected={openCapturePage} />}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-10">
        {children}
      </main>
    </div>
  );
}
```

`src/components/layout/page-header.tsx`:

```tsx
import type { ReactNode } from "react";

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 border-b border-ink pb-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}
```

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-garamond", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Weinkeller",
  description: "Der eigene Weinkeller: erfassen, bewerten, rechtzeitig geniessen.",
};

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de-CH" className={`${garamond.variable} ${inter.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

`themeColor` is the one permitted hex value outside the CSS tokens: the browser needs a literal.

Replace `src/app/page.tsx`:

```tsx
import { PageHeader } from "@/components/layout/page-header";

export default function CellarPage() {
  return <PageHeader eyebrow="Mein Keller" title="Guten Abend" />;
}
```

Delete scaffold leftovers that are no longer referenced (`src/app/page.module.css`, unused SVGs in `public/`).

Run: `npm run test:e2e` → PASS.

- [ ] **Step 6: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add design tokens, app shell and playwright journey harness"
npm run deploy:local
```

Open `http://localhost:3000` on the laptop and on a phone in the same network (`http://<laptop-ip>:3000`): cream background, serif title, bottom navigation on the phone, sidebar on the laptop.

---

### Task 2: API client, data hook and presentation helpers

**Files:**
- Create: `src/lib/api-client.ts`, `src/lib/use-api-resource.ts`, `src/lib/german-labels.ts`, `src/lib/drinking-window-layout.ts`, `src/lib/form-values.ts`
- Modify: `src/shared/api-contract.ts` (request types)
- Test: `src/lib/api-client.test.ts`, `german-labels.test.ts`, `drinking-window-layout.test.ts`, `form-values.test.ts`

**Interfaces:**
- Produces:
  - Request types `WineConfirmationRequest`, `WineEditRequest`, `TastingRequest`, `WineListQuery`
  - `class ApiClientError extends Error { code: string; status: number }`
  - `apiClient`: `listWines(query)`, `uploadLabelPhoto(photo)`, `getWine(id)`, `editWine(id, changes)`, `deleteWine(id)`, `confirmWine(id, fields)`, `mergeWine(id, bottleCount)`, `startAnalysis(id, mode)`, `recordTasting(id, tasting)`, `listTastings()`, `listRecentDishes()`, `recommendForDish(dish, shouldForceRefresh)`, `getCellarSummary()`, `getSettings()`, `saveSettings(settings)`
  - `useApiResource<T>(load, options?): { data: T | null; errorCode: string | null; isLoading: boolean; reload: () => void }`
  - `WINE_TYPE_LABELS`, `MATURITY_LABELS`, `ANALYSIS_STATUS_LABELS`, `describeError(code)`, `formatWineTitle(wine)`, `formatWineOrigin(wine)`, `formatCurrency(amount, currency)`, `formatBottleCount(count)`
  - `calculateWindowBarLayout(window, currentYear): { windowStartPercent; windowWidthPercent; todayPercent; firstYear; lastYear } | null`
  - `parseOptionalNumber(text)`, `parseOptionalInteger(text)`, `parseCommaSeparatedList(text)`, `toInputText(value)`

- [ ] **Step 1: Add the request types to the contract**

Append to `src/shared/api-contract.ts`:

```ts
export interface WineIdentityRequestFields {
  producer: string | null;
  name: string | null;
  vintage: number | null;
  country: string | null;
  region: string | null;
  appellation: string | null;
  grapeVarieties: string[];
  wineType: WineType | null;
}

export interface WineConfirmationRequest extends WineIdentityRequestFields {
  bottleCount: number;
  storageLocation: string | null;
  purchasePricePerBottle: number | null;
}

export type WineEditRequest = Partial<
  WineConfirmationRequest & { drinkFromYear: number | null; drinkUntilYear: number | null }
>;

export interface TastingRequest {
  tastedOn: string;
  starRating: number | null;
  tastingNote: string | null;
  occasionOrDish: string | null;
}

export interface WineListQuery {
  search?: string;
  wineType?: WineType;
  maturity?: DrinkingMaturity;
  includeEmpty?: boolean;
  sort?: "newest" | "urgency";
}
```

- [ ] **Step 2: Write the failing helper tests**

`src/lib/german-labels.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  describeError,
  formatBottleCount,
  formatCurrency,
  formatWineOrigin,
  formatWineTitle,
} from "./german-labels";

describe("german labels", () => {
  it("builds a wine title from the best available fields", () => {
    expect(formatWineTitle({ producer: "Antinori", name: "Tignanello", vintage: 2018 })).toBe(
      "Tignanello 2018",
    );
    expect(formatWineTitle({ producer: "Krug", name: null, vintage: null })).toBe("Krug");
    expect(formatWineTitle({ producer: null, name: null, vintage: null })).toBe("Unbekannter Wein");
  });

  it("joins origin parts and skips missing ones", () => {
    expect(formatWineOrigin({ region: "Toskana", country: "Italien" })).toBe("Toskana · Italien");
    expect(formatWineOrigin({ region: null, country: null })).toBe("");
  });

  it("formats money without decimals and bottle counts with correct plural", () => {
    const formatted = formatCurrency(1400, "CHF");
    expect(formatted).toContain("CHF");
    expect(formatted).toMatch(/1.?400/);
    expect(formatBottleCount(1)).toBe("1 Flasche");
    expect(formatBottleCount(6)).toBe("6 Flaschen");
  });

  it("explains known error codes and falls back for unknown ones", () => {
    expect(describeError("missingApiKey")).toContain("API-Schlüssel");
    expect(describeError("somethingNew")).toBe("Etwas ist schiefgelaufen. Bitte versuche es erneut.");
  });
});
```

`src/lib/drinking-window-layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateWindowBarLayout } from "./drinking-window-layout";

describe("calculateWindowBarLayout", () => {
  it("returns null without a complete window", () => {
    expect(calculateWindowBarLayout({ drinkFromYear: null, drinkUntilYear: 2030 }, 2026)).toBeNull();
  });

  it("places window and today on a scale with one year of padding", () => {
    const layout = calculateWindowBarLayout({ drinkFromYear: 2024, drinkUntilYear: 2032 }, 2026);
    expect(layout).toEqual({
      firstYear: 2023,
      lastYear: 2033,
      windowStartPercent: 10,
      windowWidthPercent: 80,
      todayPercent: 30,
    });
  });

  it("extends the scale when today lies outside the window", () => {
    const layout = calculateWindowBarLayout({ drinkFromYear: 2030, drinkUntilYear: 2040 }, 2026);
    expect(layout?.firstYear).toBe(2025);
    expect(layout?.todayPercent).toBeCloseTo(6.25);
  });
});
```

`src/lib/form-values.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  parseCommaSeparatedList,
  parseOptionalInteger,
  parseOptionalNumber,
  toInputText,
} from "./form-values";

describe("form values", () => {
  it("parses optional numbers, accepting a decimal comma", () => {
    expect(parseOptionalNumber(" 95,50 ")).toBe(95.5);
    expect(parseOptionalNumber("")).toBeNull();
    expect(parseOptionalNumber("abc")).toBeNull();
  });

  it("parses optional integers", () => {
    expect(parseOptionalInteger("2018")).toBe(2018);
    expect(parseOptionalInteger("20.5")).toBeNull();
  });

  it("splits comma separated lists and drops empty entries", () => {
    expect(parseCommaSeparatedList("Sangiovese, , Merlot ")).toEqual(["Sangiovese", "Merlot"]);
  });

  it("turns values into input text", () => {
    expect(toInputText(null)).toBe("");
    expect(toInputText(2018)).toBe("2018");
  });
});
```

`src/lib/api-client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiClientError } from "./api-client";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("apiClient", () => {
  it("builds list queries from defined values only", async () => {
    const fetchMock = stubFetch(Response.json({ wines: [] }));
    await apiClient.listWines({ search: "tig", wineType: undefined, includeEmpty: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/wines?search=tig&includeEmpty=true");
  });

  it("sends JSON bodies", async () => {
    const fetchMock = stubFetch(Response.json({ wine: { id: 1 } }));
    await apiClient.mergeWine(7, 3);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/wines/7/merge");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ bottleCount: 3 });
  });

  it("turns error responses into ApiClientError with the server code", async () => {
    stubFetch(Response.json({ error: { code: "budgetExceeded", message: "x" } }, { status: 429 }));
    await expect(apiClient.getCellarSummary()).rejects.toMatchObject({
      code: "budgetExceeded",
      status: 429,
    });
  });

  it("reports network failures as offline", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(apiClient.getSettings()).rejects.toBeInstanceOf(ApiClientError);
    await expect(apiClient.getSettings()).rejects.toMatchObject({ code: "offline" });
  });
});
```

Run: `npx vitest run src/lib` → FAIL.

- [ ] **Step 3: Implement the helpers**

`src/lib/german-labels.ts`:

```ts
import type { AnalysisStatus, DrinkingMaturity, WineType } from "@/domain/wine-types";

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  red: "Rot",
  white: "Weiss",
  rose: "Rosé",
  sparkling: "Schaumwein",
  sweet: "Süsswein",
};

export const MATURITY_LABELS: Record<DrinkingMaturity, string> = {
  tooYoung: "zu jung",
  ready: "trinkreif",
  drinkSoon: "bald trinken",
  overdue: "überfällig",
  unknown: "Reife unbekannt",
};

export const ANALYSIS_STATUS_LABELS: Record<AnalysisStatus, string> = {
  pending: "wartet auf Analyse",
  analyzing: "wird analysiert …",
  awaitingConfirmation: "bitte bestätigen",
  complete: "im Keller",
  failed: "Analyse fehlgeschlagen",
};

const FALLBACK_ERROR_MESSAGE = "Etwas ist schiefgelaufen. Bitte versuche es erneut.";

const ERROR_MESSAGES: Record<string, string> = {
  offline: "Keine Verbindung zum Weinkeller-Server.",
  labelUnreadable: "Auf dem Foto wurde kein Weinetikett erkannt.",
  invalidResponse: "Die KI hat keine brauchbare Antwort geliefert.",
  unavailable: "Der KI-Dienst ist gerade nicht erreichbar. Das Foto ist gespeichert.",
  missingApiKey: "Es ist kein API-Schlüssel hinterlegt. Trage ANTHROPIC_API_KEY im Container ein.",
  invalidApiKey: "Der API-Schlüssel wurde abgelehnt. Prüfe ANTHROPIC_API_KEY im Container.",
  budgetExceeded: "Die monatliche Obergrenze für KI-Aufrufe ist erreicht (siehe Einstellungen).",
  rateLimited: "Zu viele KI-Anfragen in kurzer Zeit. Bitte warte eine Minute.",
  invalidPhoto: "Diese Datei ist kein unterstütztes Bild (JPEG, PNG oder WebP).",
  photoTooLarge: "Das Foto ist zu gross (maximal 15 MB).",
  invalidInput: "Bitte prüfe die Eingaben.",
  identityMissing: "Bitte gib mindestens Weingut oder Weinname ein.",
  analysisRunning: "Die Analyse läuft bereits.",
  notFound: "Dieser Eintrag existiert nicht mehr.",
};

export function describeError(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] ?? FALLBACK_ERROR_MESSAGE;
}

export function formatWineTitle(wine: {
  producer: string | null;
  name: string | null;
  vintage: number | null;
}): string {
  const baseTitle = wine.name ?? wine.producer ?? "Unbekannter Wein";
  return wine.vintage === null ? baseTitle : `${baseTitle} ${wine.vintage}`;
}

export function formatWineOrigin(wine: { region: string | null; country: string | null }): string {
  return [wine.region, wine.country].filter((part) => part !== null).join(" · ");
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatBottleCount(bottleCount: number): string {
  return bottleCount === 1 ? "1 Flasche" : `${bottleCount} Flaschen`;
}
```

`src/lib/drinking-window-layout.ts`:

```ts
import type { DrinkingWindow } from "@/domain/wine-types";

const SCALE_PADDING_YEARS = 1;
const FULL_WIDTH_PERCENT = 100;

export interface WindowBarLayout {
  firstYear: number;
  lastYear: number;
  windowStartPercent: number;
  windowWidthPercent: number;
  todayPercent: number;
}

/** Geometry of the drinking window bar: a year scale that always contains window and today. */
export function calculateWindowBarLayout(
  window: DrinkingWindow,
  currentYear: number,
): WindowBarLayout | null {
  const { drinkFromYear, drinkUntilYear } = window;
  if (drinkFromYear === null || drinkUntilYear === null) return null;

  const firstYear = Math.min(drinkFromYear, currentYear) - SCALE_PADDING_YEARS;
  const lastYear = Math.max(drinkUntilYear, currentYear) + SCALE_PADDING_YEARS;
  const percentPerYear = FULL_WIDTH_PERCENT / (lastYear - firstYear);

  return {
    firstYear,
    lastYear,
    windowStartPercent: (drinkFromYear - firstYear) * percentPerYear,
    windowWidthPercent: (drinkUntilYear - drinkFromYear) * percentPerYear,
    todayPercent: (currentYear - firstYear) * percentPerYear,
  };
}
```

`src/lib/form-values.ts`:

```ts
export function parseOptionalNumber(text: string): number | null {
  const normalizedText = text.trim().replace(",", ".");
  if (normalizedText === "") return null;
  const parsedNumber = Number(normalizedText);
  return Number.isFinite(parsedNumber) ? parsedNumber : null;
}

export function parseOptionalInteger(text: string): number | null {
  const parsedNumber = parseOptionalNumber(text);
  return parsedNumber !== null && Number.isInteger(parsedNumber) ? parsedNumber : null;
}

export function parseCommaSeparatedList(text: string): string[] {
  return text
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

export function toInputText(value: string | number | null): string {
  return value === null ? "" : String(value);
}
```

- [ ] **Step 4: Implement the API client**

`src/lib/api-client.ts`:

```ts
import type {
  ApiErrorBody,
  CellarSummaryResponse,
  DishRecommendationResponse,
  SettingsResponse,
  TastingHistoryEntry,
  TastingRequest,
  TastingResponse,
  WineConfirmationRequest,
  WineEditRequest,
  WineListQuery,
  WineResponse,
} from "@/shared/api-contract";

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(`API request failed: ${code}`);
    this.name = "ApiClientError";
  }
}

const NO_CONTENT_STATUS = 204;

async function request<ResponseBody>(path: string, init?: RequestInit): Promise<ResponseBody> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiClientError("offline", 0);
  }
  if (response.status === NO_CONTENT_STATUS) return undefined as ResponseBody;

  const responseBody: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const errorCode = (responseBody as ApiErrorBody | null)?.error?.code ?? "unexpected";
    throw new ApiClientError(errorCode, response.status);
  }
  return responseBody as ResponseBody;
}

function sendJson<ResponseBody>(path: string, method: string, body: unknown): Promise<ResponseBody> {
  return request<ResponseBody>(path, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildQueryString(query: WineListQuery): string {
  const searchParameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") searchParameters.set(key, String(value));
  }
  const queryString = searchParameters.toString();
  return queryString === "" ? "" : `?${queryString}`;
}

type WineEnvelope = { wine: WineResponse };

export const apiClient = {
  listWines: (query: WineListQuery) =>
    request<{ wines: WineResponse[] }>(`/api/wines${buildQueryString(query)}`),

  uploadLabelPhoto: (photo: File) => {
    const formData = new FormData();
    formData.set("photo", photo);
    return request<WineEnvelope>("/api/wines", { method: "POST", body: formData });
  },

  getWine: (wineId: number) =>
    request<{ wine: WineResponse; tastings: TastingResponse[] }>(`/api/wines/${wineId}`),

  editWine: (wineId: number, changes: WineEditRequest) =>
    sendJson<WineEnvelope>(`/api/wines/${wineId}`, "PATCH", changes),

  deleteWine: (wineId: number) => request<void>(`/api/wines/${wineId}`, { method: "DELETE" }),

  confirmWine: (wineId: number, fields: WineConfirmationRequest) =>
    sendJson<WineEnvelope>(`/api/wines/${wineId}/confirmation`, "POST", fields),

  mergeWine: (wineId: number, bottleCount: number) =>
    sendJson<WineEnvelope>(`/api/wines/${wineId}/merge`, "POST", { bottleCount }),

  startAnalysis: (wineId: number, mode: "full" | "researchOnly") =>
    sendJson<WineEnvelope>(`/api/wines/${wineId}/analysis`, "POST", { mode }),

  recordTasting: (wineId: number, tasting: TastingRequest) =>
    sendJson<WineEnvelope & { tasting: TastingResponse }>(
      `/api/wines/${wineId}/tastings`,
      "POST",
      tasting,
    ),

  listTastings: () => request<{ tastings: TastingHistoryEntry[] }>("/api/tastings"),

  listRecentDishes: () => request<{ recentDishes: string[] }>("/api/dish-recommendations"),

  recommendForDish: (dish: string, shouldForceRefresh: boolean) =>
    sendJson<DishRecommendationResponse>("/api/dish-recommendations", "POST", {
      dish,
      shouldForceRefresh,
    }),

  getCellarSummary: () => request<CellarSummaryResponse>("/api/cellar-summary"),

  getSettings: () => request<SettingsResponse>("/api/settings"),

  saveSettings: (settings: SettingsResponse) =>
    sendJson<SettingsResponse>("/api/settings", "PUT", settings),
};
```

Run: `npx vitest run src/lib` → PASS.

- [ ] **Step 5: Implement the data hook**

`src/lib/use-api-resource.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiClientError } from "./api-client";

export interface ApiResourceOptions<Data> {
  pollIntervalMilliseconds?: number;
  /** Polling continues only while this returns true. Defaults to always. */
  shouldPoll?: (data: Data) => boolean;
}

export interface ApiResource<Data> {
  data: Data | null;
  errorCode: string | null;
  isLoading: boolean;
  reload: () => void;
}

export function toErrorCode(error: unknown): string {
  return error instanceof ApiClientError ? error.code : "unexpected";
}

/**
 * Loads data, keeps the previous data visible while reloading, and optionally polls.
 * `load` must be stable (wrap it in useCallback), otherwise it reloads on every render.
 */
export function useApiResource<Data>(
  load: () => Promise<Data>,
  options: ApiResourceOptions<Data> = {},
): ApiResource<Data> {
  const { pollIntervalMilliseconds, shouldPoll } = options;
  const [data, setData] = useState<Data | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadCounter, setReloadCounter] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    load()
      .then((loadedData) => {
        if (isCancelled) return;
        setData(loadedData);
        setErrorCode(null);
      })
      .catch((error: unknown) => {
        if (!isCancelled) setErrorCode(toErrorCode(error));
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [load, reloadCounter]);

  const isPollingWanted =
    pollIntervalMilliseconds !== undefined && data !== null && (shouldPoll?.(data) ?? true);
  useEffect(() => {
    if (!isPollingWanted) return;
    const timer = setInterval(
      () => setReloadCounter((counter) => counter + 1),
      pollIntervalMilliseconds,
    );
    return () => clearInterval(timer);
  }, [isPollingWanted, pollIntervalMilliseconds]);

  const reload = useCallback(() => setReloadCounter((counter) => counter + 1), []);
  return { data, errorCode, isLoading, reload };
}
```

This polling is not an automatic AI refresh: it only re-reads the local database while the user waits for an analysis they started.

- [ ] **Step 6: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add api client, data hook and presentation helpers"
npm run deploy:local
```

---

### Task 3: Shared components and the cellar list

**Files:**
- Create: `src/components/shared/error-notice.tsx`, `empty-state.tsx`, `text-field.tsx`, `wine-photo.tsx`, `maturity-badge.tsx`, `score-badge.tsx`, `src/components/wine/wine-list-item.tsx`, `wine-list.tsx`, `cellar-filters.tsx`
- Modify: `src/app/page.tsx`, `e2e/journey.spec.ts`

**Interfaces:**
- Consumes: `apiClient`, `useApiResource`, labels.
- Produces: `<ErrorNotice errorCode onRetry?>`, `<EmptyState title hint>`, `<TextField label value onChange …>`, `<WinePhoto photoUrl alt size>`, `<MaturityBadge maturity>`, `<ScoreBadge score confidence>`, `<WineList wines>`, `<WineListItem wine>`, `<CellarFilters …>`

- [ ] **Step 1: Add the failing journey step**

Append to `e2e/journey.spec.ts`:

```ts
test("shows an inviting empty cellar", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Noch keine Weine" })).toBeVisible();
  await expect(page.getByLabel("Suche")).toBeVisible();
  await expect(page.getByLabel("Weintyp")).toBeVisible();
  await expect(page.getByLabel("Trinkreife")).toBeVisible();
});
```

Run: `npm run test:e2e` → the new test FAILS.

- [ ] **Step 2: Build the shared components**

`src/components/shared/error-notice.tsx`:

```tsx
import { describeError } from "@/lib/german-labels";

export function ErrorNotice({ errorCode, onRetry }: { errorCode: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card border-alert text-alert">
      <p>{describeError(errorCode)}</p>
      {onRetry && (
        <button type="button" className="button-ghost mt-3" onClick={onRetry}>
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
```

`src/components/shared/empty-state.tsx`:

```tsx
import type { ReactNode } from "react";

export function EmptyState({ title, hint, action }: { title: string; hint: string; action?: ReactNode }) {
  return (
    <section className="card mt-6 text-center">
      <h2>{title}</h2>
      <p className="mt-2 text-ink-muted">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </section>
  );
}
```

`src/components/shared/text-field.tsx`:

```tsx
import { useId } from "react";

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: "text" | "numeric" | "decimal";
  placeholder?: string;
  isRequired?: boolean;
  maximumLength?: number;
}

export function TextField(props: TextFieldProps) {
  const inputId = useId();
  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {props.label}
      </label>
      <input
        id={inputId}
        className="field-input"
        value={props.value}
        inputMode={props.inputMode ?? "text"}
        placeholder={props.placeholder}
        required={props.isRequired}
        maxLength={props.maximumLength ?? 200}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}
```

`src/components/shared/wine-photo.tsx`:

```tsx
const SIZE_CLASSES = {
  thumbnail: "h-20 w-14",
  hero: "h-56 w-full md:h-72",
} as const;

export function WinePhoto(props: { photoUrl: string; alt: string; size: keyof typeof SIZE_CLASSES }) {
  return (
    // The API already serves downsized, immutable JPEGs, so next/image would add nothing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={props.photoUrl}
      alt={props.alt}
      loading="lazy"
      className={`${SIZE_CLASSES[props.size]} shrink-0 rounded-xs border border-line bg-line object-cover`}
    />
  );
}
```

`src/components/shared/maturity-badge.tsx`:

```tsx
import type { DrinkingMaturity } from "@/domain/wine-types";
import { MATURITY_LABELS } from "@/lib/german-labels";

const URGENT_MATURITIES: DrinkingMaturity[] = ["drinkSoon", "overdue"];

export function MaturityBadge({ maturity }: { maturity: DrinkingMaturity }) {
  const isUrgent = URGENT_MATURITIES.includes(maturity);
  return (
    <span className={isUrgent ? "pill border-alert bg-alert text-paper" : "pill"}>
      {MATURITY_LABELS[maturity]}
    </span>
  );
}
```

`src/components/shared/score-badge.tsx`:

```tsx
import type { ResearchConfidence } from "@/domain/wine-types";

export function ScoreBadge(props: { score: number | null; confidence: ResearchConfidence | null }) {
  if (props.score !== null) return <span className="pill">{props.score} Pkt</span>;
  if (props.confidence === "estimated") return <span className="pill">geschätzt</span>;
  return null;
}
```

- [ ] **Step 3: Build the list components**

`src/components/wine/wine-list-item.tsx`:

```tsx
import Link from "next/link";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { WinePhoto } from "@/components/shared/wine-photo";
import { ANALYSIS_STATUS_LABELS, formatWineOrigin, formatWineTitle } from "@/lib/german-labels";
import type { WineResponse } from "@/shared/api-contract";

function WineListItemBadges({ wine }: { wine: WineResponse }) {
  if (wine.analysisStatus !== "complete") {
    return <span className="pill">{ANALYSIS_STATUS_LABELS[wine.analysisStatus]}</span>;
  }
  return (
    <>
      <ScoreBadge score={wine.aggregateScore} confidence={wine.confidence} />
      <MaturityBadge maturity={wine.drinkingMaturity} />
    </>
  );
}

export function WineListItem({ wine }: { wine: WineResponse }) {
  const title = formatWineTitle(wine);
  return (
    <li className="border-b border-line">
      <Link href={`/wines/${wine.id}`} className="flex items-center gap-3 py-3">
        <WinePhoto photoUrl={wine.photoUrl} alt="" size="thumbnail" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="truncate text-sm text-ink-muted">
            {[wine.producer, formatWineOrigin(wine)].filter(Boolean).join(" · ")}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <WineListItemBadges wine={wine} />
          </div>
        </div>
        {wine.analysisStatus === "complete" && (
          <p className="font-sans text-sm" aria-label={`${wine.bottleCount} Flaschen`}>
            {wine.bottleCount}×
          </p>
        )}
      </Link>
    </li>
  );
}
```

`src/components/wine/wine-list.tsx`:

```tsx
import type { WineResponse } from "@/shared/api-contract";
import { WineListItem } from "./wine-list-item";

export function WineList({ wines }: { wines: WineResponse[] }) {
  return (
    <ul className="md:grid md:grid-cols-2 md:gap-x-10">
      {wines.map((wine) => (
        <WineListItem key={wine.id} wine={wine} />
      ))}
    </ul>
  );
}
```

`src/components/wine/cellar-filters.tsx`:

```tsx
import { useId } from "react";
import {
  DRINKING_MATURITIES,
  WINE_TYPES,
  type DrinkingMaturity,
  type WineType,
} from "@/domain/wine-types";
import { MATURITY_LABELS, WINE_TYPE_LABELS } from "@/lib/german-labels";

export interface CellarFiltersProps {
  searchText: string;
  onSearchTextChange: (searchText: string) => void;
  wineType: WineType | "";
  onWineTypeChange: (wineType: WineType | "") => void;
  maturity: DrinkingMaturity | "";
  onMaturityChange: (maturity: DrinkingMaturity | "") => void;
}

export function CellarFilters(props: CellarFiltersProps) {
  const searchId = useId();
  const wineTypeId = useId();
  const maturityId = useId();
  return (
    <form role="search" className="grid grid-cols-2 gap-3" onSubmit={(event) => event.preventDefault()}>
      <div className="col-span-2">
        <label htmlFor={searchId} className="field-label">
          Suche
        </label>
        <input
          id={searchId}
          type="search"
          className="field-input"
          placeholder="Wein, Weingut, Region, Traube"
          value={props.searchText}
          onChange={(event) => props.onSearchTextChange(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor={wineTypeId} className="field-label">
          Weintyp
        </label>
        <select
          id={wineTypeId}
          className="field-input"
          value={props.wineType}
          onChange={(event) => props.onWineTypeChange(event.target.value as WineType | "")}
        >
          <option value="">Alle</option>
          {WINE_TYPES.map((wineType) => (
            <option key={wineType} value={wineType}>
              {WINE_TYPE_LABELS[wineType]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={maturityId} className="field-label">
          Trinkreife
        </label>
        <select
          id={maturityId}
          className="field-input"
          value={props.maturity}
          onChange={(event) => props.onMaturityChange(event.target.value as DrinkingMaturity | "")}
        >
          <option value="">Alle</option>
          {DRINKING_MATURITIES.map((maturity) => (
            <option key={maturity} value={maturity}>
              {MATURITY_LABELS[maturity]}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
```

If `CellarFilters` exceeds 80 lines under ESLint, extract a `SelectField` component (`label`, `value`, `onChange`, `options: { value: string; label: string }[]`) into `src/components/shared/select-field.tsx` and use it for both selects.

- [ ] **Step 4: Build the cellar page**

Replace `src/app/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { CellarFilters } from "@/components/wine/cellar-filters";
import { WineList } from "@/components/wine/wine-list";
import type { DrinkingMaturity, WineType } from "@/domain/wine-types";
import { apiClient } from "@/lib/api-client";
import { formatBottleCount } from "@/lib/german-labels";
import { useApiResource } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";

const POLL_INTERVAL_MILLISECONDS = 3000;

function hasRunningAnalysis(result: { wines: WineResponse[] }): boolean {
  return result.wines.some((wine) => ["pending", "analyzing"].includes(wine.analysisStatus));
}

function DrinkSoonTeaser() {
  const summary = useApiResource(useCallback(() => apiClient.getCellarSummary(), []));
  if (summary.data === null) return null;
  const urgentCount = summary.data.maturityCounts.drinkSoon + summary.data.maturityCounts.overdue;
  if (urgentCount === 0) return null;

  return (
    <Link href="/soon" className="card mb-6 block">
      <p className="eyebrow">Bald trinken</p>
      <p className="mt-1">
        {urgentCount === 1 ? "1 Wein sollte" : `${urgentCount} Weine sollten`} bald getrunken werden.
      </p>
    </Link>
  );
}

export default function CellarPage() {
  const [searchText, setSearchText] = useState("");
  const [wineType, setWineType] = useState<WineType | "">("");
  const [maturity, setMaturity] = useState<DrinkingMaturity | "">("");
  const loadWines = useCallback(
    () =>
      apiClient.listWines({
        search: searchText,
        wineType: wineType || undefined,
        maturity: maturity || undefined,
      }),
    [searchText, wineType, maturity],
  );
  const wineList = useApiResource(loadWines, {
    pollIntervalMilliseconds: POLL_INTERVAL_MILLISECONDS,
    shouldPoll: hasRunningAnalysis,
  });

  const wines = wineList.data?.wines ?? [];
  const totalBottles = wines.reduce((sum, wine) => sum + wine.bottleCount, 0);
  const hasFilter = searchText !== "" || wineType !== "" || maturity !== "";

  return (
    <>
      <PageHeader eyebrow={`Mein Keller · ${formatBottleCount(totalBottles)}`} title="Weinkeller" />
      <DrinkSoonTeaser />
      <CellarFilters
        searchText={searchText}
        onSearchTextChange={setSearchText}
        wineType={wineType}
        onWineTypeChange={setWineType}
        maturity={maturity}
        onMaturityChange={setMaturity}
      />
      {wineList.errorCode && <ErrorNotice errorCode={wineList.errorCode} onRetry={wineList.reload} />}
      {!wineList.isLoading && wines.length === 0 && !wineList.errorCode && (
        <EmptyState
          title={hasFilter ? "Nichts gefunden" : "Noch keine Weine"}
          hint={
            hasFilter
              ? "Kein Wein passt zu dieser Suche."
              : "Tippe auf + und fotografiere das erste Etikett."
          }
        />
      )}
      <WineList wines={wines} />
    </>
  );
}
```

Run: `npm run test:e2e` → PASS.

- [ ] **Step 5: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add cellar list with search, filter and empty state"
npm run deploy:local
```

---

### Task 4: Capture flow — upload, analysis status, confirmation, duplicates

**Files:**
- Create: `src/lib/use-photo-upload.ts`, `src/app/capture/page.tsx`, `src/app/wines/[wineId]/page.tsx`, `src/components/wine/analysis-status-panel.tsx`, `manual-identity-form.tsx`, `confirmation-form.tsx`, `identity-fields.tsx`, `duplicate-panel.tsx`, `delete-wine-button.tsx`
- Modify: `src/components/layout/app-shell.tsx`, `e2e/journey.spec.ts`

**Interfaces:**
- Consumes: `apiClient`, hook, helpers, shared components.
- Produces:
  - `usePhotoUpload(onUploaded: (wine: WineResponse) => void): { uploadPhoto(photo: File): void; isUploading: boolean; errorCode: string | null }`
  - `<IdentityFields values onChange>` with `IdentityFormValues` (all strings) and `toIdentityRequest(values): WineIdentityRequestFields`, `toIdentityFormValues(wine): IdentityFormValues`
  - `<ConfirmationForm wine onConfirmed>`, `<DuplicatePanel wine onMerged onDeleted>`, `<AnalysisStatusPanel wine onChanged onDeleted>`, `<DeleteWineButton wineId onDeleted>`
  - The wine page renders by state: `pending | analyzing | failed` → `AnalysisStatusPanel`; `awaitingConfirmation` with duplicate → `DuplicatePanel`; `awaitingConfirmation` → `ConfirmationForm`; `complete` → the text «Im Keller» placeholder heading replaced by `WineDetail` in Task 5.

- [ ] **Step 1: Add the failing journey step**

Append to `e2e/journey.spec.ts`:

```ts
const LABEL_FIXTURE = "e2e/fixtures/label.jpg";

test("captures a wine from a label photo and confirms it", async ({ page }) => {
  await page.goto("/capture");
  await page.getByLabel("Etikett fotografieren").first().setInputFiles(LABEL_FIXTURE);

  const captureEntry = page.getByRole("link", { name: /Tignanello 2018/ });
  await expect(captureEntry).toContainText("bitte bestätigen", { timeout: 15_000 });
  await captureEntry.click();

  await expect(page.getByRole("heading", { name: "Stimmt das so?" })).toBeVisible();
  await expect(page.getByLabel("Weingut")).toHaveValue("Marchesi Antinori");
  await page.getByLabel("Anzahl Flaschen").fill("6");
  await page.getByLabel("Lagerort").fill("Regal 2, Fach C");
  await page.getByLabel("Kaufpreis pro Flasche").fill("95");
  await page.getByRole("button", { name: "In den Keller legen" }).click();

  await expect(page.getByRole("heading", { name: "Tignanello 2018" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Tignanello 2018/ })).toContainText("6×");
});
```

Run → FAIL.

- [ ] **Step 2: Upload hook and shell wiring**

`src/lib/use-photo-upload.ts`:

```ts
"use client";

import { useCallback, useState } from "react";
import type { WineResponse } from "@/shared/api-contract";
import { apiClient } from "./api-client";
import { toErrorCode } from "./use-api-resource";

export interface PhotoUpload {
  uploadPhoto: (photo: File) => void;
  isUploading: boolean;
  errorCode: string | null;
}

export function usePhotoUpload(onUploaded: (wine: WineResponse) => void): PhotoUpload {
  const [isUploading, setIsUploading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const uploadPhoto = useCallback(
    (photo: File) => {
      setIsUploading(true);
      setErrorCode(null);
      apiClient
        .uploadLabelPhoto(photo)
        .then(({ wine }) => onUploaded(wine))
        .catch((error: unknown) => setErrorCode(toErrorCode(error)))
        .finally(() => setIsUploading(false));
    },
    [onUploaded],
  );

  return { uploadPhoto, isUploading, errorCode };
}
```

In `src/components/layout/app-shell.tsx`, replace the temporary handler: the navigation button uploads, then opens the capture page, where progress and errors are visible.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";
import { CaptureButton } from "@/components/capture/capture-button";
import { usePhotoUpload } from "@/lib/use-photo-upload";
import { Navigation } from "./navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const openCapturePage = useCallback(() => router.push("/capture"), [router]);
  const photoUpload = usePhotoUpload(openCapturePage);

  return (
    <div className="min-h-dvh md:flex">
      <Navigation
        captureControl={
          <CaptureButton variant="navigation" onPhotoSelected={photoUpload.uploadPhoto} />
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-10 md:pb-10">
        {photoUpload.errorCode && (
          <p role="alert" className="card mb-4 border-alert text-alert">
            Foto konnte nicht hochgeladen werden. Öffne «Erfassen» und versuche es erneut.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Capture page**

`src/app/capture/page.tsx`:

```tsx
"use client";

import { useCallback } from "react";
import { CaptureButton } from "@/components/capture/capture-button";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { WineList } from "@/components/wine/wine-list";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";
import { usePhotoUpload } from "@/lib/use-photo-upload";

// This page is only open while capturing, so it simply keeps polling.
const POLL_INTERVAL_MILLISECONDS = 3000;

export default function CapturePage() {
  const loadWines = useCallback(() => apiClient.listWines({ includeEmpty: true }), []);
  const wineList = useApiResource(loadWines, { pollIntervalMilliseconds: POLL_INTERVAL_MILLISECONDS });
  const photoUpload = usePhotoUpload(wineList.reload);

  const winesInCapture = (wineList.data?.wines ?? []).filter(
    (wine) => wine.analysisStatus !== "complete",
  );

  return (
    <>
      <PageHeader eyebrow="Neuer Wein" title="Etikett fotografieren" />
      <p className="mb-4 text-ink-muted">
        Ein Foto genügt. Die Analyse dauert etwa eine halbe Minute und läuft im Hintergrund. Du
        kannst sofort das nächste Etikett fotografieren.
      </p>
      <CaptureButton variant="large" onPhotoSelected={photoUpload.uploadPhoto} />
      {photoUpload.isUploading && <p className="mt-3 text-ink-muted">Foto wird hochgeladen …</p>}
      {photoUpload.errorCode && (
        <div className="mt-3">
          <ErrorNotice errorCode={photoUpload.errorCode} />
        </div>
      )}
      {wineList.errorCode && <ErrorNotice errorCode={wineList.errorCode} onRetry={wineList.reload} />}

      {winesInCapture.length > 0 && (
        <section className="mt-8">
          <p className="eyebrow">In Arbeit</p>
          <WineList wines={winesInCapture} />
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 4: Identity fields shared by confirmation and manual entry**

`src/components/wine/identity-fields.tsx`:

```tsx
import { useId } from "react";
import { TextField } from "@/components/shared/text-field";
import { WINE_TYPES, type WineType } from "@/domain/wine-types";
import {
  parseCommaSeparatedList,
  parseOptionalInteger,
  toInputText,
} from "@/lib/form-values";
import { WINE_TYPE_LABELS } from "@/lib/german-labels";
import type { WineIdentityRequestFields, WineResponse } from "@/shared/api-contract";

export interface IdentityFormValues {
  producer: string;
  name: string;
  vintage: string;
  country: string;
  region: string;
  appellation: string;
  grapeVarieties: string;
  wineType: WineType | "";
}

export function toIdentityFormValues(wine: WineResponse): IdentityFormValues {
  return {
    producer: toInputText(wine.producer),
    name: toInputText(wine.name),
    vintage: toInputText(wine.vintage),
    country: toInputText(wine.country),
    region: toInputText(wine.region),
    appellation: toInputText(wine.appellation),
    grapeVarieties: wine.grapeVarieties.join(", "),
    wineType: wine.wineType ?? "",
  };
}

const emptyToNull = (text: string) => (text.trim() === "" ? null : text.trim());

export function toIdentityRequest(values: IdentityFormValues): WineIdentityRequestFields {
  return {
    producer: emptyToNull(values.producer),
    name: emptyToNull(values.name),
    vintage: parseOptionalInteger(values.vintage),
    country: emptyToNull(values.country),
    region: emptyToNull(values.region),
    appellation: emptyToNull(values.appellation),
    grapeVarieties: parseCommaSeparatedList(values.grapeVarieties),
    wineType: values.wineType === "" ? null : values.wineType,
  };
}

export interface IdentityFieldsProps {
  values: IdentityFormValues;
  onChange: (values: IdentityFormValues) => void;
}

export function IdentityFields({ values, onChange }: IdentityFieldsProps) {
  const wineTypeId = useId();
  const setField = (field: keyof IdentityFormValues) => (text: string) =>
    onChange({ ...values, [field]: text });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <TextField label="Weingut" value={values.producer} onChange={setField("producer")} />
      <TextField label="Wein" value={values.name} onChange={setField("name")} />
      <TextField
        label="Jahrgang"
        value={values.vintage}
        onChange={setField("vintage")}
        inputMode="numeric"
        maximumLength={4}
      />
      <div>
        <label htmlFor={wineTypeId} className="field-label">
          Typ
        </label>
        <select
          id={wineTypeId}
          className="field-input"
          value={values.wineType}
          onChange={(event) => setField("wineType")(event.target.value)}
        >
          <option value="">Unbekannt</option>
          {WINE_TYPES.map((wineType) => (
            <option key={wineType} value={wineType}>
              {WINE_TYPE_LABELS[wineType]}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Region" value={values.region} onChange={setField("region")} />
      <TextField label="Land" value={values.country} onChange={setField("country")} />
      <TextField label="Appellation" value={values.appellation} onChange={setField("appellation")} />
      <TextField
        label="Traubensorten (mit Komma getrennt)"
        value={values.grapeVarieties}
        onChange={setField("grapeVarieties")}
      />
    </div>
  );
}
```

- [ ] **Step 5: Delete button, confirmation form, duplicate panel**

`src/components/wine/delete-wine-button.tsx`:

```tsx
"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";

/** Two-step delete without a browser dialog: the first tap arms, the second deletes. */
export function DeleteWineButton({ wineId, onDeleted }: { wineId: number; onDeleted: () => void }) {
  const [isArmed, setIsArmed] = useState(false);

  if (!isArmed) {
    return (
      <button type="button" className="button-ghost" onClick={() => setIsArmed(true)}>
        Löschen
      </button>
    );
  }
  return (
    <span className="flex flex-wrap gap-2">
      <button
        type="button"
        className="button-primary bg-alert"
        onClick={() => void apiClient.deleteWine(wineId).then(onDeleted)}
      >
        Endgültig löschen
      </button>
      <button type="button" className="button-ghost" onClick={() => setIsArmed(false)}>
        Abbrechen
      </button>
    </span>
  );
}
```

`src/components/wine/confirmation-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { parseOptionalInteger, parseOptionalNumber } from "@/lib/form-values";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";
import { IdentityFields, toIdentityFormValues, toIdentityRequest } from "./identity-fields";

export interface ConfirmationFormProps {
  wine: WineResponse;
  onConfirmed: () => void;
}

export function ConfirmationForm({ wine, onConfirmed }: ConfirmationFormProps) {
  const [identityValues, setIdentityValues] = useState(() => toIdentityFormValues(wine));
  const [bottleCountText, setBottleCountText] = useState("1");
  const [storageLocation, setStorageLocation] = useState("");
  const [purchasePriceText, setPurchasePriceText] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function confirmWine(event: FormEvent) {
    event.preventDefault();
    const bottleCount = parseOptionalInteger(bottleCountText);
    if (bottleCount === null || bottleCount < 1) return setErrorCode("invalidInput");

    setIsSaving(true);
    try {
      await apiClient.confirmWine(wine.id, {
        ...toIdentityRequest(identityValues),
        bottleCount,
        storageLocation: storageLocation.trim() === "" ? null : storageLocation.trim(),
        purchasePricePerBottle: parseOptionalNumber(purchasePriceText),
      });
      onConfirmed();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void confirmWine(event)} className="grid gap-5">
      <IdentityFields values={identityValues} onChange={setIdentityValues} />
      <fieldset className="card grid gap-3 md:grid-cols-3">
        <legend className="eyebrow px-1">Im Keller</legend>
        <TextField
          label="Anzahl Flaschen"
          value={bottleCountText}
          onChange={setBottleCountText}
          inputMode="numeric"
          isRequired
        />
        <TextField label="Lagerort" value={storageLocation} onChange={setStorageLocation} placeholder="z. B. Regal 2, Fach C" />
        <TextField
          label="Kaufpreis pro Flasche"
          value={purchasePriceText}
          onChange={setPurchasePriceText}
          inputMode="decimal"
        />
      </fieldset>
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <button type="submit" className="button-primary" disabled={isSaving}>
        In den Keller legen
      </button>
    </form>
  );
}
```

`src/components/wine/duplicate-panel.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { parseOptionalInteger } from "@/lib/form-values";
import { formatWineTitle } from "@/lib/german-labels";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";
import { DeleteWineButton } from "./delete-wine-button";

export interface DuplicatePanelProps {
  wine: WineResponse;
  onMerged: (existingWineId: number) => void;
  onDeleted: () => void;
}

export function DuplicatePanel({ wine, onMerged, onDeleted }: DuplicatePanelProps) {
  const [bottleCountText, setBottleCountText] = useState("1");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function mergeIntoExistingWine() {
    const bottleCount = parseOptionalInteger(bottleCountText);
    if (bottleCount === null || bottleCount < 1) return setErrorCode("invalidInput");
    try {
      const { wine: existingWine } = await apiClient.mergeWine(wine.id, bottleCount);
      onMerged(existingWine.id);
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <section className="card grid gap-4">
      <h2>Schon im Keller</h2>
      <p>
        «{formatWineTitle(wine)}» ist bereits erfasst. Es wurde keine neue Recherche gestartet.{" "}
        <Link href={`/wines/${wine.duplicateOfWineId}`} className="text-bordeaux underline">
          Bestehenden Eintrag ansehen
        </Link>
      </p>
      <TextField
        label="Zusätzliche Flaschen"
        value={bottleCountText}
        onChange={setBottleCountText}
        inputMode="numeric"
      />
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="button-primary" onClick={() => void mergeIntoExistingWine()}>
          Bestand erhöhen
        </button>
        <DeleteWineButton wineId={wine.id} onDeleted={onDeleted} />
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Analysis status panel with manual entry**

`src/components/wine/manual-identity-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";
import { IdentityFields, toIdentityFormValues, toIdentityRequest } from "./identity-fields";

/** Fallback when the label cannot be read: type the wine, then let the AI research it. */
export function ManualIdentityForm({ wine, onStarted }: { wine: WineResponse; onStarted: () => void }) {
  const [identityValues, setIdentityValues] = useState(() => toIdentityFormValues(wine));
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function startResearch(event: FormEvent) {
    event.preventDefault();
    try {
      await apiClient.editWine(wine.id, toIdentityRequest(identityValues));
      await apiClient.startAnalysis(wine.id, "researchOnly");
      onStarted();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <form onSubmit={(event) => void startResearch(event)} className="grid gap-4">
      <p className="eyebrow">Von Hand eingeben</p>
      <IdentityFields values={identityValues} onChange={setIdentityValues} />
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <button type="submit" className="button-ghost">
        Recherche starten
      </button>
    </form>
  );
}
```

`src/components/wine/analysis-status-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { ANALYSIS_STATUS_LABELS } from "@/lib/german-labels";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";
import { DeleteWineButton } from "./delete-wine-button";
import { ManualIdentityForm } from "./manual-identity-form";

export interface AnalysisStatusPanelProps {
  wine: WineResponse;
  onChanged: () => void;
  onDeleted: () => void;
}

export function AnalysisStatusPanel({ wine, onChanged, onDeleted }: AnalysisStatusPanelProps) {
  const [requestErrorCode, setRequestErrorCode] = useState<string | null>(null);
  const isAnalyzing = wine.analysisStatus === "analyzing";
  const visibleErrorCode = requestErrorCode ?? wine.analysisError;

  function retryFullAnalysis() {
    setRequestErrorCode(null);
    apiClient
      .startAnalysis(wine.id, "full")
      .then(onChanged)
      .catch((error: unknown) => setRequestErrorCode(toErrorCode(error)));
  }

  return (
    <section className="grid gap-5">
      <p className="card" aria-live="polite">
        {ANALYSIS_STATUS_LABELS[wine.analysisStatus]}
        {isAnalyzing && " Das dauert etwa eine halbe Minute."}
      </p>
      {!isAnalyzing && visibleErrorCode && <ErrorNotice errorCode={visibleErrorCode} />}
      {!isAnalyzing && (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="button-primary" onClick={retryFullAnalysis}>
              Analyse erneut versuchen
            </button>
            <DeleteWineButton wineId={wine.id} onDeleted={onDeleted} />
          </div>
          <ManualIdentityForm wine={wine} onStarted={onChanged} />
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 7: The wine page**

`src/app/wines/[wineId]/page.tsx`:

```tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { WinePhoto } from "@/components/shared/wine-photo";
import { AnalysisStatusPanel } from "@/components/wine/analysis-status-panel";
import { ConfirmationForm } from "@/components/wine/confirmation-form";
import { DuplicatePanel } from "@/components/wine/duplicate-panel";
import { apiClient } from "@/lib/api-client";
import { formatWineTitle } from "@/lib/german-labels";
import { useApiResource } from "@/lib/use-api-resource";
import type { TastingResponse, WineResponse } from "@/shared/api-contract";

const POLL_INTERVAL_MILLISECONDS = 3000;
type WineDetails = { wine: WineResponse; tastings: TastingResponse[] };

function isWaitingForAnalysis(details: WineDetails): boolean {
  return ["pending", "analyzing"].includes(details.wine.analysisStatus);
}

export default function WinePage() {
  const wineId = Number(useParams<{ wineId: string }>().wineId);
  const router = useRouter();
  const loadWine = useCallback(() => apiClient.getWine(wineId), [wineId]);
  const details = useApiResource(loadWine, {
    pollIntervalMilliseconds: POLL_INTERVAL_MILLISECONDS,
    shouldPoll: isWaitingForAnalysis,
  });
  const goToCellar = useCallback(() => router.push("/"), [router]);

  if (details.errorCode) return <ErrorNotice errorCode={details.errorCode} onRetry={details.reload} />;
  if (details.data === null) return <p className="text-ink-muted">Wird geladen …</p>;
  const { wine } = details.data;

  if (wine.analysisStatus === "complete") {
    return <PageHeader eyebrow="Im Keller" title={formatWineTitle(wine)} />;
  }

  const isAwaitingConfirmation = wine.analysisStatus === "awaitingConfirmation";
  const isDuplicate = isAwaitingConfirmation && wine.duplicateOfWineId !== null;
  return (
    <>
      <PageHeader
        eyebrow="Neuer Wein"
        title={isAwaitingConfirmation && !isDuplicate ? "Stimmt das so?" : formatWineTitle(wine)}
      />
      <div className="mb-5">
        <WinePhoto photoUrl={wine.photoUrl} alt="Foto des Etiketts" size="hero" />
      </div>
      {isDuplicate && (
        <DuplicatePanel
          wine={wine}
          onMerged={(existingWineId) => router.push(`/wines/${existingWineId}`)}
          onDeleted={goToCellar}
        />
      )}
      {isAwaitingConfirmation && !isDuplicate && (
        <ConfirmationForm wine={wine} onConfirmed={details.reload} />
      )}
      {!isAwaitingConfirmation && (
        <AnalysisStatusPanel wine={wine} onChanged={details.reload} onDeleted={goToCellar} />
      )}
    </>
  );
}
```

Run: `npm run test:e2e` → PASS.

- [ ] **Step 8: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add capture flow with analysis status, confirmation and duplicate handling"
WINE_INTELLIGENCE_MODE=recorded npm run deploy:local
```

Try it on the phone: + opens the camera, the capture page shows progress, confirmation stores the wine.

---

### Task 5: Wine detail, drinking window, tastings, edit, re-rate

**Files:**
- Create: `src/components/wine/drinking-window-bar.tsx`, `wine-detail.tsx`, `wine-assessment.tsx`, `tasting-form.tsx`, `tasting-list.tsx`, `star-rating-input.tsx`, `cellar-edit-form.tsx`
- Modify: `src/app/wines/[wineId]/page.tsx`, `e2e/journey.spec.ts`

**Interfaces:**
- Produces: `<WineDetail wine tastings currency onChanged onDeleted>`, `<DrinkingWindowBar wine>`, `<WineAssessment wine currency>`, `<TastingForm wineId onRecorded onCancel>`, `<TastingList tastings>`, `<StarRatingInput value onChange>`, `<CellarEditForm wine onSaved onCancel>`

- [ ] **Step 1: Add the failing journey step**

Append to `e2e/journey.spec.ts`:

```ts
test("shows the assessment and records a tasting", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Tignanello 2018/ }).click();

  await expect(page.getByText("95 Pkt")).toBeVisible();
  await expect(page.getByRole("img", { name: /Trinkfenster 2023 bis 2038/ })).toBeVisible();
  await expect(page.getByText("Bistecca alla fiorentina")).toBeVisible();
  const sourceLink = page.getByRole("link", { name: /Beispielquelle/ });
  await expect(sourceLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByText("Regal 2, Fach C")).toBeVisible();

  await page.getByRole("button", { name: "Flasche getrunken" }).click();
  await page.getByRole("radio", { name: "4 Sterne" }).check();
  await page.getByLabel("Verkostungsnotiz").fill("Dunkle Kirsche, sehr lang.");
  await page.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText("5 Flaschen")).toBeVisible();
  await expect(page.getByText("Dunkle Kirsche, sehr lang.")).toBeVisible();
});

test("edits cellar data", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Tignanello 2018/ }).click();
  await page.getByRole("button", { name: "Bearbeiten" }).click();
  await page.getByLabel("Lagerort").fill("Regal 1");
  await page.getByRole("button", { name: "Änderungen speichern" }).click();

  await expect(page.getByText("Regal 1")).toBeVisible();
});
```

Run → FAIL.

- [ ] **Step 2: Drinking window bar and assessment**

`src/components/wine/drinking-window-bar.tsx`:

```tsx
import { calculateWindowBarLayout } from "@/lib/drinking-window-layout";
import type { WineResponse } from "@/shared/api-contract";

export function DrinkingWindowBar({ wine }: { wine: WineResponse }) {
  const layout = calculateWindowBarLayout(wine, new Date().getFullYear());
  if (layout === null) return <p className="text-ink-muted">Kein Trinkfenster bekannt.</p>;

  const description = `Trinkfenster ${wine.drinkFromYear} bis ${wine.drinkUntilYear}`;
  return (
    <div>
      <div role="img" aria-label={description} className="relative h-2.5 rounded-full bg-line">
        <div
          className="absolute inset-y-0 rounded-full bg-bordeaux"
          style={{ left: `${layout.windowStartPercent}%`, width: `${layout.windowWidthPercent}%` }}
        />
        <div
          className="absolute -top-1.5 h-5.5 w-0.5 bg-ink"
          style={{ left: `${layout.todayPercent}%` }}
        />
      </div>
      <p className="mt-1.5 flex justify-between font-sans text-xs text-ink-muted">
        <span>{wine.drinkFromYear}</span>
        <span>heute</span>
        <span>{wine.drinkUntilYear}</span>
      </p>
    </div>
  );
}
```

`src/components/wine/wine-assessment.tsx`:

```tsx
import { formatCurrency } from "@/lib/german-labels";
import type { WineResponse } from "@/shared/api-contract";

function CriticScoreList({ wine }: { wine: WineResponse }) {
  if (wine.criticScores.length === 0) {
    return <p className="text-ink-muted">Keine Kritikerbewertungen gefunden.</p>;
  }
  return (
    <ul className="grid gap-1">
      {wine.criticScores.map((criticScore) => (
        <li key={`${criticScore.source}-${criticScore.points}`}>
          {criticScore.url ? (
            <a
              href={criticScore.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-bordeaux underline"
            >
              {criticScore.source}
            </a>
          ) : (
            criticScore.source
          )}
          {" · "}
          {criticScore.points} Punkte
        </li>
      ))}
    </ul>
  );
}

export function WineAssessment({ wine, currency }: { wine: WineResponse; currency: string }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <section className="card">
        <p className="eyebrow">Passt zu</p>
        <p className="mt-1">{wine.foodPairings.join(" · ") || "Keine Empfehlung vorhanden."}</p>
      </section>
      <section className="card">
        <p className="eyebrow">Bewertungen</p>
        <div className="mt-1">
          <CriticScoreList wine={wine} />
        </div>
      </section>
      <section className="md:col-span-2">
        {wine.styleClassification && <p className="italic">{wine.styleClassification}</p>}
        {wine.description && <p className="mt-1">{wine.description}</p>}
        {wine.estimatedMarketValue !== null && (
          <p className="mt-2 text-ink-muted">
            Marktwert etwa {formatCurrency(wine.estimatedMarketValue, currency)} pro Flasche
          </p>
        )}
        {wine.confidence === "estimated" && (
          <p className="mt-2 text-sm text-ink-muted">
            Zu diesem Wein gibt es kaum Quellen. Trinkfenster und Stil sind geschätzt.
          </p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Tasting components**

`src/components/wine/star-rating-input.tsx`:

```tsx
const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export interface StarRatingInputProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  return (
    <fieldset>
      <legend className="field-label">Deine Bewertung</legend>
      <div className="flex gap-1">
        {STAR_VALUES.map((starValue) => (
          <label key={starValue} className="flex h-11 w-11 cursor-pointer items-center justify-center text-2xl">
            <input
              type="radio"
              name="starRating"
              className="sr-only"
              aria-label={starValue === 1 ? "1 Stern" : `${starValue} Sterne`}
              checked={value === starValue}
              onChange={() => onChange(starValue)}
            />
            <span aria-hidden="true" className={value !== null && starValue <= value ? "text-gold" : "text-line"}>
              ★
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
```

`src/components/wine/tasting-form.tsx`:

```tsx
"use client";

import { useId, useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { toErrorCode } from "@/lib/use-api-resource";
import { StarRatingInput } from "./star-rating-input";

export interface TastingFormProps {
  wineId: number;
  onRecorded: () => void;
  onCancel: () => void;
}

function getTodayAsIsoDate(): string {
  const now = new Date();
  const localMidnight = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localMidnight.toISOString().slice(0, 10);
}

export function TastingForm({ wineId, onRecorded, onCancel }: TastingFormProps) {
  const noteId = useId();
  const [starRating, setStarRating] = useState<number | null>(null);
  const [tastingNote, setTastingNote] = useState("");
  const [occasionOrDish, setOccasionOrDish] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function recordTasting(event: FormEvent) {
    event.preventDefault();
    try {
      await apiClient.recordTasting(wineId, {
        tastedOn: getTodayAsIsoDate(),
        starRating,
        tastingNote: tastingNote.trim() === "" ? null : tastingNote.trim(),
        occasionOrDish: occasionOrDish.trim() === "" ? null : occasionOrDish.trim(),
      });
      onRecorded();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <form onSubmit={(event) => void recordTasting(event)} className="card grid gap-4">
      <p className="eyebrow">Flasche getrunken</p>
      <StarRatingInput value={starRating} onChange={setStarRating} />
      <div>
        <label htmlFor={noteId} className="field-label">
          Verkostungsnotiz
        </label>
        <textarea
          id={noteId}
          className="field-input min-h-24 py-2"
          maxLength={2000}
          value={tastingNote}
          onChange={(event) => setTastingNote(event.target.value)}
        />
      </div>
      <TextField label="Anlass oder Essen" value={occasionOrDish} onChange={setOccasionOrDish} />
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <div className="flex gap-2">
        <button type="submit" className="button-primary">
          Speichern
        </button>
        <button type="button" className="button-ghost" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
```

`src/components/wine/tasting-list.tsx`:

```tsx
import type { TastingResponse } from "@/shared/api-contract";

const DATE_FORMAT = new Intl.DateTimeFormat("de-CH", { dateStyle: "long" });

export function formatTastingDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(`${isoDate}T12:00:00`));
}

export function StarRatingDisplay({ starRating }: { starRating: number | null }) {
  if (starRating === null) return null;
  return (
    <span className="text-gold" aria-label={`${starRating} von 5 Sternen`}>
      {"★".repeat(starRating)}
    </span>
  );
}

export function TastingList({ tastings }: { tastings: TastingResponse[] }) {
  if (tastings.length === 0) return null;
  return (
    <section>
      <p className="eyebrow">Getrunken</p>
      <ul>
        {tastings.map((tasting) => (
          <li key={tasting.id} className="border-b border-line py-3">
            <p className="font-sans text-xs text-ink-muted">
              {formatTastingDate(tasting.tastedOn)} <StarRatingDisplay starRating={tasting.starRating} />
            </p>
            {tasting.tastingNote && <p>{tasting.tastingNote}</p>}
            {tasting.occasionOrDish && <p className="text-ink-muted">{tasting.occasionOrDish}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Edit form**

`src/components/wine/cellar-edit-form.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { parseOptionalInteger, parseOptionalNumber, toInputText } from "@/lib/form-values";
import { toErrorCode } from "@/lib/use-api-resource";
import type { WineResponse } from "@/shared/api-contract";

export interface CellarEditFormProps {
  wine: WineResponse;
  onSaved: () => void;
  onCancel: () => void;
}

export function CellarEditForm({ wine, onSaved, onCancel }: CellarEditFormProps) {
  const [bottleCountText, setBottleCountText] = useState(toInputText(wine.bottleCount));
  const [storageLocation, setStorageLocation] = useState(toInputText(wine.storageLocation));
  const [purchasePriceText, setPurchasePriceText] = useState(toInputText(wine.purchasePricePerBottle));
  const [drinkFromText, setDrinkFromText] = useState(toInputText(wine.drinkFromYear));
  const [drinkUntilText, setDrinkUntilText] = useState(toInputText(wine.drinkUntilYear));
  const [errorCode, setErrorCode] = useState<string | null>(null);

  async function saveChanges(event: FormEvent) {
    event.preventDefault();
    const bottleCount = parseOptionalInteger(bottleCountText);
    if (bottleCount === null || bottleCount < 0) return setErrorCode("invalidInput");
    try {
      await apiClient.editWine(wine.id, {
        bottleCount,
        storageLocation: storageLocation.trim() === "" ? null : storageLocation.trim(),
        purchasePricePerBottle: parseOptionalNumber(purchasePriceText),
        drinkFromYear: parseOptionalInteger(drinkFromText),
        drinkUntilYear: parseOptionalInteger(drinkUntilText),
      });
      onSaved();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <form onSubmit={(event) => void saveChanges(event)} className="card grid gap-3 md:grid-cols-2">
      <TextField label="Anzahl Flaschen" value={bottleCountText} onChange={setBottleCountText} inputMode="numeric" />
      <TextField label="Lagerort" value={storageLocation} onChange={setStorageLocation} />
      <TextField label="Kaufpreis pro Flasche" value={purchasePriceText} onChange={setPurchasePriceText} inputMode="decimal" />
      <TextField label="Trinken ab (Jahr)" value={drinkFromText} onChange={setDrinkFromText} inputMode="numeric" />
      <TextField label="Trinken bis (Jahr)" value={drinkUntilText} onChange={setDrinkUntilText} inputMode="numeric" />
      {errorCode && <ErrorNotice errorCode={errorCode} />}
      <div className="flex gap-2 md:col-span-2">
        <button type="submit" className="button-primary">
          Änderungen speichern
        </button>
        <button type="button" className="button-ghost" onClick={onCancel}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Wine detail and page wiring**

`src/components/wine/wine-detail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ErrorNotice } from "@/components/shared/error-notice";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { WinePhoto } from "@/components/shared/wine-photo";
import { apiClient } from "@/lib/api-client";
import {
  formatBottleCount,
  formatWineOrigin,
  formatWineTitle,
  WINE_TYPE_LABELS,
} from "@/lib/german-labels";
import { toErrorCode } from "@/lib/use-api-resource";
import type { TastingResponse, WineResponse } from "@/shared/api-contract";
import { CellarEditForm } from "./cellar-edit-form";
import { DeleteWineButton } from "./delete-wine-button";
import { DrinkingWindowBar } from "./drinking-window-bar";
import { TastingForm } from "./tasting-form";
import { TastingList } from "./tasting-list";
import { WineAssessment } from "./wine-assessment";

export interface WineDetailProps {
  wine: WineResponse;
  tastings: TastingResponse[];
  currency: string;
  onChanged: () => void;
  onDeleted: () => void;
}

type OpenPanel = "none" | "tasting" | "edit";

function WineFacts({ wine }: { wine: WineResponse }) {
  const facts = [
    formatWineOrigin(wine),
    wine.wineType ? WINE_TYPE_LABELS[wine.wineType] : null,
    formatBottleCount(wine.bottleCount),
    wine.storageLocation,
  ].filter(Boolean);
  return <p className="eyebrow">{facts.join(" · ")}</p>;
}

export function WineDetail({ wine, tastings, currency, onChanged, onDeleted }: WineDetailProps) {
  const [openPanel, setOpenPanel] = useState<OpenPanel>("none");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const closePanelAndReload = () => {
    setOpenPanel("none");
    onChanged();
  };
  const startReassessment = () =>
    apiClient
      .startAnalysis(wine.id, "researchOnly")
      .then(onChanged)
      .catch((error: unknown) => setErrorCode(toErrorCode(error)));

  return (
    <article className="grid gap-6">
      <WinePhoto photoUrl={wine.photoUrl} alt="Foto des Etiketts" size="hero" />
      <header>
        <WineFacts wine={wine} />
        <h1>{formatWineTitle(wine)}</h1>
        {wine.producer && <p className="text-ink-muted">{wine.producer}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <ScoreBadge score={wine.aggregateScore} confidence={wine.confidence} />
          <MaturityBadge maturity={wine.drinkingMaturity} />
        </div>
      </header>
      <DrinkingWindowBar wine={wine} />
      {(errorCode ?? wine.analysisError) && (
        <ErrorNotice errorCode={errorCode ?? wine.analysisError ?? "unexpected"} />
      )}
      {openPanel === "none" && (
        <button type="button" className="button-primary" onClick={() => setOpenPanel("tasting")}>
          Flasche getrunken
        </button>
      )}
      {openPanel === "tasting" && (
        <TastingForm wineId={wine.id} onRecorded={closePanelAndReload} onCancel={() => setOpenPanel("none")} />
      )}
      {openPanel === "edit" && (
        <CellarEditForm wine={wine} onSaved={closePanelAndReload} onCancel={() => setOpenPanel("none")} />
      )}
      <WineAssessment wine={wine} currency={currency} />
      <TastingList tastings={tastings} />
      <footer className="flex flex-wrap gap-2 border-t border-line pt-4">
        <button type="button" className="button-ghost" onClick={() => setOpenPanel("edit")}>
          Bearbeiten
        </button>
        <button type="button" className="button-ghost" onClick={() => void startReassessment()}>
          Neu bewerten
        </button>
        <DeleteWineButton wineId={wine.id} onDeleted={onDeleted} />
      </footer>
    </article>
  );
}
```

In `src/app/wines/[wineId]/page.tsx`:

1. Load the currency next to the wine: `const settings = useApiResource(useCallback(() => apiClient.getSettings(), []));`
2. Make polling also cover a running re-assessment of a complete wine. It already does: `isWaitingForAnalysis` checks for `analyzing`.
3. Replace the `complete` branch. A complete wine that is being re-rated has status `analyzing` and must keep showing its detail, so branch on the presence of an analysis instead of the status alone:

```tsx
  // Only a wine that was researched before can be in a re-assessment. During the first
  // analysis analyzedAt is still empty, so new captures keep showing the capture panels.
  const hasBeenConfirmed = wine.analyzedAt !== null;
  if (wine.analysisStatus === "complete" || (wine.analysisStatus === "analyzing" && hasBeenConfirmed)) {
    return (
      <>
        {wine.analysisStatus === "analyzing" && (
          <p className="card mb-4" aria-live="polite">
            Wird neu bewertet … Das dauert etwa eine halbe Minute.
          </p>
        )}
        <WineDetail
          wine={wine}
          tastings={details.data.tastings}
          currency={settings.data?.currency ?? "CHF"}
          onChanged={details.reload}
          onDeleted={goToCellar}
        />
      </>
    );
  }
```

Add the imports for `WineDetail`. Remove the now unused `PageHeader` usage of the old `complete` branch only; the header of the capture states stays.

Run: `npm run test:e2e` → PASS.

- [ ] **Step 6: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add wine detail with drinking window, assessment, tastings and editing"
WINE_INTELLIGENCE_MODE=recorded npm run deploy:local
```

---

### Task 6: «Bald trinken» and «Essen → Wein»

**Files:**
- Create: `src/app/soon/page.tsx`, `src/app/pairing/page.tsx`, `src/components/wine/dish-recommendation-list.tsx`
- Modify: `e2e/journey.spec.ts`

**Interfaces:**
- Produces: `<DishRecommendationList result>`; pages `/soon` and `/pairing`.

- [ ] **Step 1: Add the failing journey steps**

Append to `e2e/journey.spec.ts`:

```ts
test("lists nothing urgent for a young cellar", async ({ page }) => {
  await page.goto("/soon");
  await expect(page.getByRole("heading", { name: "Nichts eilt" })).toBeVisible();
});

test("recommends wines for a dish and reuses the stored answer", async ({ page }) => {
  await page.goto("/pairing");
  await page.getByLabel("Was gibt es zu essen?").fill("Rindsfilet mit Morcheln");
  await page.getByRole("button", { name: "Wein empfehlen" }).click();

  await expect(page.getByRole("link", { name: /Tignanello 2018/ })).toBeVisible();
  await expect(page.getByText("Neue Empfehlung")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Rindsfilet mit Morcheln" }).click();
  await expect(page.getByText("Gespeicherte Antwort, ohne KI-Kosten")).toBeVisible();
});
```

Run → FAIL.

- [ ] **Step 2: «Bald trinken» page**

`src/app/soon/page.tsx`:

```tsx
"use client";

import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { WineList } from "@/components/wine/wine-list";
import type { DrinkingMaturity } from "@/domain/wine-types";
import { apiClient } from "@/lib/api-client";
import { useApiResource } from "@/lib/use-api-resource";

const URGENT_MATURITIES: DrinkingMaturity[] = ["overdue", "drinkSoon"];

export default function DrinkSoonPage() {
  const loadWines = useCallback(() => apiClient.listWines({ sort: "urgency" }), []);
  const wineList = useApiResource(loadWines);

  const urgentWines = (wineList.data?.wines ?? []).filter(
    (wine) => wine.analysisStatus === "complete" && URGENT_MATURITIES.includes(wine.drinkingMaturity),
  );

  return (
    <>
      <PageHeader eyebrow="Nach Dringlichkeit" title="Bald trinken" />
      {wineList.errorCode && <ErrorNotice errorCode={wineList.errorCode} onRetry={wineList.reload} />}
      {!wineList.isLoading && urgentWines.length === 0 && !wineList.errorCode && (
        <EmptyState
          title="Nichts eilt"
          hint="Kein Wein ist überfällig oder am Ende seines Trinkfensters."
        />
      )}
      <WineList wines={urgentWines} />
    </>
  );
}
```

- [ ] **Step 3: Pairing components and page**

`src/components/wine/dish-recommendation-list.tsx`:

```tsx
import Link from "next/link";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { formatWineTitle } from "@/lib/german-labels";
import type { DishRecommendationResponse } from "@/shared/api-contract";

export function DishRecommendationList({ result }: { result: DishRecommendationResponse }) {
  if (result.recommendations.length === 0) {
    return <p className="card mt-5">Im Keller liegt gerade kein passender Wein zu diesem Gericht.</p>;
  }
  return (
    <section className="mt-5">
      <p className="eyebrow">Aus deinem Keller zu «{result.dish}»</p>
      <ol>
        {result.recommendations.map((recommendation, index) => (
          <li key={recommendation.wine.id} className="border-b border-line py-3">
            <p className="flex flex-wrap items-center gap-2">
              <Link href={`/wines/${recommendation.wine.id}`} className="font-semibold text-bordeaux underline">
                {index + 1} · {formatWineTitle(recommendation.wine)}
              </Link>
              <MaturityBadge maturity={recommendation.wine.drinkingMaturity} />
            </p>
            <p>{recommendation.reasoning}</p>
            {recommendation.servingTip && <p className="text-ink-muted">{recommendation.servingTip}</p>}
          </li>
        ))}
      </ol>
      <p className="mt-3 font-sans text-xs text-ink-muted">
        {result.isFromCache ? "Gespeicherte Antwort, ohne KI-Kosten" : "Neue Empfehlung"}
      </p>
    </section>
  );
}
```

`src/app/pairing/page.tsx`:

```tsx
"use client";

import { useCallback, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { DishRecommendationList } from "@/components/wine/dish-recommendation-list";
import { apiClient } from "@/lib/api-client";
import { toErrorCode, useApiResource } from "@/lib/use-api-resource";
import type { DishRecommendationResponse } from "@/shared/api-contract";

export default function PairingPage() {
  const [dish, setDish] = useState("");
  const [result, setResult] = useState<DishRecommendationResponse | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const recentDishes = useApiResource(useCallback(() => apiClient.listRecentDishes(), []));

  async function askForRecommendation(requestedDish: string, shouldForceRefresh: boolean) {
    if (requestedDish.trim().length < 2) return setErrorCode("invalidInput");
    setIsAsking(true);
    setErrorCode(null);
    try {
      setResult(await apiClient.recommendForDish(requestedDish, shouldForceRefresh));
      recentDishes.reload();
    } catch (error) {
      setErrorCode(toErrorCode(error));
    } finally {
      setIsAsking(false);
    }
  }

  function submitDish(event: FormEvent) {
    event.preventDefault();
    void askForRecommendation(dish, false);
  }

  return (
    <>
      <PageHeader eyebrow="Essen & Wein" title="Was gibt es heute?" />
      <form onSubmit={submitDish} className="grid gap-3">
        <TextField
          label="Was gibt es zu essen?"
          value={dish}
          onChange={setDish}
          placeholder="z. B. Rindsfilet mit Morcheln"
        />
        <button type="submit" className="button-primary" disabled={isAsking}>
          {isAsking ? "Sommelier überlegt …" : "Wein empfehlen"}
        </button>
      </form>
      {errorCode && (
        <div className="mt-4">
          <ErrorNotice errorCode={errorCode} />
        </div>
      )}
      {result && <DishRecommendationList result={result} />}
      {result?.isFromCache && (
        <button
          type="button"
          className="button-ghost mt-3"
          onClick={() => void askForRecommendation(result.dish, true)}
        >
          Neu fragen (kostet einen KI-Aufruf)
        </button>
      )}
      {(recentDishes.data?.recentDishes.length ?? 0) > 0 && (
        <section className="mt-8">
          <p className="eyebrow">Frühere Anfragen</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {recentDishes.data?.recentDishes.map((recentDish) => (
              <button
                key={recentDish}
                type="button"
                className="pill min-h-11"
                onClick={() => {
                  setDish(recentDish);
                  void askForRecommendation(recentDish, false);
                }}
              >
                {recentDish}
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
```

If `PairingPage` exceeds 80 lines under ESLint, move the "Frühere Anfragen" section into `src/components/wine/recent-dishes.tsx` with props `{ dishes: string[]; onSelect: (dish: string) => void }`.

Run: `npm run test:e2e` → PASS.

- [ ] **Step 4: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add drink-soon list and dish pairing with stored answers"
WINE_INTELLIGENCE_MODE=recorded npm run deploy:local
```

---

### Task 7: «Mehr» — cellar value, history, settings, and the duplicate journey

**Files:**
- Create: `src/app/more/page.tsx`, `src/app/more/history/page.tsx`, `src/app/more/settings/page.tsx`
- Modify: `e2e/journey.spec.ts`

- [ ] **Step 1: Add the failing journey steps**

Append to `e2e/journey.spec.ts`:

```ts
test("shows cellar value, AI usage and tasting history", async ({ page }) => {
  await page.goto("/more");
  await expect(page.getByText("5 Flaschen in 1 Wein")).toBeVisible();
  await expect(page.getByText(/Einkaufswert.*475/)).toBeVisible();
  await expect(page.getByText(/KI-Aufrufe diesen Monat: \d+ von 300/)).toBeVisible();

  await page.getByRole("link", { name: "Verkostungen" }).click();
  await expect(page.getByText("Dunkle Kirsche, sehr lang.")).toBeVisible();
});

test("saves settings", async ({ page }) => {
  await page.goto("/more/settings");
  await page.getByLabel("Monatliche Obergrenze für KI-Aufrufe").fill("120");
  await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(page.getByText("Gespeichert")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Monatliche Obergrenze für KI-Aufrufe")).toHaveValue("120");
});

test("recognises a wine that is already in the cellar and merges the bottles", async ({ page }) => {
  await page.goto("/capture");
  await page.getByLabel("Etikett fotografieren").first().setInputFiles(LABEL_FIXTURE);
  const captureEntry = page.getByRole("link", { name: /Tignanello 2018/ });
  await expect(captureEntry).toContainText("bitte bestätigen", { timeout: 15_000 });
  await captureEntry.click();

  await expect(page.getByRole("heading", { name: "Schon im Keller" })).toBeVisible();
  await page.getByLabel("Zusätzliche Flaschen").fill("3");
  await page.getByRole("button", { name: "Bestand erhöhen" }).click();

  await expect(page.getByText("8 Flaschen")).toBeVisible();
});
```

Run → FAIL.

- [ ] **Step 2: Overview page**

`src/app/more/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { apiClient } from "@/lib/api-client";
import { formatBottleCount, formatCurrency, MATURITY_LABELS } from "@/lib/german-labels";
import { useApiResource } from "@/lib/use-api-resource";
import type { CellarSummaryResponse } from "@/shared/api-contract";
import { DRINKING_MATURITIES } from "@/domain/wine-types";

function CellarValueCard({ summary }: { summary: CellarSummaryResponse }) {
  const wineCountText = summary.wineCount === 1 ? "1 Wein" : `${summary.wineCount} Weinen`;
  return (
    <section className="card">
      <p className="eyebrow">Kellerwert</p>
      <p className="mt-1 text-xl">
        {formatBottleCount(summary.bottleCount)} in {wineCountText}
      </p>
      <p>Einkaufswert {formatCurrency(summary.purchaseValue, summary.currency)}</p>
      <p>Geschätzter Marktwert {formatCurrency(summary.estimatedMarketValue, summary.currency)}</p>
      <p className="mt-2 text-sm text-ink-muted">
        {DRINKING_MATURITIES.filter((maturity) => summary.maturityCounts[maturity] > 0)
          .map((maturity) => `${summary.maturityCounts[maturity]} ${MATURITY_LABELS[maturity]}`)
          .join(" · ")}
      </p>
    </section>
  );
}

function AiUsageCard({ summary }: { summary: CellarSummaryResponse }) {
  return (
    <section className="card">
      <p className="eyebrow">Künstliche Intelligenz</p>
      <p className="mt-1">
        KI-Aufrufe diesen Monat: {summary.aiCallsThisMonth} von {summary.monthlyAiCallLimit}
      </p>
      {!summary.isAiConfigured && (
        <p className="mt-1 text-alert">
          Kein API-Schlüssel hinterlegt. Erfassen per Foto ist erst nach dem Eintragen von
          ANTHROPIC_API_KEY möglich.
        </p>
      )}
      <p className="mt-2 text-sm text-ink-muted">
        Kosten entstehen nur beim Erfassen, bei «Neu bewerten» und bei neuen Essensanfragen.
      </p>
    </section>
  );
}

export default function MorePage() {
  const summary = useApiResource(useCallback(() => apiClient.getCellarSummary(), []));

  return (
    <>
      <PageHeader eyebrow="Übersicht" title="Mehr" />
      {summary.errorCode && <ErrorNotice errorCode={summary.errorCode} onRetry={summary.reload} />}
      {summary.data && (
        <div className="grid gap-4 md:grid-cols-2">
          <CellarValueCard summary={summary.data} />
          <AiUsageCard summary={summary.data} />
        </div>
      )}
      <nav aria-label="Weitere Seiten" className="mt-6 grid gap-2">
        <Link href="/more/history" className="button-ghost">
          Verkostungen
        </Link>
        <Link href="/more/settings" className="button-ghost">
          Einstellungen
        </Link>
      </nav>
    </>
  );
}
```

- [ ] **Step 3: History page**

`src/app/more/history/page.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorNotice } from "@/components/shared/error-notice";
import { formatTastingDate, StarRatingDisplay } from "@/components/wine/tasting-list";
import { apiClient } from "@/lib/api-client";
import { formatWineTitle } from "@/lib/german-labels";
import { useApiResource } from "@/lib/use-api-resource";

export default function TastingHistoryPage() {
  const history = useApiResource(useCallback(() => apiClient.listTastings(), []));
  const tastings = history.data?.tastings ?? [];

  return (
    <>
      <PageHeader eyebrow="Historie" title="Verkostungen" />
      {history.errorCode && <ErrorNotice errorCode={history.errorCode} onRetry={history.reload} />}
      {!history.isLoading && tastings.length === 0 && !history.errorCode && (
        <EmptyState title="Noch nichts getrunken" hint="Getrunkene Flaschen erscheinen hier." />
      )}
      <ul>
        {tastings.map((tasting) => (
          <li key={tasting.id} className="border-b border-line py-3">
            <p className="font-sans text-xs text-ink-muted">
              {formatTastingDate(tasting.tastedOn)} <StarRatingDisplay starRating={tasting.starRating} />
            </p>
            <Link href={`/wines/${tasting.wineId}`} className="font-semibold text-bordeaux underline">
              {formatWineTitle({
                producer: tasting.wineProducer,
                name: tasting.wineName,
                vintage: tasting.wineVintage,
              })}
            </Link>
            {tasting.tastingNote && <p>{tasting.tastingNote}</p>}
            {tasting.occasionOrDish && <p className="text-ink-muted">{tasting.occasionOrDish}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
```

- [ ] **Step 4: Settings page**

`src/app/more/settings/page.tsx`:

```tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorNotice } from "@/components/shared/error-notice";
import { TextField } from "@/components/shared/text-field";
import { apiClient } from "@/lib/api-client";
import { parseOptionalInteger } from "@/lib/form-values";
import { toErrorCode } from "@/lib/use-api-resource";

export default function SettingsPage() {
  const [currency, setCurrency] = useState("");
  const [limitText, setLimitText] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    apiClient
      .getSettings()
      .then((settings) => {
        setCurrency(settings.currency);
        setLimitText(String(settings.monthlyAiCallLimit));
      })
      .catch((error: unknown) => setErrorCode(toErrorCode(error)));
  }, []);

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setIsSaved(false);
    const monthlyAiCallLimit = parseOptionalInteger(limitText);
    if (monthlyAiCallLimit === null) return setErrorCode("invalidInput");
    try {
      await apiClient.saveSettings({ currency: currency.trim().toUpperCase(), monthlyAiCallLimit });
      setErrorCode(null);
      setIsSaved(true);
    } catch (error) {
      setErrorCode(toErrorCode(error));
    }
  }

  return (
    <>
      <PageHeader eyebrow="Mehr" title="Einstellungen" />
      <form onSubmit={(event) => void saveSettings(event)} className="grid max-w-md gap-4">
        <TextField
          label="Währung (dreistelliger Code, z. B. CHF)"
          value={currency}
          onChange={setCurrency}
          maximumLength={3}
        />
        <p className="-mt-2 text-sm text-ink-muted">
          Eine neue Währung gilt für Preisrecherchen ab dem nächsten Neustart des Containers.
        </p>
        <TextField
          label="Monatliche Obergrenze für KI-Aufrufe"
          value={limitText}
          onChange={setLimitText}
          inputMode="numeric"
        />
        <p className="-mt-2 text-sm text-ink-muted">
          Ein erfasster Wein braucht zwei Aufrufe, eine Essensanfrage einen.
        </p>
        {errorCode && <ErrorNotice errorCode={errorCode} />}
        {isSaved && <p role="status">Gespeichert</p>}
        <button type="submit" className="button-primary">
          Einstellungen speichern
        </button>
      </form>
    </>
  );
}
```

Run: `npm run test:e2e` → all journey steps PASS.

- [ ] **Step 5: Responsive and accessibility review**

With the local deploy running, check in the browser dev tools at 360 px, 768 px and 1280 px:

- No horizontal scrolling on any page.
- Navigation: bottom bar below `md`, sidebar from `md`.
- Every page reachable and usable with the keyboard alone; focus ring visible.
- Lighthouse accessibility score ≥ 95 on `/`, `/wines/1`, `/pairing`. Fix every reported issue.

- [ ] **Step 6: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add cellar value, tasting history, settings and duplicate journey"
WINE_INTELLIGENCE_MODE=recorded npm run deploy:local
```

---

## Part 3 Done When

- `npm run verify` (including the Playwright journey) is green and the deploy is healthy.
- The whole journey works on a real phone against `http://<laptop-ip>:3000`.
- Continue with `2026-09-19-weinkeller-4-release.md`.
