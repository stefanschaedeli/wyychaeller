# Weinkeller — project note

A self-hosted, German-language web app for recording the wines in a home cellar. A single label photo is enough: Claude (image analysis plus web search) classifies and rates the wine, determines its drinking window, and suggests food pairings.

Spec and implementation plans live under `docs/superpowers/` (`docs/superpowers/specs/` for the design spec, `docs/superpowers/plans/` for the phased plans).

## Layering rules

- UI (`src/components`, `src/app` pages) never imports `@/server/*`; it uses `@/lib/api-client`, `@/shared/api-contract` and `@/domain/*` only.
- Only `src/server/wine-intelligence` imports the Anthropic SDK.
- Only `src/server/database` and `src/server/repository` import Drizzle (or `better-sqlite3`).
- Never use `instanceof` on project error classes in route-level code — Turbopack duplicates classes across chunks, so errors are recognised by name instead, in `src/server/http/handle-route.ts`.
- No magic values: named constants live in `src/domain/constants.ts`.

## Commands

- `npm run verify` — format check, lint, typecheck, unit tests and the Playwright journey.
- `npm run deploy:local` — build and run the app locally in Docker, then wait for it to become healthy.
- `WINE_INTELLIGENCE_MODE=recorded npm run deploy:local` — same, but with recorded AI answers instead of real API calls (no cost).

## Versioning, commits and releases

Repository: `github.com/stefanschaedeli/wyychaeller` (private), default branch `main`.

- Versions are `MAJOR.MINOR.PATCH`. The agent picks the level from what the session changed:
  - PATCH — fixes only (bugs, wording, docs, dependency updates), no new behaviour.
  - MINOR — new, backwards-compatible features or screens.
  - MAJOR — only when the user asks for a major release, or when existing data or the NAS installation would need manual migration.
- At the end of a work session: write the commit message from the session summary (conventional subject line such as `feat: …` or `fix: …`, then a short body saying what changed and why), without asking the user to word it.
- A release bumps the version in `package.json` and `package-lock.json` (`npm version X.Y.Z --no-git-tag-version`), adds a section to `CHANGELOG.md`, then commits, tags `vX.Y.Z` and pushes `main` with the tag.
- Pushing the tag makes GitHub Actions (`.github/workflows/release-image.yml`) build the amd64 + arm64 image and publish it as `ghcr.io/stefanschaedeli/wyychaeller:X.Y.Z` and `:latest`; the tag must match the `package.json` version. `ci.yml` runs `npm run verify` on every push to `main`.
- Never commit `.env`, `data/` or `dist/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
