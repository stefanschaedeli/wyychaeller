# Changelog

Versions follow `MAJOR.MINOR.PATCH`: PATCH for fixes, MINOR for new features, MAJOR for releases that need a manual migration or that the owner declares major.

## 1.3.0 — 2026-09-21

- Google Gemini as a second, much cheaper AI provider: set `WINE_INTELLIGENCE_MODE=gemini` and `GEMINI_API_KEY` (paid-tier key from Google AI Studio). Label reading, web research with Google Search and dish pairing all run on `gemini-3.7-flash` by default (`GEMINI_MODEL` changes it). Measured on two test wines: about 1 Rappen per captured wine instead of 8–16 with `claude-sonnet-5`, because Google Search is free up to 5,000 searches a month and its results are not billed as tokens.
- Claude stays the default, so existing installations keep working without any change; `WINE_INTELLIGENCE_MODE=claude` switches back at any time.
- The start-up banner and the missing-key messages name the active provider's settings.

## 1.2.0 — 2026-09-20

- Activity log: the app now writes what it is doing to the container log (`docker logs weinkeller`, or the log tab in the Container Manager) — every API request with status and duration, each analysis step and status change, every Claude call with model, duration, stop reason and token usage, the web searches it runs, photo handling, cellar changes, the AI budget and a start-up banner with version and configuration.
- New `LOG_LEVEL` variable: `info` (default), `debug` (adds healthcheck and photo requests), `warn`, `error` or `silent`. The API key, photo contents and AI answer texts are never logged; free text is quoted so it cannot forge log lines.
- Failures while rendering pages are logged too (`onRequestError`).

## 1.1.0 — 2026-09-20

- NAS deployment through GitHub Actions: every version tag builds a multi-architecture image (amd64 and arm64) and publishes it to the repository's private container registry, `ghcr.io/stefanschaedeli/wyychaeller`. The NAS pulls it from there; the manual archive upload remains as an offline alternative.
- Continuous integration: `npm run verify` runs on every push to `main` and on pull requests.
- `claude-sonnet-5` is the new default model (about 40 % of the cost of `claude-opus-5`); Opus stays available through `CLAUDE_MODEL`.

## 1.0.0 — 2026-09-20

First release.

- Capture a wine by photographing its label; Claude (image analysis plus web search) identifies it and researches drinking window, food pairings, critic scores with sources and market value.
- All AI results are stored, so reading the cellar never costs anything; costs arise only on explicit actions, limited by a monthly call budget and a rate limit.
- Cellar list with search and filters, «Bald trinken», «Was passt zu meinem Essen?», storage locations, tasting notes with star rating and history, purchase prices and cellar value.
- Duplicate detection with merge, settings for currency and the monthly AI budget.
- Installable as a home-screen app (PWA manifest and icons).
- Runs as one hardened Docker container (non-root, read-only file system, no capabilities) with SQLite and photos in one data folder; NAS image archive and German installation guide in `README.md`.
