# Investor demonstration — Renewed World of Games

Allow 5–7 minutes. This is a playable single-manager football management demo against five fictional clubs.

## Run locally or on the meeting host

Prerequisites: Node 20+, npm 10+, PostgreSQL 16 (the existing Docker Compose setup provides it).

1. Check out `feature/investor-demo-mvp` and run `npm ci`.
2. Copy the existing backend/frontend `.env.example` files to `.env` in their respective directories. Set `DATABASE_URL`, a private `JWT_SECRET`, and `CORS_ORIGIN` for the meeting host. `NEXT_PUBLIC_API_URL` must point to its API before building the frontend. For a local rehearsal, keep ports 4000/4001.
3. Start PostgreSQL (`npm run docker:up` if using the repository's Compose setup).
4. Run `npm run db:generate`, `npm run db:deploy`, then `npm run build`. Deploy migrations before starting the new API. Existing users, teams and squads are retained.
5. Start API and frontend in separate terminals: `npm run start -w backend` and `npm run start -w frontend -- --hostname 127.0.0.1` for a local meeting. Use the host binding appropriate for your deployment.
6. Supply `DEMO_PASSWORD` and run `npm run demo:prepare`. Default email: `investor@rwog.example`; username: `InvestorDemo`; team: **Renewed United**. The script registers via the real auth API, logs in, edits club identity, and initializes the season. Re-running preserves existing season progress and never resets an existing password. `API_URL`, `DEMO_EMAIL`, `DEMO_USERNAME` can override defaults. Use a new email and username for a fresh demonstration season.

The local verification account used `investor@rwog.example` / `InvestorDemo2026!`. This account was created in an isolated local PGlite test database, **not in a deployed service**. Run the preparation script against the actual meeting host to provision the account there; choose the host's demo password yourself.

## Live walkthrough

1. **Log in.** Show the real authenticated Renewed United account and its €1,000,000 starting budget. Explain that each manager gets a generated squad.
2. **Squad.** Open a player. Show attributes, position, fitness and age; return using the navigation.
3. **Starting XI.** Choose 4-3-3 (also available: 4-4-2 and 3-5-2). Change one player if desired, then **Save starting XI**. Reload to demonstrate persistence.
4. **Matches.** Click **Play matchday 1** once. Show the final score and goal-event report. The whole league's three fixtures advance together. Scoring is randomized: don't promise a win.
5. **League.** Show updated points, wins/draws/losses, goal difference and remaining home/away fixtures.
6. **Transfers.** Sign Amari Silva for €120,000. Show the lower budget and the player in Squad/player details. He is a goalkeeper; to field him, replace the saved goalkeeper in Starting XI and save. Alternatively sign an outfield player to demonstrate a positional replacement. Non-starters can be sold after confirmation; enough positional cover must remain.
7. **Overview.** Show the updated budget, squad count, league position, latest result and next fixture. Optionally show Club settings and rename the team.
8. Close with the playable loop: **select → play → review → strengthen → repeat**. The season has ten rounds and a final table.

## Before leaving for the meeting

Rehearse on the actual presentation machine and network, with PostgreSQL and the deployed API/frontend. Confirm login, one match and one transfer. Use a fresh account for the investor demonstration so matchday 1 and the initial transfer budget are available. Keep this walkthrough and screenshots available as a fallback; screenshots are evidence from test accounts, not a substitute for the playable build.

## Remaining limitations

- One ten-round season per manager; no next-season/reset control, promotion, relegation or shared human league.
- Immediate simulation and goal events, not a live animated match. Ratings, home advantage and chance drive scoring; no tactical sub-systems, substitutions, injuries, suspensions or fitness progression.
- Fixed-price signings and sales; no bids, negotiations, other-manager trading or AI transfer strategy. Market contains eight generated options; sold players leave the squad. No recurring wages or match income.
- No real-time multiplayer, AI features or social features. No production deployment or domain configuration was performed.
- Existing JWT sessions expire (default 15 minutes unless configured); no refresh UI. Log back in if necessary. Browser token storage follows the existing architecture.
- PostgreSQL migration/concurrency behavior must be rehearsed on the meeting host. Local API/browser verification used PGlite; CI is configured to run these same checks against PostgreSQL 16 but has not run remotely because GitHub write access was denied.
