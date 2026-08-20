---
name: project_kinohub_tv
description: Durable architecture and verification notes for the KinoHub TV-first self-hosted application.
metadata:
  type: project
---

# KinoHub TV project memory

- The runnable repository is an npm workspace: React/Vite web, Fastify API, and shared Zod contracts.
- Default Docker mode is a credential-free deterministic mock bound to loopback. The complete media stack is explicitly opt-in through the `full` Compose profile.
- Never expose raw magnet links, integration credentials, or API keys to the browser. Torrent selections are server-side bounded TTL records addressed by opaque one-shot UUIDs.
- Production server bundles the contracts workspace; runtime images copy only compiled app/workspace artifacts, prune dev dependencies, and run as numeric UID/GID 10001.
- TV navigation uses geometric arrow movement plus modal focus trap/restore. Keep the remote-only Playwright journeys and Axe checks green when modifying layout.
- Search requests are capped at 120 Unicode characters on client and server and guarded by a monotonic sequence so stale transports cannot overwrite newer results.
- The release gate is the union of build/typecheck/lint/unit/E2E, gzip budget, secret scan, both Compose configs, healthy Docker smoke, and final two-resolution screenshot matrix.
