SUPERGOAL_PHASE_START
Phase: 8 of 9 — Package local Docker lab
Task: Package KinoHub and an optional complete media lab for verified local Docker use.
Type: greenfield, integration
Mandatory commands: npm run build, npm run typecheck, npm run lint, npm test, docker compose config, docker compose -f compose.full.yaml config, docker compose up -d --build, npm run smoke:docker, docker compose down
Acceptance criteria: 6
Evidence required: compose output, image inspection, container health, smoke response, configuration screenshots
Depends on phases: 1, 2, 3, 4, 5, 6, 7

## Why

The user explicitly wants to validate locally in Docker before any home-server migration.

## Work

- Build a multi-stage production image that compiles workspaces, serves static UI/API, runs non-root, and exposes a health check.
- Create default `compose.yaml` with KinoHub and deterministic mock integrations for a zero-secret complete demo.
- Create optional `compose.full.yaml` with persistent configuration for Seerr, Radarr, Sonarr, qBittorrent, Jackett, TorrServer, and Jellyfin using current maintained images.
- Use profiles so heavy services are opt-in; document ports and avoid known conflicts from the eventual server.
- Build a setup/diagnostics screen with redacted connection tests and actionable Russian remediation.
- Write local Docker and later Ubuntu migration runbooks without changing the live server.

## Acceptance criteria (all must pass — verify each in transcript)

- `docker compose config` and `docker compose -f compose.full.yaml config` both exit 0 using documented example variables.
- The production image runs as a numeric non-root user; `/app` contains built server/web artifacts but no `src`, test, or `.env` files; production dependency inspection succeeds; and the health endpoint returns 200.
- Default mock Compose starts with no third-party credentials and its smoke test exercises catalog, request, torrent search, handoff, and readiness.
- Full-lab Compose defines persistent volumes, explicit networks, restart policies, and health/dependency behavior for all stateful services.
- No indexer account, API key, media source, default public exposure, or privileged container is bundled.
- `docs/local-docker.md` and `docs/server-migration.md` provide exact commands, port map, volume map, backup points, configuration order, and rollback boundaries.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `docker compose config`
- `docker compose -f compose.full.yaml config`
- `docker compose up -d --build`
- `npm run smoke:docker`
- `docker compose down`

## Evidence required in transcript

- Both Compose validation summaries.
- Image inspection showing user, size, entrypoint, and absence of dev source/dependencies where expected.
- `docker compose ps` health output and smoke-test response summary.
- Redacted setup diagnostics screenshot.
- Documentation file listing and port/volume mapping excerpt.

## Notes

Docker Desktop was stopped during planning. If it remains unavailable, follow the Supergoal retry/fix protocol; do not falsely mark the container smoke test passed. Do not deploy to `192.168.0.168` in this run.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
