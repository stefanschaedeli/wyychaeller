# Changelog

Versions follow `MAJOR.MINOR.PATCH`: PATCH for fixes, MINOR for new features, MAJOR for releases that need a manual migration or that the owner declares major.

## 1.0.0 — 2026-09-20

First release.

- Capture a wine by photographing its label; Claude (image analysis plus web search) identifies it and researches drinking window, food pairings, critic scores with sources and market value.
- All AI results are stored, so reading the cellar never costs anything; costs arise only on explicit actions, limited by a monthly call budget and a rate limit.
- Cellar list with search and filters, «Bald trinken», «Was passt zu meinem Essen?», storage locations, tasting notes with star rating and history, purchase prices and cellar value.
- Duplicate detection with merge, settings for currency and the monthly AI budget.
- Installable as a home-screen app (PWA manifest and icons).
- Runs as one hardened Docker container (non-root, read-only file system, no capabilities) with SQLite and photos in one data folder; NAS image archive and German installation guide in `README.md`.
