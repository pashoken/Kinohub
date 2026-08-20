SUPERGOAL_PHASE_START
Phase: 9 of 9 — Polish & Harden
Task: Audit and harden KinoHub across TV UX, security, accessibility, performance, Docker, and documentation.
Type: greenfield, ui, integration
Mandatory commands: npm run build, npm run typecheck, npm run lint, npm test, npm run test:e2e, npm run check:bundle, npm run check:secrets, docker compose config, docker compose -f compose.full.yaml config, docker compose up -d --build, npm run smoke:docker, docker compose down
Acceptance criteria: 9
Evidence required: hardening report, final screenshots, accessibility/bundle/security reports, diff stat, full test summary
Depends on phases: 1, 2, 3, 4, 5, 6, 7, 8

## Why

Catch cross-phase gaps and prove the final local product meets the original functional, engineering, visual, and security bar.

## Work

- Perform UX/copy, state, edge-input, security, accessibility, performance, diff, Docker, and regression passes.
- Verify every visible state and golden path at both target TV resolutions.
- Add/fix tests for any gap discovered and regenerate stable reports/screenshots.
- Review the production bundle/container for secrets, excessive assets, debug code, and unsafe runtime settings.
- Finalize setup, troubleshooting, limitations, and later-server-migration documentation.

## Acceptance criteria (all must pass — verify each in transcript)

- Every visible string is intentional Russian copy; no placeholder, debug, or development-only UI remains.
- Loading, empty, upstream-error, timeout, unauthorized, expired-result, no-playable-file, retry, and offline states are verified by test or screenshot evidence.
- Empty, long, Cyrillic, and special-character searches plus slow/stale response ordering pass automated tests.
- Origin enforcement, input schemas, opaque IDs, URL policies, API redaction, secret scan, and non-root container checks report no unresolved high-severity finding.
- Keyboard navigation, focus order/trap/restoration, labels, landmarks, target sizes, reduced motion, and contrast meet the recorded automated/manual checks.
- Production client JavaScript remains below 350 KB compressed and no unbounded catalog/artwork request pattern is observed in the tested journeys.
- Final 1280×720 and 1920×1080 screenshots cover home, search, detail, request success, torrent choice, playback, setup diagnostics, and error state.
- All mandatory build, typecheck, lint, unit, E2E, bundle, secret, Compose, and Docker smoke commands exit 0 with no new warning.
- Final complete-working-tree scan finds zero stray debug prints, session TODO/FIXME/XXX markers, dead imports, secrets, or unrelated files.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:e2e`
- `npm run check:bundle`
- `npm run check:secrets`
- `docker compose config`
- `docker compose -f compose.full.yaml config`
- `docker compose up -d --build`
- `npm run smoke:docker`
- `docker compose down`

## Evidence required in transcript

- One concise paragraph for each hardening pass: UX/copy, states/edges, security, accessibility, performance, Docker, diff, regression.
- Final screenshot paths and dimensions.
- Accessibility, bundle, and secret-scan summaries.
- Final `git diff --stat` and full command/test summary.

## Notes

Always write the final project memory required by the Supergoal protocol. The final audit must re-read ROADMAP and re-run the aggregated commands before `SUPERGOAL_RUN_COMPLETE`.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
