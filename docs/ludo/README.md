# Ludo — local pass-and-play

Ludo is the second playable game in Renewed World of Games. Open `/ludo` from the Ludo navigation item or the home page's **Play Ludo with friends** link. It supports two, three or four people taking turns on one device; no account is required.

## Start and play

1. Choose the player count and optional names, then select **Start Ludo**.
2. The current player selects **Roll die**. Roll six to enter a token from the yard.
3. Select a highlighted token on the board or use an accessible **Move token** button. One roll moves one token.
4. Race your four tokens around the track and up your private coloured home lane. Exact rolls are required to finish.
5. A winner announcement appears when all four tokens reach home. **Play again** starts a rematch with the same players. **New game** asks for confirmation before clearing the current game and returning to setup.

The turn message, colour name, token numbers, scoreboard and recent moves supplement the board. Dice use browser cryptographic randomness. This is a casual local game with no stakes or competitive anti-cheat guarantees.

## Explicit house rules

- Two players use opposite colours, red and yellow. Three use red, green and yellow. Four use all colours.
- Six is required to enter from the yard. A six can instead move an existing token and earns another roll, even if there is no legal move.
- Opponents on an unsafe landing square are captured and returned to their yards. All eight star-marked squares, including each starting square, are safe.
- Friendly tokens may share a square and do not block movement. There are no capture/finish bonus turns or three-sixes penalties.
- A token must land exactly at home. Finished tokens cannot move. If there is no valid move, the turn passes unless the roll was six.

## Persistence and scope

A validated version-1 snapshot under `rwog_ludo_v1` in browser localStorage saves setup, tokens, current turn, pending die roll, winner and the last twelve messages. Reloading restores the same game, including a pending token selection. Malformed/incompatible saves fall back to setup with an explanation. Storage failures leave the game playable in the current tab and show a warning.

Only one local game is saved per browser profile. It is not connected to a user's football account and does not sync across devices or browser tabs. Clearing browser data removes it. There are no online rooms, matchmaking, bots, chat, purchases or leaderboards in this increment. Loading the site requires the normal frontend connection; offline reload is not implemented.

## Architecture

`shared/src/ludo.ts` is a pure, immutable rules engine with explicit roll/move transitions, geometry helpers and saved-state validation. The `/ludo` client page renders a 15×15 board, numbered tokens, named controls, turn announcements, player scores and an inline rules panel. It uses scoped Ludo CSS alongside the existing app styling.

No backend endpoints, database schema, authentication, football economy or match engine were changed. The root development command builds shared types/engines before starting the frontend/backend, so newly added exports are available after switching branches.

This branch is based on `feature/investor-demo-mvp`, whose PR was still unmerged when Ludo work started. Review the Ludo PR against that branch to see only this increment. Do not merge either branch into main without the owner's approval.

## Checks

- `npm run typecheck`
- `npm run lint`
- `npm test` — the existing five football tests plus eight Ludo tests, including complete seeded games for each player count.
- `npm run build`
- `npm run test:ludo:browser` — requires a running frontend and Chromium (`npx playwright install chromium`). No API/database is needed for this Ludo journey.
- Existing `npm run test:integration` and `npm run test:browser` remain the football regression checks and need the API/database.

The Ludo browser harness tests setup for all player counts, legal dice/move controls, board-token selection, captures, reload during a pending move, finishing/winner/reload/rematch, reset confirmation, corrupt saves and layouts at 1440, 768 and 390 px. Finishing/capture browser cases load valid prepared snapshots to reach the edge cases; complete games are covered by engine tests. The test-only deterministic dice override is injected by Playwright, not shipped in the application.
