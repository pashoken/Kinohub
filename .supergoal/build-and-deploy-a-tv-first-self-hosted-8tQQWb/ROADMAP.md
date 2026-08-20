# Roadmap: KinoHub TV

**Task:** Build a local Dockerized TV-first media catalog that requests 1080p media through Seerr and starts selected torrents through Jackett/TorrServer.
**Type:** greenfield, ui, integration
**Created:** 2026-08-19
**Total phases:** 9

## Context summary

- **Stack:** TypeScript, React, Vite PWA, Fastify, npm workspaces, Vitest, Playwright, Docker Compose
- **Package manager:** npm
- **Build / test / lint commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `docker compose config`
- **Risky areas:** upstream API contracts, TV remote navigation, torrent handoff validation, secrets, weak projector performance

## Assumptions

- The interface is Russian, dark, cinematic, remote-first, and intended for one trusted household LAN.
- Seerr supplies discovery/search/detail data and routes download requests to Radarr; no TMDB key is exposed to the new app.
- Watch-now presents ranked choices and asks for confirmation before sending one to TorrServer.
- Compatibility defaults reject 2160p/HDR/Dolby Vision and prefer 1080p SDR H.264/x264.
- Docker Desktop will be started before the container smoke-test phase; native development remains available before that.
- Only locally configured, legally accessible indexers and media sources are used; none are bundled.
- Home-server deployment is deferred; this run stops at a verified local Docker deployment and migration documentation.

## Risk top 3

1. **Upstream API drift** — likelihood: high, mitigation: typed adapters, fixture contract tests, health probes, normalized failure states.
2. **Poor TD85W experience** — likelihood: high, mitigation: bundle budgets, artwork lazy-loading, deterministic spatial focus, reduced motion, TV-size screenshots.
3. **Secret/URL abuse** — likelihood: medium, mitigation: server-only environment configuration, opaque result IDs, allowlisted schemes/origins, same-origin mutations.

## Phase map

| # | Phase | Depends on | Deliverable |
|---|---|---|---|
| 1 | Scaffold runnable foundation | — | Buildable workspace, mock vertical slice, tests and configuration contract |
| 2 | Build integration gateway | 1 | Typed Seerr/Jackett/TorrServer clients, health API, resilient error model |
| 3 | Deliver catalog experience | 1, 2 | TV home, search, details, posters and catalog states |
| 4 | Add request workflow | 2, 3 | One-click 1080p request and live request-status feedback |
| 5 | Rank torrent choices | 2, 3 | Torznab parsing, compatibility scoring and choice UI |
| 6 | Launch instant playback | 2, 5 | Safe TorrServer handoff, file selection and player launch flow |
| 7 | Tune projector controls | 3, 4, 5, 6 | Remote navigation, PWA installability and projector performance |
| 8 | Package local Docker lab | 1..7 | Production image, mock/default Compose and optional full media stack |
| 9 | Polish & Harden | 1..8 | Security, accessibility, performance, visual and regression audit |

---

## Phase 1 — Scaffold runnable foundation

**Why:** Establish a deterministic vertical slice and engineering safety net before integration complexity arrives.

**Deliverables:**
- Root workspace manifests and configs: `package.json`, `tsconfig*.json`, ESLint/Vitest configuration, `.env.example`, `.gitignore`
- `apps/web/` React/Vite shell and `apps/server/` Fastify shell
- Shared API contracts and mock fixtures under `packages/contracts/` and `fixtures/`
- `README.md` with native first-run instructions

**Acceptance criteria:**
- [ ] `npm install` completes and creates a lockfile.
- [ ] Root build, typecheck, lint, and unit-test commands all exit 0.
- [ ] The native dev command serves a mock catalog response and renders at least one movie card.
- [ ] Environment validation fails with a readable message for malformed required values.
- [ ] No real service credential or tracker configuration exists in committed files.

**Mandatory commands:** `npm install`, `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`

**Evidence required:** command summaries, created-file listing, mock API response, rendered-shell screenshot or DOM assertion.

**Dependencies:** none

---

## Phase 2 — Build integration gateway

**Why:** Hide credentials and API volatility behind one tested backend boundary.

**Deliverables:**
- `apps/server/src/integrations/` adapters for Seerr, Jackett Torznab, TorrServer, and optional Jellyfin links
- Health/configuration endpoints with redacted diagnostics
- Shared timeout, retry, validation, cache, and normalized error utilities
- Contract fixtures and adapter tests

**Acceptance criteria:**
- [ ] Seerr client authenticates with a server-side `X-Api-Key` and normalizes discover/search/detail payloads.
- [ ] Jackett client constructs documented Torznab search queries and parses representative XML fixtures.
- [ ] TorrServer client supports health, add, inspect/list, playlist/stream handoff through a typed interface.
- [ ] Every upstream call has an abort timeout and maps network/non-2xx/invalid-body failures to stable error codes.
- [ ] `/api/health/integrations` never exposes API keys, credentials, magnet links, or raw environment values.
- [ ] Mock and unavailable modes are separately testable.

**Mandatory commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`

**Evidence required:** adapter test summary, redacted health JSON, timeout/error test excerpts.

**Dependencies:** phase 1

---

## Phase 3 — Deliver catalog experience

**Why:** Ship the core browsing surface users see before introducing mutations.

**Deliverables:**
- Home rails for trending/popular/recommended content
- Search overlay/page and movie detail screen
- Reusable poster, backdrop, metadata, skeleton, empty-state, and error components
- Client API layer with cancellation and bounded artwork loading

**Acceptance criteria:**
- [ ] Home renders at least three catalog rails from normalized data without horizontal page overflow at 1280×720 and 1920×1080.
- [ ] Search debounces input, cancels stale requests, and produces an explicit no-results state.
- [ ] Movie details show title, year, runtime when available, rating, overview, genres, backdrop, and availability/request status.
- [ ] Loading, empty, partial-artwork, upstream-unavailable, and retry states have automated component coverage.
- [ ] Images use lazy loading and responsive sizes; no API credential appears in browser requests or built assets.
- [ ] Russian copy is used for every visible state introduced in this phase.

**Mandatory commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`

**Evidence required:** component test summary, 1280×720 and 1920×1080 screenshots, built-asset secret scan.

**Dependencies:** phases 1 and 2

---

## Phase 4 — Add request workflow

**Why:** Turn catalog discovery into a reliable saved-library action through Seerr/Radarr.

**Deliverables:**
- Download/request backend endpoint and Seerr request adapter
- `1080p SDR` action UI with confirmation, pending, success, duplicate, and failure states
- Request polling/status badges and Jellyfin availability link when present

**Acceptance criteria:**
- [ ] Pressing `Скачать 1080p` sends exactly one idempotent request for the selected movie and configured non-4K server/profile.
- [ ] Repeated activation while pending cannot create duplicate requests.
- [ ] Existing, pending, processing, available, failed, and unauthorized upstream states map to distinct Russian UI states.
- [ ] The configured quality policy is displayed before confirmation and never claims to force a profile the upstream did not confirm.
- [ ] Mock integration tests cover success, duplicate, timeout, and rejected-request responses.
- [ ] Available media exposes a same-LAN Jellyfin deep link without leaking its API key.

**Mandatory commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`

**Evidence required:** request API transcripts with redaction, state-machine tests, success/failure UI screenshots.

**Dependencies:** phases 2 and 3

---

## Phase 5 — Rank torrent choices

**Why:** Make instant viewing predictable by filtering incompatible releases while preserving user choice.

**Deliverables:**
- Release-title parser and deterministic compatibility scorer
- Short-lived server-side search-result cache with opaque client IDs
- Torrent-choice drawer optimized for remote control

**Acceptance criteria:**
- [ ] Search uses movie title, year, and available identifiers without placing the Jackett key in the browser.
- [ ] 1080p, SDR, H.264/x264, useful seed count, and reasonable size increase ranking deterministically.
- [ ] 2160p, HDR, Dolby Vision, remux, CAM/TS, and ambiguous low-quality results are rejected or visibly marked incompatible according to documented rules.
- [ ] Client payloads contain opaque result IDs and display metadata but no magnet/download URL.
- [ ] Choices show source, release name, resolution/codec flags, size, seeders, score rationale, and a compatibility badge.
- [ ] Parser/scorer tests cover Cyrillic names, multiple editions, missing fields, malformed XML, and tie ordering.

**Mandatory commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`

**Evidence required:** ranking fixture table, opaque API response, choice-drawer screenshot, parser/scorer test summary.

**Dependencies:** phases 2 and 3

---

## Phase 6 — Launch instant playback

**Why:** Complete the golden path from a catalog card to a validated TorrServer stream handoff.

**Deliverables:**
- Confirmed handoff endpoint consuming only opaque release IDs
- TorrServer add/inspect/file-selection flow and expiring playback session model
- Player-launch screen with browser, external-player, retry, cancel, and diagnostics actions

**Acceptance criteria:**
- [ ] A valid selected result is resolved server-side and submitted once to TorrServer with a sanitized title/poster.
- [ ] Expired, unknown, replayed, or tampered result IDs fail without forwarding arbitrary URLs.
- [ ] Multi-file torrents present video files in deterministic natural order and ignore samples/non-video entries by default.
- [ ] Playback URLs are derived only from configured TorrServer responses/base URL and use permitted schemes.
- [ ] The UI offers a standard stream link plus a copy/open-external-player fallback without embedding secrets.
- [ ] Mock end-to-end tests cover single-file success, multi-file choice, no playable files, TorrServer timeout, and retry.

**Mandatory commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`

**Evidence required:** sanitized handoff transcript, end-to-end mock tests, playback/file-choice screenshots.

**Dependencies:** phases 2 and 5

---

## Phase 7 — Tune projector controls

**Why:** Make the complete experience usable from the TD85W remote rather than merely usable with a mouse.

**Deliverables:**
- Spatial focus/navigation system for rails, dialogs, buttons, search, back behavior, and focus restoration
- PWA manifest, icons, service-worker shell caching, reduced-motion behavior
- TV-focused end-to-end tests and performance budgets

**Acceptance criteria:**
- [ ] Arrow keys traverse rails and vertical sections deterministically; Enter activates; Back/Escape closes the top surface or returns to the prior screen.
- [ ] Focus is always visible, trapped inside open dialogs, and restored to the originating card after close/back.
- [ ] All golden paths can be completed by keyboard alone in Playwright tests.
- [ ] The app is installable as a PWA and its shell loads to a useful offline/unavailable state without cached secrets or catalog responses.
- [ ] Initial compressed JavaScript stays below 350 KB and no single poster request exceeds its configured responsive target in the mock fixture.
- [ ] Reduced-motion mode removes non-essential transitions.

**Mandatory commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`

**Evidence required:** keyboard E2E summary, focus screenshots, PWA manifest/service-worker verification, bundle-size report.

**Dependencies:** phases 3, 4, 5, and 6

---

## Phase 8 — Package local Docker lab

**Why:** Produce the exact local deployment artifact that can later migrate to the home server.

**Deliverables:**
- Multi-stage `Dockerfile`, `.dockerignore`, health check, non-root runtime
- Default `compose.yaml` for KinoHub plus deterministic mock services
- Optional `compose.full.yaml` profile for Seerr, Radarr, Sonarr, qBittorrent, Jackett, TorrServer, and Jellyfin
- Setup wizard/diagnostics and `docs/local-docker.md`, `docs/server-migration.md`

**Acceptance criteria:**
- [ ] Both Compose files pass `docker compose config` with `.env.example` and contain persistent named/bind volumes for stateful services.
- [ ] Production image runs as a numeric non-root user; `/app` contains built server/web artifacts but no `src`, test, or `.env` files; production dependency inspection succeeds; and the health endpoint returns 200.
- [ ] Default mock stack starts without third-party credentials and serves the complete catalog/request/search/watch demo flow.
- [ ] Full-lab profile declares health/dependency ordering and does not bundle indexer accounts, API keys, or media sources.
- [ ] Setup diagnostics identify missing/unreachable Seerr, Jackett, TorrServer, Radarr, and Jellyfin connections with actionable Russian messages.
- [ ] Migration documentation maps local volumes/environment variables to the later Ubuntu server without performing that migration.

**Mandatory commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `docker compose config`, `docker compose -f compose.full.yaml config`, `docker compose up -d --build`, `npm run smoke:docker`, `docker compose down`

**Evidence required:** Compose validation output, image/user/size inspection, container health output, smoke-test response, redacted configuration screenshots.

**Dependencies:** phases 1 through 7

---

## Phase 9 — Polish & Harden

**Why:** Catch cross-phase gaps and verify the final product against TV UX, security, accessibility, performance, and reliability requirements.

**Deliverables:**
- Final fixes across `apps/`, `packages/`, Docker artifacts, tests, and documentation
- Visual evidence under `artifacts/screenshots/` and engineering reports under `artifacts/reports/`
- Final local runbook and limitations section

**Acceptance criteria:**
- [ ] Every visible string is intentional Russian copy; no placeholder/debug text remains.
- [ ] Loading, empty, upstream-error, timeout, unauthorized, expired-result, no-playable-file, and offline states are verified.
- [ ] Empty/long/Cyrillic/special-character searches and slow/stale responses pass automated tests.
- [ ] Origin checks, input schemas, URL policies, secret scans, dependency review, and non-root container checks report no unresolved high-severity finding.
- [ ] Keyboard navigation, focus order, labels, landmarks, and contrast pass automated checks plus screenshot review.
- [ ] Client bundle budget and catalog interaction timing budgets pass on the production build.
- [ ] Final screenshots at 1280×720 and 1920×1080 cover home, search, detail, torrent choice, request success, playback, and error states.
- [ ] Full build/typecheck/lint/unit/E2E/Docker smoke suites pass with zero new warnings.
- [ ] Final diff contains no stray debug logs, session TODO/FIXME markers, dead imports, secrets, or unrelated changes.

**Mandatory commands:** `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run check:bundle`, `npm run check:secrets`, `docker compose config`, `docker compose -f compose.full.yaml config`, `docker compose up -d --build`, `npm run smoke:docker`, `docker compose down`

**Evidence required:** one paragraph per hardening sub-pass, final screenshots, accessibility/bundle/security reports, final diff stat, full test summary.

**Dependencies:** phases 1 through 8
