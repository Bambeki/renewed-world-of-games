# Playable investor demo: lineup, league simulation and transfers

The manager dashboard previously showed a placeholder and disabled game navigation. This change makes the core loop playable: choose and save an XI, play a league matchday, review results and standings, and strengthen the squad with transfers.

Adds a per-team persistent season, authenticated game endpoints, transactional revision checks, three formations, ten-round fixtures, match reports, buy/sell validation, dashboard metrics, club settings and responsive navigation. Keeps existing registration/login, generated squads, team APIs and owned-player details. The database migration is additive.

Validation: workspace typecheck, lint and production build passed; five engine tests and one comprehensive API journey passed; headless Chromium covered the core flow and responsive pages. Local integration/browser checks used PGlite; native PostgreSQL migration and multi-connection locking still require CI/meeting-host verification. CI is configured with PostgreSQL 16 and both journey checks.

Includes a demo-account preparation script, investor walkthrough, screenshots, architecture audit and detailed verification/limitations report. Scope intentionally excludes AI, multiplayer, social features and advanced football/economy systems. No deployment is included. Keep as a draft until PostgreSQL CI and meeting-host rehearsal pass; merge requires owner approval.
