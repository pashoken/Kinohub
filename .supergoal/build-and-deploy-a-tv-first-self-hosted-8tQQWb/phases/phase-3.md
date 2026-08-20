SUPERGOAL_PHASE_START
Phase: 3 of 9 — Deliver catalog experience
Task: Build the Russian TV-first catalog, search, and movie-detail surfaces.
Type: greenfield, ui
Mandatory commands: npm run build, npm run typecheck, npm run lint, npm test
Acceptance criteria: 6
Evidence required: component tests, TV-size screenshots, client asset secret scan
Depends on phases: 1, 2

## Why

The catalog is the product's primary surface and should be complete before download and streaming mutations are layered onto it.

## Work

- Create dark cinematic design tokens, app shell, top navigation, hero area, horizontal rails, poster cards, and details layout.
- Consume normalized Seerr-backed endpoints for trending, popular, recommendation/similar, search, and movie detail.
- Add debounced/cancellable search and routing that preserves focus origin.
- Implement skeleton, empty, retry, partial-image, and service-unavailable states with Russian copy.
- Add responsive image URLs/sizes, lazy loading, and bounded concurrent artwork behavior.

## Acceptance criteria (all must pass — verify each in transcript)

- Home renders at least three named rails from normalized fixture data without document-level horizontal overflow at 1280×720 and 1920×1080.
- Search waits for the configured debounce, aborts stale requests, handles Cyrillic input, and displays a tested no-results state.
- Movie detail displays available title, year, runtime, rating, overview, genres, backdrop, poster, and media/request status.
- Loading, empty, upstream-unavailable, retry, missing-poster, and missing-backdrop states each have an automated component test.
- Poster/backdrop images are lazy/responsive and a built-asset scan finds no service secret or API key.
- Every visible string introduced in this phase is Russian and no Lorem/debug placeholder is rendered.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Evidence required in transcript

- Component test summary naming the state cases.
- Screenshots at 1280×720 and 1920×1080 for home, search, and detail.
- Bundle/asset secret scan result.
- DOM overflow measurement for both target resolutions.

## Notes

Avoid autoplay trailers and large animation libraries. The projector has 1 GB RAM; prefer CSS and progressive images.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
