SUPERGOAL_PHASE_START
Phase: 4 of 9 — Add request workflow
Task: Request a compatible saved copy through Seerr and surface its lifecycle.
Type: greenfield, ui, integration
Mandatory commands: npm run build, npm run typecheck, npm run lint, npm test
Acceptance criteria: 6
Evidence required: redacted request transcripts, workflow tests, success and error screenshots
Depends on phases: 2, 3

## Why

The first primary action must be reliable, idempotent, and honest about the upstream quality profile it actually selected.

## Work

- Add a backend request command that maps a normalized movie to Seerr's request API and configured default non-4K Radarr profile.
- Add idempotency/debounce protection for repeated remote clicks and normalize existing/pending/processing/available/failed states.
- Build the `Скачать 1080p` confirmation sheet with policy summary and request feedback.
- Poll request/media status with backoff while the detail screen remains active.
- Provide a safe Jellyfin LAN link for already available media when configured.

## Acceptance criteria (all must pass — verify each in transcript)

- One confirmed activation generates exactly one upstream request containing the intended movie/media type and configured non-4K server/profile selection.
- Repeated Enter/click events while the mutation is pending cannot create a second upstream request.
- Existing, pending, processing, available, failed, timeout, and permission-denied responses map to distinct stable API/UI states in Russian.
- Confirmation displays `1080p SDR · H.264 предпочтительно` and does not claim a guarantee when Seerr/Radarr does not confirm the profile.
- Fixture integration tests cover success, duplicate/existing, timeout, rejection, and malformed upstream response.
- The available-state Jellyfin link contains no API key/token and is hidden when no safe base URL is configured.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Evidence required in transcript

- Redacted success and duplicate request/response excerpts.
- Workflow test names and totals.
- Screenshots for confirmation, queued success, available, and failure.
- Assertion showing rapid repeated activation yields one adapter call.

## Notes

Mutations are same-origin only. Use schema validation and do not accept a user-supplied Seerr/Radarr base URL or API key.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
