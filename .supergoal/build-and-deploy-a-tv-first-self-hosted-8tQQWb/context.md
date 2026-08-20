# Environment context (greenfield)

- Workspace: empty Git repository with no commits; only `.supergoal/` exists.
- Host: Windows 10, PowerShell, Git Bash available.
- Runtime: Node.js `v24.12.0`, npm `11.6.2`, Corepack `0.34.5`.
- Docker CLI: `28.5.1`; Docker daemon is currently stopped/unavailable.
- Existing local ports checked: no listeners found on 3000, 5055, 5173, 8090, or 9117.
- Baseline commands: no project build/test/lint scripts exist until scaffolding.
- Deployment target for this run: local Docker only; home server deployment is explicitly deferred.

## Chosen implementation direction

- Lightweight TypeScript application with a React/Vite TV-first PWA and a Fastify backend.
- npm workspaces, one production container serving the built UI and API.
- Server-side adapters for Seerr, Jackett Torznab, TorrServer, and optional Radarr/Jellyfin status links.
- Secrets remain server-side in environment variables; browser receives only sanitized data.
- Mock integration mode and contract fixtures allow deterministic local development before real service credentials are supplied.
