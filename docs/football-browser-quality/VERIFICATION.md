# RWG Football matchday verification — 11 November 2026

## Implemented checkpoint

This increment builds on the recovered skinned-football checkpoint `909efe20db830fb810452dc3be960fd2b7e3068d`, which preserves the earlier `e918dd2` work. The original recovery workspace was retained. Main was not merged or modified.

Implemented: an immersive match screen and original RWG broadcast graphics; four cameras including a stable TV rail; automatic/performance/balanced/high graphics choices; culling and lightweight contact shadows; distance-synchronized locomotion; receiving, kick, shield and keeper-gather overlays; CPU open-lane passing and three reaction levels; pass/completion statistics; isolated club/mode/lineup-aware device checkpoints; save/reload/resume and corrupt-save recovery; phone portrait and landscape controls; existing league/club/Ludo/campaign features retained.

This is an exhibition mode. Client scores and device saves are never trusted as league results. All management changes continue to use the existing authenticated, revision-checked API.

## Local observed checks

Environment: Linux, Node 24.22.1, npm 11.9.0, Playwright 1.61.1, Chromium software rendering. A temporary PGlite wire server provided isolated test databases for browser journeys. Native PostgreSQL verification belongs to CI.

| Check | Observed outcome |
| --- | --- |
| Clean `npm ci --ignore-scripts` and Prisma generation | Pass; generated Prisma client 6.19.3 |
| Workspace typecheck and lint | Pass |
| Shared, backend and frontend production builds | Pass; 18 Next.js routes |
| Unit/engine tests | 61 passed: 17 backend/shared, 44 frontend |
| Existing 3D browser regression | Pass: movement/sprint/charged shot, action buttons, synthetic gamepad, pause/restart, cameras, widths, hidden-tab pause, graphics-context retry, training, close and unchanged league/budget |
| Skinned-football quality suite | Pass: bundled GLB, real bone-pose changes, diagonal analogue stick, minimap, paused skeleton, widths, asset failure/retry and training shot |
| Matchday browser suite | Pass: TV camera, graphics controls, difficulty, movement, device save/reload/resume, settings persistence, invalid save handling and responsive layouts |
| Real-time visual suite | Pass: ordinary RAF kickoff and keyboard movement, actual bone animation, frozen pause, all four cameras, desktop/tablet/phone portrait/landscape screenshots and close |
| Manager browser journey | Pass: account, login, squad/details, lineup save/reload, fixtures/report, standings, buy/sell, club edit, logout; 8 routes × 3 widths |
| Ludo browser | Pass |
| 2D football browser | Pass including full time, pause/restart and unchanged league |
| Adventure/Roman campaigns browser | Pass: all missions/battles completed through ordinary controls, saves, restart/replay, keyboard and emulated touch |
| `git diff --check` | Pass |

The new tests check CPU passing/blocked lanes, difficulty reaction windows, deterministic state continuation after a checkpoint, malformed payload rejection, settings recovery, production environment validation, configured JWT lifetime, bounded auth limits and compatibility with legacy bcrypt passwords. New registrations reject passwords above bcrypt's 72-byte limit; existing long passwords retain the old login behavior, with bounded request input.

Local browser debugging exposed stale HUD writes rewinding the 2D clock; its simulation ref now remains authoritative. Test clocks are installed before match RAFs. Screenshot evidence now has a separate ordinary-real-time browser path. Chromium uses its normal process model: the serverless single-process graphics flags caused local screenshot/teardown stalls and are no longer injected. Assertions were retained, including animation, full time, graphics recovery and unchanged management data.

## CI and dependency evidence

See the exact commit's run under [branch Actions](https://github.com/Bambeki/renewed-world-of-games/actions?query=branch%3Afeature%2Ffootball-browser-quality). CI includes native PostgreSQL 16 migrations and both integration tests, all browser suites, production container builds, migration-container execution, API/web/asset container health checks, and a fresh runtime dependency audit. The `release-browser-screenshots` artifact also retains the audit JSON.

The fresh lockfile selects Multer 2.5.0, PostCSS 8.5.32 and deepmerge-ts 8.0.2 through targeted transitive overrides. These replace the versions implicated in the previous runtime findings. Prisma generation, builds and tests were rerun after a clean install. The Prisma deepmerge override crosses a major library version, so its CLI/migration compatibility remains an explicit regression check.

The local registry rejected a fresh audit request with HTTP 403. This document does not claim a clean audit from that denied request. The CI audit output is authoritative for the exact new lockfile. Likewise, PGlite's wire adapter could not complete the second concurrent-client integration scenario; native PostgreSQL CI remains required. No game/business logic was weakened to accommodate the adapter.

## Visual and operational limits

The character and locomotion asset provenance/licenses remain bundled with the app. Animation is general locomotion plus procedural football poses, without a football motion-capture library or foot-plant IK. The CPU is rule based. Full offside/foul/substitution rules, online authoritative matches, licensed teams and commercial content breadth are not implemented.

Automated touch and gamepad checks are emulations. Actual iPhone/Safari, Android, Mac GPU and physical-controller behavior, frame-time budgets and player enjoyment still need target-device testing. Test durations and screenshots do not establish a measured FPS or console-quality experience. No public deployment, backup restore exercise, payments or market-readiness certification was performed. The production Docker/TLS package is a staging candidate; use its CI container results and the deployment guide before selecting hosting.
