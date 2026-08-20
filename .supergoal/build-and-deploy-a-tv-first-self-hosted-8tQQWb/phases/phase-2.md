SUPERGOAL_PHASE_START
Phase: 2 of 9 — Build integration gateway
Task: Implement typed, resilient server-side adapters for the home media services.
Type: greenfield, integration
Mandatory commands: npm run build, npm run typecheck, npm run lint, npm test
Acceptance criteria: 6
Evidence required: adapter tests, redacted health response, timeout and invalid-body evidence
Depends on phases: 1

## Why

Credentials and upstream API volatility need one testable backend boundary before UI behavior depends on them.

## Work

- Implement adapter interfaces and HTTP clients under `apps/server/src/integrations/` for Seerr, Jackett, TorrServer, and Jellyfin link/status support.
- Use Seerr `X-Api-Key` server-side and normalize discover, search, detail, request, and status payloads.
- Build Torznab query construction/XML parsing from current Jackett documentation and fixtures.
- Isolate TorrServer add/list/file/playlist operations behind a typed interface whose real request shapes are backed by fixtures and integration probes.
- Add AbortController timeouts, response-size limits, bounded retries for safe reads only, and normalized error codes.
- Add `/api/health/integrations` with redacted reachability/configuration details and mock/unconfigured/live modes.

## Acceptance criteria (all must pass — verify each in transcript)

- Seerr requests send `X-Api-Key` only from the backend and normalize fixture responses for discovery, search, detail, request, and status.
- Jackett search constructs the documented Torznab route/query and parses title, link token, size, seeders, peers, indexer, date, categories, and attributes from fixtures.
- TorrServer health, add, inspect/list, and playlist/stream methods exist behind a typed adapter and pass representative fixture tests.
- Network failures, timeout, non-2xx, oversized body, and invalid JSON/XML each map to a documented stable error code.
- `/api/health/integrations` output contains service status and safe remediation text but no keys, credentials, magnets, raw environment values, or authorization headers.
- Mock, unconfigured, and live adapter selection paths have unit coverage and cannot silently fall through to live calls.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Evidence required in transcript

- Adapter/contract test totals and key fixture names.
- Redacted health endpoint JSON.
- Timeout and invalid-body test excerpts showing stable error codes.
- Secret scan of server responses and client build inputs.

## Notes

Current primary docs: Seerr supports `X-Api-Key`; Jackett supports Torznab; TorrServer exposes API/Swagger. Keep raw upstream shapes out of React code.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
