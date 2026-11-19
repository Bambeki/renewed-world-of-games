# Browser release polish — 19 November 2026

This increment starts from verified football checkpoint `59153ee` on a separate branch, `feature/browser-release-polish`. The deliverable is a browser playtest candidate. The original manager, authentication, squads, player details, transfers, Ludo and campaigns remain available. Main and the previous draft branch are retained.

## What changes for players

- Automatic graphics can step down progressively during sustained slow rendering and restore detail after sustained smooth play. Hysteresis prevents constant resolution changes. Manual presets remain fixed. All modes cap the drawing buffer at two million pixels; the interface keeps its CSS size.
- Footballers outside the camera's view skip bone animation work. Their simulation and world positions continue to update. The controlled player and ball carrier always animate. Skeleton GPU resources are released on close/retry.
- **Performance on this device** shows the last active foreground sample: frame rate, tail frame interval and drawing resolution. Its downloadable JSON includes browser/viewport and rendering counters, without account, lineup or match-save data. Nothing is uploaded by the report control. Frame intervals include browser scheduling; work time is CPU simulation plus rendering submission, not a GPU timer. These measurements are not results for someone else's Mac or phone.
- Balls must wholly cross a boundary. When a diagonal crosses both lines in one step, the first crossing determines the restart. Shots aim at the actual goal line rather than a point behind it.
- Touchline exits award a throw-in to the opposite side. Goal-line exits award a corner after a defender's last touch or a goal kick after an attacker's last touch. Opponents are moved clear of the restart area. Goal kicks use the keeper; throws have an overhead preparation/release pose and a raised ball.
- During your set piece, hold a direction to select the highlighted receiver. Press Pass after the short setup to take it. Otherwise it delivers automatically after 2.4 seconds. The computer also restarts automatically. The timer pauses with the match; restarts do not consume the three active minutes.
- A throw cannot score directly. Direct own goals from these restarts become corners. The taker cannot reclaim a delivery before another player touches it. Training resets to its single attacker after an exit.
- Checkpoints validate restart metadata and still accept old generic-restart saves. Full time immediately saves the terminal state and clears held/buffered inputs; **Play again** starts a fresh exhibition.

Restart award decisions use [IFAB Law 15](https://www.theifab.com/laws/latest/the-throw-in/), [Law 16](https://www.theifab.com/laws/latest/the-goal-kick/) and [Law 17](https://www.theifab.com/laws/latest/the-corner-kick/) as references. This is a simplified exhibition implementation, not full officiating: there is no foul/card/penalty/advantage or offside system, no double-touch free-kick sanction, and no full post/crossbar collision model. Deliveries and throw poses are simplified. A complete rules implementation remains separate work.

## Try and evaluate

```bash
git fetch origin
git switch feature/browser-release-polish
npm ci
npm run docker:up
npm run db:generate
npm run db:deploy
npm run dev
```

Stop an existing dev server with Control+C before switching. Preserve your existing environment files and database. Open `http://localhost:4000/games/football` for anonymous quick play. `/matches` uses your existing club, without writing exhibition results into the league. Use **Practice finishing** to rehearse movement and charged shots.

After several seconds of play, open **Performance on this device** and download the report. Compare Automatic and Performance on the same device/camera. Judge input response and ball contact while playing, not a paused screenshot. Target-device acceptance is a sustained real playthrough with no stuck inputs, visible motion and no lost saves; measured frame-time targets should be agreed after baseline reports on the target Mac and phones. No frame-rate guarantee is made from a software-rendered CI run.

Use the existing [demo account preparation and walkthrough](../release/DEMO.md) for the signed-in investor journey. `npm run demo:prepare` creates or reuses an account on the API you actually run; a CI test account is not a reusable account on your Mac or a live site.

## Verification

Local Node 24 checks: typecheck, lint, builds and all **94 unit/engine tests** passed (17 backend/shared, 77 frontend). They include eight restart scenarios and four performance behaviors, plus existing controls/tactics/save regressions. The local environment blocked Chromium's process socket during launch; local browser execution is therefore not claimed.

The new `test:football-release:browser` journey runs a real-time performance sample/download and repeated renderer close/open, then uses validated device checkpoints and ordinary keyboard controls for throw-ins, corners, goal kicks and full-time/replay. CI retains all existing browser journeys, PostgreSQL integrations, production-container/HTTPS checks and the runtime dependency audit. Its backup rehearsal dumps the disposable `rwog_test` database, restores into a separate newly created database, compares every public table's row count and complete row digest, then removes the restored database and archive. It never restores over its source. Only a count/digest report is uploaded.

Exact CI results are attached to this branch's draft pull request. A passing CI backup rehearsal does not verify backups, recovery time or alerting on the future deployment host.

## Remaining release work

The next release decision requires a real Mac/Safari and phone playtest, any advertised physical controller, player feedback on movement/ball control, and a staged deployment with monitoring and host-level restoration. Vercel remains the intended web host; no public deployment is included here. Football-specific mocap/IK, full match rules and authoritative online play remain open. The candidate is not declared market-ready or EA SPORTS FC-equivalent by these tests. See [launch gates](../release/LAUNCH_GATES.md).
