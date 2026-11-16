# Renewed World of Games

## Football matchday update

The football browser-quality branch now has an immersive RWG match screen, a TV broadcast camera, four graphics settings, distance-synchronized skinned locomotion, clear passing-receiver feedback, opponent passing, three challenge levels, exhibition statistics and device save/resume. Open **Matches → Play 3D match** with a saved XI. Phone landscape uses controls over the pitch; portrait remains available.

Existing authentication, squad details, manager lineups, fixtures, standings, transfers, Ludo and campaigns are preserved. Live exhibition scores remain local and do not change league standings. EA SPORTS FC's public gameplay notes are a design reference; RWG uses its own interface and CC0 character/animation sources.

See [football verification](docs/football-browser-quality/VERIFICATION.md) for actual checks and [deployment candidate](docs/production/README.md) for Docker/TLS, migrations, environment checks, backups and the remaining launch gates. A polished interface is not a claim that all commercial football features or console-quality animation are complete.

A collection of browser games built with Next.js, React, TypeScript and a NestJS/PostgreSQL football-management API.

This branch is a **playtest release candidate**, not a production or console-quality release. It preserves the football manager and Ludo, adds a focused 3D football drill, and introduces two original single-player campaigns.

The football-focused revision adds skinned humanoids, blended locomotion, closer cameras, a minimap and analogue input. See [the browser football revision](docs/football-browser-quality/README.md) for actual scope and verification.

## Playable collection

Open **All games** at `/games`.

| Game | What is included | Save location |
| --- | --- | --- |
| Founders League | Account and club, generated 18-player squad, player details, three formations, saved XI, ten-round league, simulated results, standings and fixed-price transfers | PostgreSQL, per account |
| Football laboratory | One attacker versus a goalkeeper; 3D dribbling, sprint, shielding, feint and charged shooting | Session only |
| 3D exhibition | Experimental 11 v 11 with the saved XI, keyboard/touch/gamepad inputs and three camera views | Session only; does not update the league |
| Jack & Rose: Lost Signals | Three original island-rescue missions, two characters with different abilities, puzzles, storm pressure, victory/defeat and replay | This browser, `rwog.adventure.v1` |
| Standards of Rome | Three fictional frontier battles, legionaries/archers/cavalry, movement, attacks, recruitment, enemy turns, fort defence and replay | This browser, `rwog.rome.v1` |
| Ludo | Local 2–4 player game, captures, safe squares, exact finish, winner and rematch | This browser |

Adventure and Roman tactics require no account. Football club features require registration/login. Online multiplayer, purchases, cloud campaign saves and commercial-grade football animation are not included.

## Run locally

Use Node 20+ and npm 10+, with Docker Desktop running. From an existing checkout, stop the development server with **Control+C** and wait for the terminal prompt before entering Git commands.

```bash
git fetch origin
git switch feature/football-browser-quality
npm ci
```

For a fresh checkout only, create the local environment files. Preserve existing files and database settings:

```bash
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env.local
```

Then:

```bash
npm run docker:up
npm run db:generate
npm run db:deploy
npm run dev
```

`db:deploy` applies the checked-in migrations without resetting data. `dev` also generates the Prisma client and builds the shared package. No new database migration is required for the two campaigns.

Open <http://localhost:4000/games>. API health: <http://localhost:4001/api/v1/health>. PostgreSQL uses port 5432; Redis uses 6379 and is not required by current game flows.

## Demo and verification

- [Release scope, architecture audit and limitations](docs/release/README.md)
- [Investor demonstration and controls](docs/release/DEMO.md)
- [Actual verification results](docs/release/VERIFICATION.md)
- [Requirements before a market launch](docs/release/LAUNCH_GATES.md)
- [Original football manager audit](docs/demo/AUDIT.md)
- [3D football details](docs/football-3d/README.md)
- [Ludo rules](docs/ludo/README.md)

Prepare a demo account against your running **local/test API**. Set your own password (at least eight characters):

```bash
DEMO_PASSWORD='choose-a-local-demo-password' npm run demo:prepare
```

Default email: `investor@rwog.example`. The script uses real registration/login, names the club Renewed United and initializes its season. It preserves existing season progress and never resets an account. Keep its password outside Git. Use a different `DEMO_EMAIL` and `DEMO_USERNAME` if an existing account has another password.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

With a migrated **test database**, both apps running and Chromium installed:

```bash
npx playwright install chromium
npm run test:integration
npm run test:browser
npm run test:ludo:browser
npm run test:arcade:browser
npm run test:3d:browser
npm run test:football-quality:browser
npm run test:campaigns:browser
```

Integration/browser journeys create isolated accounts and mutate their test seasons. CI runs these against PostgreSQL 16. Campaign completion tests use legal controls through all six missions/battles, rather than injecting victory states.

## Architecture

| Path | Responsibility |
| --- | --- |
| `frontend/` | Next.js pages, game interfaces, Three.js rendering and pure local game engines |
| `backend/` | NestJS auth, ownership-scoped teams/players, transactional league/transfer API and Prisma migrations |
| `shared/` | Football API types, formations and Ludo engine |
| `tests/` | Real browser journeys and campaign action planners |
| `docker/` | Local PostgreSQL 16 and Redis 7 |
| `docs/` | Architecture, game rules, demo instructions and verification evidence |

Football management state is server owned. The 3D exhibition, training drill, Ludo and new campaigns are separate local games; none writes a football league result. New campaign code is isolated from existing authentication and database models.

## Product direction

The goal is a connected collection of accessible games. The immediate milestone is an understandable, reliable playtest collection. Real-player feedback, mobile/device performance, content depth, authentication hardening, dependency remediation and production operations remain necessary before a market launch. See [launch gates](docs/release/LAUNCH_GATES.md) for concrete acceptance criteria.
