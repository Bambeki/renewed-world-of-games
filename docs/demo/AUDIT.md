# Architecture audit — 28 October 2026

Audited latest `main`, commit `eb8a67be1f34808248fac0a5211aae5c40ca71bd` (fix: generate Prisma client before CI typecheck). Work is isolated on `feature/investor-demo-mvp`.

## Existing architecture

- npm workspace monorepo: Next.js 15 / React 19 frontend, NestJS 11 API, shared TypeScript package.
- PostgreSQL with Prisma: users, teams (one owner each), players, and unused refresh-token schema. Redis is configured in Compose but not required by existing game flows.
- JWT bearer authentication; browser token stored under `rwog_token`. Registration creates a team and an 18-player squad in one transaction.
- Existing authenticated team GET/PATCH, squad GET and owned-player detail GET are retained. Player detail currency now matches the game's EUR budget.
- The dashboard was a status/placeholder page, with disabled match/league/transfer links. No match, lineup, league or transfer implementation, or test suite, was present in the audited tree.

## Implementation decisions

An additive `game_states` table stores a versioned JSON season per existing team; there is no destructive migration or change to existing account/team/player identities. First load generates a balanced 4-4-2 and six-club home/away league. Existing player `isStarter` flags stay synchronized with saved selections.

The new authenticated `/game` API resolves ownership from the JWT. PostgreSQL row locks on the owner's team serialize game initialization and mutations. Every mutation requires the last observed revision; stale requests fail with 409 and the UI refreshes state. Budget, player ownership changes, fixture scores, reports and season revisions commit atomically. No opponent user accounts or human club data are involved.

The engine is independent of Nest/Prisma and has deterministic tests using an injected random source. UI pages share a responsive manager panel and navigation; existing squad/player pages remain in place. The formation schema and API view types are shared between API and frontend.

## Scope and tradeoffs

The compact JSON season avoids prematurely introducing multiplayer schedules, transfer bidding and simulation workers. It is appropriate for this small single-manager demo; a shared persistent league would require relational fixtures, clubs, transfers and a server-controlled clock. GET `/game` initializes missing state and refreshes the club name. Do not cache this endpoint.

Authentication behavior was preserved. Production authentication hardening, token refresh, rate limits and operational monitoring are outside this demo increment. Do not present this build as a production multiplayer service.
