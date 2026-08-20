# Phase 6 focused fix — typed mock lint

## Scope

Fix only the `TorrServerAdapter.add` test mock typing so ESLint sees no unused parameters while Vitest retains the real call tuple. Do not touch production behavior or unrelated files.

## Success gate

- `npm run lint` exits 0 with zero warnings.
- Original phase build, typecheck, and 68 tests remain green.
