SUPERGOAL_PHASE_START
Phase: 1 of 9 — Scaffold runnable foundation
Task: Create a buildable KinoHub TV workspace with a mock end-to-end vertical slice.
Type: greenfield, ui, integration
Mandatory commands: npm install, npm run build, npm run typecheck, npm run lint, npm test
Acceptance criteria: 5
Evidence required: command summaries, file listing, mock API response, UI DOM or screenshot evidence
Depends on phases: none

## Why

Establish a deterministic vertical slice and engineering safety net before adding volatile external integrations.

## Work

- Create npm workspaces for `apps/web`, `apps/server`, and `packages/contracts` with strict TypeScript.
- Configure React/Vite, Fastify, Vitest, ESLint, formatting, root scripts, `.gitignore`, `.dockerignore` seed, and `.env.example`.
- Define initial normalized movie/catalog/health contracts shared by server and client.
- Add fixture-backed mock mode and render a first Russian movie rail with one detail route.
- Document native start commands and configuration precedence in `README.md`.

## Acceptance criteria (all must pass — verify each in transcript)

- `npm install` exits 0 and creates `package-lock.json`.
- `npm run build`, `npm run typecheck`, `npm run lint`, and `npm test` each exit 0.
- A native smoke request returns a fixture catalog and the web test renders at least one movie card from it.
- Invalid required environment values produce a typed startup error that names the invalid variable without revealing its value.
- A repository scan finds no real API key, tracker credential, magnet link, or copied media-source configuration.

## Mandatory commands (run each, surface last ~10 lines + exit code)

- `npm install`
- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `npm test`

## Evidence required in transcript

- Dependency install and four engineering-check summaries with exit codes.
- `rg --files` excerpt showing the workspace layout.
- Mock API response excerpt with one normalized movie.
- UI component assertion or screenshot showing Russian shell copy and a movie card.

## Notes

Keep production dependencies small. Do not add a database in v1; use upstream state and bounded in-memory caches. No secrets in fixtures.

---

The agent will print SUPERGOAL_PHASE_VERIFY, MEMORY_SAVED, and SUPERGOAL_PHASE_DONE after verification.
