# RWG Football deployment candidate

The football branch contains an original RWG interface informed by televised football and EA SPORTS FC's public gameplay notes. It does not include EA assets, licensed teams or a claim of equivalent gameplay fidelity. Authentication, club management, transfers, Ludo and the other games remain available.

## Local verification

Use Node 24 and the checked-in lockfile. From the repository root:

```bash
npm ci
npm run db:generate
npm run build -w shared
npm run typecheck
npm run lint
npm test
npm run build
npm run docker:up
npm run db:deploy
npm run dev
```

Open `/matches`, sign in, and select **Play 3D match**. The match has keyboard, pointer/touch and standard-mapped gamepad controls. The TV broadcast camera retains nearby passing options. Performance/Automatic modes disable expensive shadow maps. High enables shadows. The CPU can pass through open lanes, carry the ball and shoot. Difficulty changes its challenge/decision timing.

The match saves locally under the club ID and mode, with a lineup signature. Reload, reopen the same mode and choose **Resume saved match**. Invalid or incompatible saves cannot enter the simulation. Starting a fresh exhibition replaces the checkpoint after play starts. The saved exhibition is local only; it never changes league scores, money or player ownership. Clearing browser storage removes it.

With a migrated **test** PostgreSQL database and running API/web, run all browser checks:

```bash
npm run test:integration
npm run test:browser
npm run test:ludo:browser
npm run test:arcade:browser
npm run test:3d:browser
npm run test:football-quality:browser
npm run test:football-production:browser
npm run test:football-visual:browser
npm run test:campaigns:browser
```

These create isolated test accounts; do not run them against a customer database. The separate visual suite uses ordinary real time and captures screenshots when `FOOTBALL_VISUAL_SCREENSHOTS` points to an output folder. Functional suites install the test clock before the renderer mounts and advance gameplay through timed control steps. The visual suite does not share that mocked clock.

## Staging package

`Dockerfile` separates the build/migration target from a non-root runtime. The runtime installs production dependencies; the migration service retains the Prisma CLI. `docker/compose.production.yml` provides PostgreSQL, one-shot migrations, API, web and a Caddy TLS proxy. CI also runs registration, login, club/match loading and asset requests through HTTPS and the production image, using Caddy's local CA for its disposable localhost endpoint. Database/API ports are private to the compose network. Only the proxy exposes ports.

1. Put the DNS name on a prepared staging host. Obtain a host, a domain, backups and monitoring under the project owner's account.
2. Copy `docker/production.env.example` to an untracked file on that host and generate two distinct secrets. Use hexadecimal for the database password so its URL encoding is unambiguous. Do not use example values.
3. Review the image tags and pin digests for the release you deploy.
4. On the host, from the project root:

```bash
docker compose --env-file /secure/path/rwg-production.env -f docker/compose.production.yml config --quiet
docker compose --env-file /secure/path/rwg-production.env -f docker/compose.production.yml up --build -d
```

Production startup rejects missing/short JWT secrets, missing database URLs, invalid access lifetimes and non-HTTPS origins. The proxy permits TLS termination and same-origin `/api/v1` routing. `TRUST_PROXY=1` is appropriate only with exactly that trusted proxy and no direct public API port. Login/registration have bounded per-process rate limits; multiple API instances require an additional shared limiter at the edge. No multi-instance deployment is certified here.

## Backup and restore rehearsal

Create and verify a backup before upgrades. Never print secrets into terminal logs. For the compose database:

```bash
docker compose --env-file /secure/path/rwg-production.env -f docker/compose.production.yml exec -T postgres pg_dump -U rwg -d rwg -Fc > rwg-backup.dump
```

Restore into a **separate disposable database/host**, verify accounts, squad, lineup, fixtures and balances there, then record the recovery time and backup location. Do not restore over the live database as a test. Roll back the web/API to the previous verified image while retaining a compatible database schema; review migration compatibility before any release. No restore rehearsal or public deployment was performed during implementation.

## Release evidence and outstanding gates

The checked-in football verification file records actual tests. CI uses native PostgreSQL and includes management, Ludo, arcade, both football suites, match recovery and campaigns. Run `npm audit --omit=dev` for the current lockfile; patched transitive overrides are deliberate and must be revalidated on dependency upgrades.

Before calling this a commercial release, verify the Docker build on the chosen host, backup restoration, monitoring/alerts, actual Safari/iPhone/Android controls and frame times, physical gamepads, accessibility and playtests with the intended audience. Product policy, account recovery/deletion and support need an owner. Football still uses general locomotion clips and procedural action overlays; offside, fouls, substitutions, online server-authoritative play, licensed clubs and a full motion-capture animation library are not implemented. These are concrete remaining work, not features implied by the interface.
