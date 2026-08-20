SUPERGOAL_PHASE_START
Phase: 7 of 9 — Tune projector controls
Task: Make every golden path usable by TD85W remote and installable as a lightweight PWA.
Type: greenfield, ui
Mandatory commands: npm run build, npm run typecheck, npm run lint, npm test, npm run test:e2e
Acceptance criteria: 6
Evidence required: keyboard E2E output, focus screenshots, PWA verification, bundle report
Depends on phases: 3, 4, 5, 6

## Why

A mouse-friendly web app is not sufficient on a projector; focus movement, back behavior, and resource use are product requirements.

## Work

- Implement a documented spatial-navigation/focus model for rails, navigation, dialogs, search, choices, and player actions.
- Handle Arrow keys, Enter, Escape/Back-compatible key events, focus trapping, restoration, and scroll-into-view.
- Add large target sizing, overscan-safe spacing, visible focus rings, reduced motion, and long-text truncation/expansion.
- Add manifest, icons, service worker for static shell only, offline/unreachable state, and cache versioning.
- Create Playwright journeys for browse, search, request, torrent selection, playback launch, cancel/back, and failures.
- Add compressed bundle and responsive artwork budgets.

## Acceptance criteria (all must pass — verify each in transcript)

- Arrow keys move deterministically within/across rails and actions; Enter activates; Escape/Back closes the top surface or returns to the prior screen.
- Focus is always visibly rendered, trapped in dialogs, and restored to the originating card after close or route return.
- Playwright completes browse-to-request and browse-to-watch golden paths using keyboard input only.
- The manifest passes installability checks and the service worker caches only versioned static shell assets, never API/catalog/secret-bearing responses.
- Initial compressed JavaScript is below 350 KB and responsive mock artwork uses declared target sizes.
- Reduced-motion preference removes non-essential transitions while preserving focus visibility and state changes.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run test:e2e`

## Evidence required in transcript

- Keyboard-only Playwright summary and journey names.
- Screenshots showing focus on home, detail actions, torrent choice, and player launch.
- Manifest/service-worker inspection output.
- Compressed bundle-size and artwork-request report.

## Notes

Consult the `browser:control-in-app-browser` skill for visual QA if the local preview can be opened. Avoid unsupported CSS spatial-navigation assumptions; application logic owns focus.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
