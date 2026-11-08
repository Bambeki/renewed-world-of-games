# Multi-game playtest release candidate

Status: reviewable candidate for local/invited playtesting. It is not approved for production publishing or merging into main.

## Audit and branch lineage

The latest audited `main` is `eb8a67be1f34808248fac0a5211aae5c40ca71bd`. It contains the earlier account/team/player foundation. Existing feature work is stacked on separate draft branches: investor manager → Ludo/local arcade → 3D football. This increment starts from `feature/football-3d` commit `4220de7c808e4b98086bb44b3639978be6faaecc` and lives on `feature/release-candidate`.

The base is an npm workspace monorepo: Next.js 15/React 19/Three.js frontend, NestJS 11 API, Prisma 6, PostgreSQL 16 and a shared TypeScript package. Redis is provisioned but unused in these flows. Existing JWT auth, team ownership, squad generation, player details, revision checks and serialized transactional league/transfer updates are retained. No database model or migration is changed by this increment.

## Changes

- `/games` provides a responsive catalog with explicit game status and links from the landing page and dashboard.
- `/training` adds a finishing drill: one visible attacker and one goalkeeper. Hidden players cannot move, intercept, collide or receive a pass. Passing explains that teammates are available in the full exhibition. Existing 11 v 11 remains available.
- The 3D pitch has a direct kick-off/resume button and explains pauses caused by window focus loss or a hidden tab. Canvas clicks focus keyboard controls. Automatic pausing prevents unseen match time from advancing.
- `/games/adventure` provides **Jack & Rose: Lost Signals**, an original two-explorer island story. Three missions combine strength/engineering abilities, rubble, a key/locked door, bridge controls, a rescue and a shared exit. Successful actions consume storm shelter over time. Each mission can be completed, lost, retried, resumed and replayed.
- `/games/rome` provides **Standards of Rome**, three fictional turn-based battles. Units have distinct movement, attack range, health and recruitment costs. Blocked terrain and occupied tiles constrain movement. Computer opponents advance/attack the line or fort. Gold, reinforcements, turn limit, victory and defeat produce a complete short campaign.
- Both new campaigns validate browser saves, recover from corrupted data and display storage failure notices. Restart requires confirmation; completed campaigns can be replayed. Saves are local to the browser and separate from football accounts.
- Dependency patches reduce the original critical audit findings. See verification for the remaining findings; no unverified security clearance is claimed.
- Development startup generates the Prisma client automatically. CI includes all existing journeys and the two new campaigns.

## Implementation boundaries

Pure campaign engines are in `frontend/src/lib/campaigns`. React pages render SVG maps and call engine actions; the engine has no DOM or database dependency. Legal action planners drive both unit and browser completion tests. Campaign saves use a shared hook and separate versioned keys. Assets are drawn in code; no commercial game artwork, characters or film assets were copied.

The adventure is one person switching between two explorers, not network co-op. Roman tactics is a small original ruleset, not a historical simulator or large-scale war game. The football renderer uses procedural figures and animation; it is not equivalent to a commercial console football title. The training drill makes existing ball control easier to learn and assess without changing the manager economy.

## Known limitations

- Campaigns contain three short missions/battles each, fixed maps and deterministic rules. No inventory campaign, story cinematics, voiced dialogue, campaign difficulty options or cloud synchronization.
- Adventure currently uses tile movement and simple figures. Roman enemy turns resolve immediately, with limited animation and no enemy-action replay.
- Football has simplified physics, animation, tactical behaviour and game rules. No offside/referee system, licensed content or online authoritative match server.
- Local saves are editable by the browser user. They are unsuitable for competitive rankings, paid progression or a shared economy.
- Physical Safari/iPhone/Android/controller testing, accessibility audit, performance profiling and user enjoyment/retention have not been established by automated Chromium tests.
- Production account hardening, deployment/monitoring/backup verification and remaining dependency findings are launch gates.

See [verification](VERIFICATION.md), [demo](DEMO.md) and [launch gates](LAUNCH_GATES.md).
