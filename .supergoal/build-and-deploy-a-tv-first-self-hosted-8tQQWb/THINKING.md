# Thinking: TV-first self-hosted media hub

## Goals

- Build a Russian-language, dark cinematic PWA that remains responsive in the TD85W projector's 1 GB Android environment.
- Reuse Seerr as the discovery/catalog source instead of cloning TMDB business logic.
- Offer two explicit actions from one movie detail surface: request a compatible 1080p copy, or search/select a compatible torrent and hand it to TorrServer.
- Run locally through Docker first, with configuration that can later move unchanged to `192.168.0.168`.

## Constraints

- LAN-only and single-household; no public exposure or complex account system in v1.
- No indexers, credentials, copyrighted catalogs, or API secrets bundled in source control.
- Default compatibility policy is 1080p, SDR, H.264/x264; 2160p, HDR, Dolby Vision, remux, and risky 10-bit variants are rejected or strongly demoted.
- Current Docker daemon is stopped. The execution can complete native checks before Docker, but the local-container smoke test requires Docker Desktop to be started.
- Live home-server deployment and migration are out of scope for this run.

## Risks

1. **Upstream API drift (high):** Seerr and TorrServer APIs are not a stable shared SDK surface. Mitigate with typed adapters, fixture-based contract tests, timeouts, normalized errors, and a health screen.
2. **Projector UX/performance (high):** TD85W has 1 GB RAM and remote-control input. Mitigate with a small client bundle, lazy artwork, roving focus, deterministic arrow-key navigation, reduced motion, and 1280x720/1920x1080 screenshots.
3. **Unsafe torrent handoff/secrets (medium):** Raw URLs and API keys must never be browser-controlled. Mitigate with server-only secrets, opaque short-lived result IDs, scheme/origin validation, same-origin mutation checks, and LAN-only documentation.

## Dependencies

- Seerr must be initialized and connected to Radarr/Jellyfin before real download requests work.
- Jackett must have user-configured authorized indexers before torrent search returns results.
- TorrServer must be reachable before watch-now handoff can complete.
- Docker packaging follows the native vertical slice so the app remains testable without a daemon.
- Visual polish follows all interaction surfaces so screenshots cover real loading, empty, error, and success states.

## Open questions resolved as assumptions

- Use React/Vite + Fastify TypeScript with npm workspaces; no user stack preference was stated.
- Use Seerr's API-key authentication server-side and do not reproduce Seerr login in v1.
- Show ranked torrent choices instead of silently selecting a release; this prevents a wrong dub/edition from starting.
- Open TorrServer's returned stream/playlist URL in a browser/player handoff; native in-page playback is a progressive enhancement.
- Include optional full-lab Compose services, while the default mock profile stays deterministic and credential-free.

## Memory hits applied

- None found.

## Tools and skills relied on

- Web research against the current Seerr, Jackett, and TorrServer primary repositories.
- `supergoal` for the execution protocol.
- Consult `browser:control-in-app-browser` during visual QA when the preview is available.

## Best practices applied

- Backend-for-frontend hides service credentials and normalizes upstream responses.
- Adapter interfaces plus HTTP fixtures isolate API drift.
- Abortable requests, explicit timeouts, bounded caches, and retry-safe mutations.
- TV focus is a first-class state machine, not incidental browser tab order.
- No automatic execution of the top torrent result; require one visible confirmation.
- Docker health checks and a setup diagnostic page make later server migration observable.

## Plan self-critique

- **Falsifiability:** one vague image criterion (`production runtime artifacts only`) was rewritten to explicit filesystem, dependency, user, and HTTP checks in ROADMAP and phase 8.
- **Phase atomicity:** clean; every phase has one shared verification gate and no phase name hides two independent deliverables.
- **Weakest dependency:** phase 2 feeds phases 3–6; contract fixtures, stable normalized errors, and redacted health probes are mandatory before any consumer phase may pass.
