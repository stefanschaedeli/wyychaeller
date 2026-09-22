# Weinkeller

🇩🇪 Deutsche Version: [README.de.md](README.de.md)

A small, self-hosted web app for recording the wines in your own cellar. A single label photo is enough: an AI with web search classifies and rates the wine, determines its drinking window and suggests food to go with it. The repository name, «Wyychäller», is Swiss German for wine cellar; the app itself speaks German.

## Table of contents

1. [What the app does](#1-what-the-app-does)
2. [Choosing an AI provider and getting an API key](#2-choosing-an-ai-provider-and-getting-an-api-key)
3. [Costs](#3-costs)
4. [Testing locally (Docker Desktop)](#4-testing-locally-docker-desktop)
5. [Installing on a Synology NAS](#5-installing-on-a-synology-nas)
6. [Installing as an app](#6-installing-as-an-app)
7. [Access from outside the home](#7-access-from-outside-the-home)
8. [Security](#8-security)
9. [Backup](#9-backup)
10. [Updating](#10-updating)
11. [Development](#11-development)
12. [Troubleshooting](#12-troubleshooting)
13. [License](#13-license)

## 1. What the app does

- Recording a wine takes only a label photo and a confirmation.
- An AI with web search classifies the wine, rates it, determines the drinking window and suggests matching dishes.
- All AI results are stored locally for good: viewing, searching and filtering cost nothing and need no internet.
- The app shows which wines should be drunk soon and recommends the right bottle from the cellar for a given dish.
- Runs as a single Docker container anywhere. This guide describes Docker Desktop for testing and a Synology NAS for permanent use, which is the author's setup.
- **Important:** The app deliberately has no login. It belongs on your home network; reach it from outside only through a VPN and never expose its port directly to the internet (see sections 7 and 8).

## 2. Choosing an AI provider and getting an API key

The app works with either **Google Gemini** or **Claude by Anthropic**. Both read the label, research the wine on the web and recommend wines for a dish; the app behaves the same with both. You only need the key of the provider you choose. You can switch at any time in `.env`; wines already recorded stay unchanged.

|                   | Google Gemini                                          | Claude (Anthropic)                                |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Cost per wine     | about 1 Rappen (measured)                              | about 8–16 Rappen (estimated)                     |
| Web search        | Google Search, free up to 5,000 queries per month      | 1 Rappen per search, results are billed as tokens |
| Default model     | `gemini-3.7-flash`                                     | `claude-sonnet-5`                                 |
| Setting in `.env` | `WINE_INTELLIGENCE_MODE=gemini` and `GEMINI_API_KEY=…` | `ANTHROPIC_API_KEY=…`                             |
| Recommendation    | the best choice for most cellars                       | alternative, `claude-opus-5` for rare wines       |

Prices are given in Rappen (Swiss cents, CHF 0.01). Without `WINE_INTELLIGENCE_MODE` the app uses Claude, which keeps existing installations running unchanged.

### Google Gemini: getting a key

1. Open [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Choose «Create API key». Google automatically creates a project the key belongs to.
3. Click «Set up billing» on the project, create or select a billing account and choose a model: **Prepay** (load credit from 5 US dollars upfront, enough for several hundred wines) or Postpay (billed at the end of the month). This step is required: with a free-tier key, Google refuses web search on the Gemini 3 models and the app reports that the AI service is unreachable.
4. Recommended: set a low «Monthly spend cap» on the «Spend» page. With Prepay and no automatic top-up, the credit is the cap anyway.
5. Copy the key and put it into `.env`:

   ```bash
   WINE_INTELLIGENCE_MODE=gemini
   GEMINI_API_KEY=paste-the-key-here
   ```

On the paid tier, Google states in its terms that it does not use label photos and requests to improve its products; on the free tier it does.

### Claude (Anthropic): getting a key

1. Open [platform.claude.com](https://platform.claude.com) and create an account.
2. Load credit under «Billing» (from 5 US dollars).
3. Under «API keys» create a key with «Create key» and copy it. It is shown only once.
4. Recommended: set a monthly spend limit under «Limits».
5. Put it into `.env`:

   ```bash
   ANTHROPIC_API_KEY=paste-the-key-here
   ```

### Switching providers

Set `WINE_INTELLIGENCE_MODE` in `.env` to `gemini` or `claude` and restart the container (locally `npm run deploy:local`, on the NAS Project → Action → «Build»). The start-up line in the log shows the active provider and model, for example `intelligenceMode=gemini model=gemini-3.7-flash`.

## 3. Costs

AI calls happen only on three actions: when a wine is recorded (label reading and research), on «Re-evaluate», and on a new question about a matching wine for a dish. Everything already stored costs nothing to view, search or filter. A single question about a wine for a dish costs far less than recording a wine.

**Google Gemini** (`gemini-3.7-flash`), measured on two test wines: about 1 Rappen per recorded wine (about 2,300 input and 2,000 output tokens, 3–4 search queries, about 15 seconds). Google Search is free up to 5,000 queries per month, and its results are not billed as tokens. According to Google, the list price of `gemini-3.7-flash` doubles on 1 January 2027; even then a wine stays at a few Rappen. Another model can be chosen via `GEMINI_MODEL`; `gemini-2.5-flash` gave noticeably thinner results in testing.

**Claude**, estimated: with `claude-sonnet-5` about 8–16 Rappen per recorded wine, including the web search fee. Most of it goes to web search, because its results are billed as input tokens (measured at about 50,000 tokens per wine).

- `claude-sonnet-5` (default): usually sufficient for well-known wines.
- `claude-opus-5`: best recognition and research, also for rare wines, about 2.5 times the price (20–40 Rappen). Switch with `CLAUDE_MODEL=claude-opus-5` in `.env`.

For both providers: «Re-evaluate» uses whichever provider and model is configured. The monthly cap under «Mehr → Einstellungen» (More → Settings) protects against surprises.

To try the app for free without any API call, use `WINE_INTELLIGENCE_MODE=recorded` (see section 4): it returns recorded, realistic answers instead of real AI calls.

## 4. Testing locally (Docker Desktop)

```bash
cp .env.example .env
# put the provider and API key into .env (see section 2)
npm run deploy:local
```

The app is then available at [http://localhost:3010](http://localhost:3010). The host port can be changed with the environment variable `WEINKELLER_PORT`; inside the container and on the NAS the port is always 3000.

To try it at no cost, with recorded instead of real AI answers:

```bash
WINE_INTELLIGENCE_MODE=recorded npm run deploy:local
```

## 5. Installing on a Synology NAS

GitHub Actions builds the image for every version tag (for Intel/AMD and ARM) and publishes it as a public package in this repository's container registry: `ghcr.io/stefanschaedeli/wyychaeller`. The NAS pulls it from there; no registry login is needed.

1. File Station: create the folder `/docker/weinkeller` with a `data` folder inside. Upload `docker-compose.nas.yml` and a file `.env` containing the provider and API key (for Gemini the lines `WINE_INTELLIGENCE_MODE=gemini` and `GEMINI_API_KEY=…`, for Claude the line `ANTHROPIC_API_KEY=…`, see section 2). Both files must sit side by side in `/docker/weinkeller`. Without a real API key the app also works in the free demo mode: add `WINE_INTELLIGENCE_MODE=recorded` to the same `.env`.
2. Write permission for the container (runs as user ID 1000): via SSH `sudo chown -R 1000:1000 /volume1/docker/weinkeller/data`.
3. Container Manager → Project → Create → path `/docker/weinkeller`, use the existing `docker-compose.nas.yml` → Start. The image is downloaded automatically.
4. Open it on the home network: `http://<NAS-IP>:3000`. On the phone, choose «Add to Home Screen».

**Log:** The app continuously writes what it is doing to the container log: every request, every analysis step, every AI call with duration and token usage, the web searches, photos and changes to the cellar. View it in Container Manager under Container → `weinkeller` → Details → Log, or via SSH with `docker logs -f weinkeller`. `LOG_LEVEL` in `.env` controls the verbosity: `info` (default), `debug` (adds healthcheck and photo requests), `warn`, `error` or `silent`. The API key, photos and AI answer texts are never logged.

**Updating:** Container Manager → Image → `ghcr.io/stefanschaedeli/wyychaeller` → Update (or via SSH `docker pull ghcr.io/stefanschaedeli/wyychaeller:latest`), then Project → Action → «Build» (rebuild). The data in `data` is kept. To pin a version, replace `latest` in `docker-compose.nas.yml` with e.g. `1.1.0`.

**Without the registry (offline):** On a Mac run `npm run image:nas` (for ARM: `bash scripts/build-nas-image.sh arm64`), import the archive from `dist/` in Container Manager under Image → Add → Import from file, and set the image in `docker-compose.nas.yml` to `weinkeller:<version>`.

## 6. Installing as an app

On the iPhone, «Add to Home Screen» works directly, without HTTPS. Android/Chrome requires HTTPS for the real app installation (with an install dialog); that can optionally be set up via DSM → Login Portal → Reverse Proxy with a certificate. Without HTTPS the app works normally in the browser, including the camera for the label photo.

## 7. Access from outside the home

From outside, connect only through a VPN (Synology VPN Server or Tailscale). Never expose port 3000 directly to the internet: the app deliberately has no login (see section 1).

## 8. Security

- The app deliberately has no login. Therefore never expose the port to the internet; access from outside only via VPN or Tailscale (see section 7).
- The API key lives only in the `.env` file next to the compose file, never in the image and never in Git.
- Set a spend cap at the AI provider (Google AI Studio: «Spend» → «Monthly spend cap»; Anthropic: «Limits») so that a malfunction or a leak stays bounded.
- Backups (see section 9) contain label photos and the database; store them with corresponding care.

## 9. Backup

Hyper Backup: include the folder `/docker/weinkeller/data` (contains `weinkeller.db` and `photos/`). Restore: copy the folder back, start the project.

## 10. Updating

Build a new archive, import it, adjust the version in `docker-compose.nas.yml`, rebuild the project. Database migrations run automatically at start-up.

## 11. Development

- `npm run dev` — development server on port 3001.
- `npm run verify` — format, lint, type check, tests and the Playwright journey (Playwright needs a free port 3100).
- `npm run deploy:local` — build and start locally, see section 4.
- Contributions are welcome: `npm run verify` must pass; CI runs it on every push and pull request. Thanks to `WINE_INTELLIGENCE_MODE=recorded`, development needs no API key.
- `npm run verify` runs `npm audit` only from level `high` (`--audit-level=high`), deliberately. A known moderate finding (`drizzle-kit` → `esbuild`, development server only, GHSA-67mh-4wv8-2f99) affects only `npm run database:generate` during development and is not part of the runtime image; it is knowingly accepted.

Quality rules:

1. TypeScript strict, no `any`, no unjustified non-null assertions.
2. Small files (max. 250 lines), small functions, clear layers: the UI never calls the database or the AI service directly.
3. Descriptive, spelled-out names; no abbreviations; booleans with `is`/`has`.
4. No magic values — constants live centrally in `src/domain/constants.ts`.
5. Test-driven (TDD); `npm run verify` must be green before every commit.

## 12. Troubleshooting

| Symptom                                                               | Action                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| «Kein API-Schlüssel hinterlegt» (no API key configured)               | Check `.env`: the key must match the provider in `WINE_INTELLIGENCE_MODE`. Restart the project. |
| With Gemini: «KI-Dienst nicht erreichbar», log shows `httpStatus=429` | The key is on the free tier. Set up billing (section 2, step 3).                                |
| «wartet auf Analyse» (waiting for analysis) never finishes            | Check the NAS's internet connection, then «Analyse erneut versuchen» (retry analysis).          |
| Container does not start, log shows `SQLITE_CANTOPEN` or `EACCES`     | Repeat step 5.2 (write permission on `data`).                                                   |
| Unclear what the app is doing right now                               | Read the container log (`docker logs -f weinkeller`), with `LOG_LEVEL=debug` if needed.         |
| Monthly cap reached                                                   | Open «Mehr → Einstellungen» (More → Settings) and adjust the cap.                               |

A changed currency in the settings only affects the price research after the container is restarted.

## 13. License

MIT, see [LICENSE](LICENSE).
