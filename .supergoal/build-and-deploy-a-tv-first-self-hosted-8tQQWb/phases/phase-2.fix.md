# Phase 2 focused fix — Jellyfin deep link

## Scope

Fix only `safeJellyfinLink`: construct `/web/index.html` and the `#!/details?id=...` fragment separately so the browser receives a valid Jellyfin SPA deep link. Preserve rejection of credentials, query-bearing base URLs, and non-HTTP(S) schemes. Do not touch unrelated files.

## Success gate

- The valid link has pathname `/web/index.html` and hash containing `id=item-1`.
- Credential-bearing base URLs return `null`.
- Re-run the original phase mandatory commands and acceptance verification.
