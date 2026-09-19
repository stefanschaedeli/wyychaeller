# Weinkeller Part 4 — Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app installable on phones, verify it once against the real Claude API, and ship it to the Synology NAS with a German operating guide.

**Architecture:** A web app manifest and generated icons make the app installable. A build script produces an image archive for the NAS CPU architecture. A second compose file runs that image in Synology Container Manager with one data volume.

**Tech Stack:** Next.js metadata routes, sharp (icon generation), Docker Buildx, Synology Container Manager.

**Spec:** `docs/superpowers/specs/2026-09-19-weinkeller-design.md` (section 11)

**Prerequisite:** Parts 1–3 are complete.

## Global Constraints

Identical to Parts 1–3. In addition:

- The README is written for the owner, in German, with Swiss spelling.
- Never put a real API key into any committed file, image layer or screenshot.
- Tasks 2 and 3 contain steps only a human can do (real API key, NAS access). Mark them clearly and stop for the user there.

---

### Task 1: Installable web app (manifest and icons)

**Files:**
- Create: `scripts/generate-icons.mjs`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png` (generated), `src/app/manifest.ts`
- Modify: `src/app/layout.tsx`, `package.json`
- Test: `src/app/manifest.test.ts`

**Interfaces:**
- Produces: `GET /manifest.webmanifest`; npm script `icons:generate`.

- [ ] **Step 1: Write the failing manifest test**

`src/app/manifest.test.ts`:

```ts
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("web app manifest", () => {
  it("describes an installable standalone app in German", () => {
    const webManifest = manifest();

    expect(webManifest.name).toBe("Weinkeller");
    expect(webManifest.lang).toBe("de-CH");
    expect(webManifest.display).toBe("standalone");
    expect(webManifest.start_url).toBe("/");
  });

  it("references icon files that exist", () => {
    const iconPaths = (manifest().icons ?? []).map((icon) => icon.src);

    expect(iconPaths).toEqual(["/icons/icon-192.png", "/icons/icon-512.png"]);
    for (const iconPath of iconPaths) {
      expect(existsSync(`public${iconPath}`)).toBe(true);
    }
  });
});
```

Run: `npx vitest run src/app/manifest` → FAIL.

- [ ] **Step 2: Generate the icons**

`scripts/generate-icons.mjs`:

```js
// Renders the app icon (a serif "W" on bordeaux) into the sizes phones ask for.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const ICON_DIRECTORY = "public/icons";
const ICON_SIZES = [
  { fileName: "icon-192.png", size: 192 },
  { fileName: "icon-512.png", size: 512 },
  { fileName: "apple-touch-icon.png", size: 180 },
];

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#7b2d3a"/>
  <rect x="36" y="36" width="440" height="440" fill="none" stroke="#f6f1e7" stroke-width="6"/>
  <text x="256" y="345" text-anchor="middle" font-family="Georgia, serif" font-style="italic"
        font-size="300" fill="#f6f1e7">W</text>
</svg>`;

await mkdir(ICON_DIRECTORY, { recursive: true });
for (const { fileName, size } of ICON_SIZES) {
  await sharp(Buffer.from(iconSvg)).resize(size, size).png().toFile(`${ICON_DIRECTORY}/${fileName}`);
}
console.warn(`Generated ${ICON_SIZES.length} icons in ${ICON_DIRECTORY}`);
```

Add to `package.json` scripts: `"icons:generate": "node scripts/generate-icons.mjs"`.

Run: `npm run icons:generate`. Commit the generated PNG files so the Docker build does not need this step.

- [ ] **Step 3: Implement the manifest and link the Apple icon**

`src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Weinkeller",
    short_name: "Weinkeller",
    description: "Der eigene Weinkeller: erfassen, bewerten, rechtzeitig geniessen.",
    lang: "de-CH",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#f6f1e7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

In `src/app/layout.tsx`, extend `metadata`:

```ts
export const metadata: Metadata = {
  title: "Weinkeller",
  description: "Der eigene Weinkeller: erfassen, bewerten, rechtzeitig geniessen.",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Weinkeller", statusBarStyle: "default" },
};
```

Run: `npx vitest run src/app/manifest` → PASS.

- [ ] **Step 4: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: make the app installable with manifest and icons"
npm run deploy:local
curl -s http://localhost:3000/manifest.webmanifest
```

Expected: the manifest JSON. On an iPhone in the same network: Safari → Teilen → «Zum Home-Bildschirm» shows the bordeaux icon and opens without browser bars.

---

### Task 2: One real run against the Claude API (needs the user)

**Files:**
- Create: `docs/real-api-check.md`

This task costs a small amount of real money and needs the user's API key. **Stop and ask the user before Step 2.**

- [ ] **Step 1: Prepare**

Confirm `.env` is ignored: `git check-ignore .env` prints `.env`.

- [ ] **Step 2 (user): Provide the key**

The user creates `.env` from `.env.example` and sets `ANTHROPIC_API_KEY`. `CLAUDE_MODEL` stays `claude-opus-5` unless the user decides otherwise (see the cost note in the README task).

- [ ] **Step 3: Deploy with the real intelligence and capture three real labels**

```bash
npm run deploy:local
```

On the phone, capture three bottles: one famous wine, one ordinary supermarket wine, one obscure or small-producer wine. For each, check:

| Check | Expected |
|---|---|
| Label fields | producer, name, vintage match the bottle |
| Famous wine | critic scores with working source links, plausible drinking window, `confidence` researched |
| Obscure wine | no invented scores; window marked «geschätzt» |
| Food pairings, description | German, sensible |
| Second photo of the same bottle | «Schon im Keller», and no second research call in «Mehr» counter (it rises by 1, not 2) |
| Pairing | «Essen» recommends only captured wines; repeating the dish shows «Gespeicherte Antwort» |
| Offline | disable Wi-Fi on the laptop, capture → wine shows «wartet auf Analyse» with the unavailable message; re-enable and «Analyse erneut versuchen» works |

- [ ] **Step 4: Record what it cost**

Read the token usage:

```bash
sqlite3 data/weinkeller.db "select operation, count(*), sum(input_tokens), sum(output_tokens) from ai_usage group by operation;"
```

Write `docs/real-api-check.md` with: date, model, the table above with actual results, tokens per operation, and the cost per captured wine calculated from the current price list at https://www.anthropic.com/pricing (input and output price per million tokens, plus the web search fee per search). Note any prompt changes you made and why.

- [ ] **Step 5: Fix what the real run revealed**

For every failed check: write a failing unit test that reproduces it with a recorded response (for prompt or sanitizing problems: a test in `sanitize.test.ts` or `claude-wine-intelligence.test.ts`), fix, verify. Prompt wording changes go to `prompts.ts` only.

- [ ] **Step 6: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "docs: record real API check and resulting fixes"
npm run deploy:local
```

---

### Task 3: NAS image, compose file and German README

**Files:**
- Create: `scripts/build-nas-image.sh`, `docker-compose.nas.yml`, `README.md` (replace the scaffold README)
- Modify: `package.json`, `.gitignore`, `.dockerignore`

**Interfaces:**
- Produces: npm script `image:nas`; archive `dist/weinkeller-<version>-<architecture>.tar.gz`.

- [ ] **Step 1: Build script**

`scripts/build-nas-image.sh`:

```bash
#!/usr/bin/env bash
# Builds the image for the NAS CPU and writes it as an archive that
# Synology Container Manager can import (Image → Hinzufügen → Aus Datei).
set -euo pipefail

# Most Synology Plus models are Intel/AMD (amd64). Models with ARM CPUs need "arm64".
ARCHITECTURE="${1:-amd64}"
VERSION="$(node -p "require('./package.json').version")"
IMAGE_TAG="weinkeller:${VERSION}"
ARCHIVE_PATH="dist/weinkeller-${VERSION}-${ARCHITECTURE}.tar.gz"

mkdir -p dist
docker buildx build --platform "linux/${ARCHITECTURE}" --tag "$IMAGE_TAG" --load .
docker save "$IMAGE_TAG" | gzip > "$ARCHIVE_PATH"

echo "Image archive written to ${ARCHIVE_PATH}"
echo "Use image tag ${IMAGE_TAG} in docker-compose.nas.yml"
```

Run `chmod +x scripts/build-nas-image.sh`. Add `"image:nas": "bash scripts/build-nas-image.sh"` to `package.json`, `dist/` to `.gitignore` and `dist` to `.dockerignore`. Set `"version": "1.0.0"` in `package.json`.

- [ ] **Step 2: Compose file for the NAS**

`docker-compose.nas.yml`:

```yaml
# For Synology Container Manager: Projekt → Erstellen → this file.
# Put ANTHROPIC_API_KEY into a file named ".env" in the same project folder.
services:
  weinkeller:
    image: weinkeller:1.0.0
    container_name: weinkeller
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      CLAUDE_MODEL: ${CLAUDE_MODEL:-claude-opus-5}
    volumes:
      - /volume1/docker/weinkeller/data:/data
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
      start_period: 20s
```

- [ ] **Step 3: Prove the archive works before touching the NAS**

```bash
npm run image:nas
docker compose down
docker image rm weinkeller:1.0.0
gunzip -c dist/weinkeller-1.0.0-amd64.tar.gz | docker load
docker run --rm -d --name weinkeller-archive-check -p 3005:3000 -v "$(pwd)/.e2e-data:/data" weinkeller:1.0.0
sleep 8 && curl -s http://localhost:3005/api/health
docker stop weinkeller-archive-check
```

Expected: `{"status":"ok"}`. On an Apple Silicon Mac the amd64 image runs under emulation and starts slowly; that is fine. If it never becomes healthy, read `docker logs weinkeller-archive-check`: a missing native module means the `outputFileTracingIncludes` remedy from Part 1 is needed for this platform.

- [ ] **Step 4: Write the README (German)**

Replace `README.md` with these sections, written out in full sentences:

1. **Was die App kann** — five bullet points from the spec goal.
2. **Kosten** — AI calls happen only on capture, «Neu bewerten» and new dish questions; everything stored is free to view. Insert the measured cost per wine from `docs/real-api-check.md`. Explain the model choice exactly like this:
   - `claude-opus-5` (Standard): beste Erkennung und Recherche.
   - `claude-sonnet-5`: deutlich günstiger, für bekannte Weine meist ausreichend. Umstellen über `CLAUDE_MODEL`.
   - Die monatliche Obergrenze in «Mehr → Einstellungen» schützt vor Überraschungen.
3. **Lokal testen (Docker Desktop)** — `cp .env.example .env`, key eintragen, `npm run deploy:local`, `http://localhost:3000`; ohne Kosten ausprobieren mit `WINE_INTELLIGENCE_MODE=recorded npm run deploy:local`.
4. **Installation auf dem Synology NAS** — numbered steps:
   1. CPU-Architektur prüfen: Systemsteuerung → Info-Center, oder per SSH `uname -m` (`x86_64` → `amd64`, `aarch64` → `arm64`).
   2. Auf dem Mac: `npm run image:nas` (für ARM: `bash scripts/build-nas-image.sh arm64`).
   3. File Station: Ordner `/docker/weinkeller` und darin `data` anlegen. `dist/weinkeller-1.0.0-amd64.tar.gz`, `docker-compose.nas.yml` hochladen.
   4. Schreibrecht für den Container (läuft als Benutzer-ID 1000): per SSH `sudo chown -R 1000:1000 /volume1/docker/weinkeller/data`.
   5. Im Ordner eine Datei `.env` mit der Zeile `ANTHROPIC_API_KEY=…` anlegen.
   6. Container Manager → Image → Hinzufügen → Aus Datei → Archiv wählen.
   7. Container Manager → Projekt → Erstellen → Pfad `/docker/weinkeller`, vorhandene `docker-compose.nas.yml` verwenden → Starten.
   8. Im Heimnetz öffnen: `http://<NAS-IP>:3000`. Auf dem Handy «Zum Home-Bildschirm» hinzufügen.
5. **Hinweis zur Installation als App** — iPhone: funktioniert über «Zum Home-Bildschirm». Android/Chrome verlangt für die echte App-Installation HTTPS; optional über DSM → Anmeldeportal → Reverse Proxy mit Zertifikat. Ohne HTTPS funktioniert die App normal im Browser, inklusive Kamera.
6. **Zugriff von unterwegs** — nur über VPN (Synology VPN Server oder Tailscale). Den Port 3000 nie direkt ins Internet freigeben: die App hat bewusst kein Login.
7. **Backup** — Hyper Backup: Ordner `/docker/weinkeller/data` aufnehmen (enthält `weinkeller.db` und `photos/`). Wiederherstellen: Ordner zurückspielen, Projekt starten.
8. **Update** — neues Archiv bauen, importieren, in `docker-compose.nas.yml` die Version anpassen, Projekt neu erstellen. Datenbank-Migrationen laufen beim Start automatisch.
9. **Entwicklung** — `npm run dev` (Port 3001), `npm run verify`, `npm run deploy:local`, Verweis auf Spec und Pläne, die Qualitätsregeln aus Spec Abschnitt 8 in fünf Zeilen.
10. **Fehlerbehebung** — table: «Kein API-Schlüssel hinterlegt» → `.env` prüfen, Projekt neu starten · «wartet auf Analyse» → Internet des NAS prüfen, dann «Analyse erneut versuchen» · Container startet nicht, Log zeigt `SQLITE_CANTOPEN` oder `EACCES` → Schritt 4.4 (Schreibrecht) · Obergrenze erreicht → «Mehr → Einstellungen».

- [ ] **Step 5: Verify, commit, deploy**

```bash
npm run format && npm run verify
git add -A
git commit -m "feat: add NAS image build, compose file and German operating guide"
npm run deploy:local
```

- [ ] **Step 6 (user): Install on the NAS**

The user follows README section 4. Afterwards confirm together:

- `http://<NAS-IP>:3000/api/health` answers `{"status":"ok"}` from a phone.
- One real capture works end to end on the NAS.
- After Container Manager → Projekt → Stoppen/Starten, the captured wine and its photo are still there.
- Hyper Backup task includes the `data` folder.

Tag the release: `git tag v1.0.0`.

---

## Part 4 Done When

- The app runs on the NAS, reachable from every phone in the home network.
- `docs/real-api-check.md` documents a successful real run and its cost.
- `git tag v1.0.0` exists.
