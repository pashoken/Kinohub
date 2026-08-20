# Audit round 1 fix — Phase 8 diagnostics and full-lab health graph

## Gaps

1. Radarr is named by the original setup-diagnostics criterion but is absent from the diagnostic service model.
2. The optional full profile has persistent resources but does not declare healthchecks/order for each upstream tier.

## Scoped work

- Add Radarr to the redacted diagnostic model and example variables; retain the same no-secret response contract.
- Add healthchecks to Seerr, Radarr, Sonarr, Jackett, TorrServer, and Jellyfin; promote relevant `depends_on` conditions to `service_healthy`.
- Add focused assertions and validate the profile-expanded Compose model. Do not start the optional heavy profile or touch unrelated product behavior.

## Success gate

Phase 8 original diagnostics and full-lab acceptance criteria pass; aggregated engineering gate remains green.
