# Phase 3 focused fix — deterministic overflow contract

## Scope

Fix only the deterministic document-overflow assertion. Verify the shipped stylesheet contract directly in the component suite because jsdom does not apply Vite CSS imports. Do not touch unrelated behavior. Verify actual `scrollWidth <= innerWidth` at 1280×720 and 1920×1080 in browser QA.

## Success gate

- Three catalog rails remain present.
- Shipped CSS declares body overflow hidden and main overflow clipped.
- Original build/typecheck/lint/test commands pass.
