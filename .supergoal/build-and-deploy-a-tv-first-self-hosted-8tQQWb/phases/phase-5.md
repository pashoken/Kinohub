SUPERGOAL_PHASE_START
Phase: 5 of 9 — Rank torrent choices
Task: Search Jackett and rank projector-compatible torrent choices without exposing raw links.
Type: greenfield, ui, integration
Mandatory commands: npm run build, npm run typecheck, npm run lint, npm test
Acceptance criteria: 6
Evidence required: ranking table, opaque API response, choice UI screenshot, parser tests
Depends on phases: 2, 3

## Why

Instant viewing must avoid accidental 4K/HDR/remux choices while leaving language and edition selection visible to the user.

## Work

- Implement normalized release parsing for resolution, codec, dynamic range, source, edition, audio, language hints, size, and seed count.
- Create a deterministic compatibility policy with hard rejects and scored preferences matching the TD85W target.
- Store raw Jackett results server-side in a bounded TTL cache and expose only opaque choice IDs plus display metadata.
- Build a remote-friendly choice drawer with compatibility chips, score explanation, loading, empty, partial, timeout, and retry states.
- Document ranking rules in `docs/compatibility-policy.md`.

## Acceptance criteria (all must pass — verify each in transcript)

- Search uses normalized title/year/identifiers and the browser request/response contains no Jackett key, magnet, or download URL.
- 1080p, SDR, H.264/x264, healthy seeds, and bounded size receive deterministic positive ranking according to documented weights.
- 2160p, HDR, Dolby Vision, CAM/TS, remux, and explicitly incompatible 10-bit variants are hard-rejected or visibly marked incompatible exactly as documented.
- Each client-visible choice has an opaque ID, release name, source, parsed flags, size, seeders, score rationale, and compatibility status.
- Raw result cache entries expire, are size/count bounded, and cannot be enumerated through sequential client IDs.
- Tests cover Cyrillic titles, alternate editions, conflicting tokens, missing size/seeds, malformed XML, ties, and all hard-reject rules.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Evidence required in transcript

- Fixture ranking table including accepted, warned, and rejected rows.
- Sanitized `/api/torrents/search` response proving opaque IDs.
- Choice drawer screenshot at 1280×720.
- Parser/scorer test totals and named edge cases.

## Notes

Do not bundle or document specific tracker accounts. The app consumes whatever authorized indexers the user configured in Jackett.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
