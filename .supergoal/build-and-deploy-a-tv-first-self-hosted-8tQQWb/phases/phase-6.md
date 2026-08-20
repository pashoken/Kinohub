SUPERGOAL_PHASE_START
Phase: 6 of 9 — Launch instant playback
Task: Safely hand a confirmed torrent choice to TorrServer and launch its playable file.
Type: greenfield, ui, integration
Mandatory commands: npm run build, npm run typecheck, npm run lint, npm test
Acceptance criteria: 6
Evidence required: sanitized handoff transcript, mock E2E tests, playback screenshots
Depends on phases: 2, 5

## Why

This phase completes the defining golden path while containing raw torrent URLs entirely on the trusted backend.

## Work

- Resolve opaque release IDs server-side, validate TTL/session ownership, and submit sanitized metadata to the TorrServer adapter.
- Add safe scheme/origin policy and one-shot/retry-safe handoff semantics.
- Inspect torrent files, filter playable video entries, suppress samples, and naturally sort episodes/files.
- Create an expiring playback session with server-derived stream/playlist links only.
- Build waiting, buffering, file-choice, ready, launch, copy-link, retry, cancel, and diagnostics UI states.
- Prefer a standard URL launch that Android can hand to VLC; keep in-browser playback a progressive enhancement.

## Acceptance criteria (all must pass — verify each in transcript)

- A valid opaque choice resolves server-side and causes one TorrServer add operation with sanitized title/poster metadata.
- Unknown, expired, reused when disallowed, and tampered IDs return stable errors before any URL is forwarded to TorrServer.
- Multi-file torrents list supported video files in natural order and exclude samples/non-video entries by default.
- Playback URLs are constructed only from the configured TorrServer base/response and permitted `http`/`https` schemes.
- The UI exposes a normal stream link plus copy/open-external-player fallback without credentials, raw Jackett URLs, or API keys.
- Mock end-to-end tests pass for single file, multi-file selection, no playable files, add timeout, inspect timeout, and retry success.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Evidence required in transcript

- Sanitized request/adapter transcript from choice ID to playback session.
- Mock end-to-end test summary naming all six paths.
- Screenshots for waiting, file selection, ready-to-play, and failure/retry.
- URL-policy tests proving arbitrary client URLs are rejected.

## Notes

Do not enable GStreamer transcoding by default; the target server CPU cannot sustain 4K conversion. Compatibility comes from release selection and client playback.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
