# Ludo verification — 1 November 2026

Base: investor-demo branch commit `d135bd738e075bb5d72d3fb6895d70c2e8267811`. Work is isolated on `feature/ludo-local`; the football branch and main are not overwritten.

## Local results

- Workspace typecheck and lint passed.
- Shared/backend/frontend production builds passed.
- `npm test`: 13 tests passed, zero failures (five existing football engine tests; eight Ludo tests). Seeded two-, three- and four-player engine games reached a valid winner within the move limit.
- The existing football API integration journey passed using the real Nest API and a temporary PGlite database; the existing football Chromium journey also passed across eight routes and three viewport widths.
- Ludo Chromium journey passed: player setup for every count, dice and valid-move controls, board-token clicks, captures, reload with a pending move, exact finishing, winner persistence, rematch, reset confirmation, malformed saves and responsive board layouts at 1440, 768 and 390 px. There were no page exceptions or HTTP 5xx responses.
- Desktop and phone screenshots were visually inspected; both are included in `screenshots/`.
- `git diff --check` passed.

The Ludo browser test uses prepared valid saves for capture and winning scenarios, rather than clicking through every move of a full game. Full games are exercised in engine tests. Browser dice are deterministic only inside the Playwright harness; production dice use browser crypto randomness.

Local runtime: Node 24.22.1, npm 11.9.0, Next.js 15.5.18, Prisma 6.19.3, Playwright 1.58.2 with a temporary Chromium executable. The local football database was PGlite, not native PostgreSQL. CI is configured to repeat all checks and both browser journeys on Ubuntu 24.04 with PostgreSQL 16; its live results are linked from the pull request.

## Product limits

This is pass-and-play on one device, with one saved game per browser profile. It has no online opponents, synchronized tabs/devices, account-backed saves, bots, chat or purchases. Clearing browser storage removes progress. Offline site loading is not implemented. House rules are documented in the game and [the Ludo guide](README.md).
