# Phase 8 focused fix — runtime workspace artifacts

## Failure

The image builds, but the container restarts with `ERR_MODULE_NOT_FOUND: @kinohub/contracts`. `npm prune --omit=dev` correctly preserves npm workspace links while the runtime stage copied only the server package.

## Scoped correction

- Copy the compiled `packages/contracts` package manifest and `dist` into the runtime image.
- Bundle `@kinohub/contracts` into the production server entry because its development export intentionally targets TypeScript source; runtime must not copy `src`.
- Copy the web package manifest so the pruned root workspace dependency graph remains inspectable; do not copy web source.
- Rebuild, require healthy status, rerun the full smoke route, inspect UID/image/runtime files and production dependencies, then stop cleanly.

## Verification

`docker compose up -d --build`, `docker compose ps`, `npm run smoke:docker`, runtime inspection, `docker compose down`.
