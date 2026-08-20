# Phase 9 focused fix — lint and primary contrast

## Failures

- The typed search fetch mock requires an argument for call inspection, but ESLint sees it as unused.
- Axe measures white primary-button copy at 4.4:1 against `#4e6fe8`, just below WCAG AA 4.5:1.

## Scoped correction

- Explicitly consume the typed mock argument; do not loosen lint configuration.
- Darken only the primary background while preserving the design hierarchy.
- Re-run lint, typecheck, Axe and every E2E journey. Do not touch unrelated files.

## Success gate

Original phase 9 VERIFY: all mandatory commands and all nine acceptance criteria pass.
