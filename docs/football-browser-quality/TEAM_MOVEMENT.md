# Browser team movement and quick play

Continues from verified checkpoint `2de9cc9`. Native/downloadable clients remain deferred. The existing football branch and main history are preserved.

## Play without an account

Open `/games/football`, also linked from Home and All games. Choose 4-4-2, 4-3-3 or 3-5-2, then **Play quick match** or **Practice finishing**. This uses the same 3D engine, animations, cameras and controls as club matches. The fictional sides have equal ratings.

Quick play makes no account/game API requests. Its device checkpoints have their own namespace and are separated by formation and exhibition/training mode. Club saves and authoritative league data remain separate. Clearing browser storage removes these local matches. Device settings such as graphics/camera retain their existing shared behavior.

The pitch renderer loads only when a game is opened. The menu remains available when the API is unavailable; WebGL and the bundled game assets are still required for playing. This is not an offline/PWA implementation.

## Team movement

- Two support players offer a safe outlet and a forward passing angle; candidate lanes account for nearby opponents.
- Available forwards run beyond the carrier and narrow toward the box near goal. The back line stays behind the attack.
- Defending assigns one primary presser and a separate player covering the route to goal. Remaining defenders/midfielders track different dangerous runners or recover their shape.
- Loose-ball pursuit anticipates a short portion of the ball trajectory. Intended receivers meet passes instead of drifting back to a formation point.
- An idle human receiver automatically meets an intended pass. Movement, Shield, charging a shot or a buffered first-time action takes priority. Receiving the ball restores ordinary movement control.
- Formation targets respond immediately to a change of possession. Planning reads one snapshot, uses no randomness and adds no new saved-state fields.
- Players slow down near their target rather than running past it at full speed.

This is still rule-based exhibition AI. These movement rules do not implement offside, fouls, tactical commands, substitutions, authoritative online play or professional motion capture.

## Checks

Local typecheck, lint, production builds and all 81 unit/engine tests passed (17 backend/shared, 64 frontend). Ten new tests cover passing angles, cover/marking, all formations, blocked support lanes, mirrored teams, turnovers, interception, receiver assistance/manual priority and deterministic save/resume. The prior ball control and complete-match regressions also passed.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

`npm run test:football-quickplay:browser` checks the anonymous entry, layouts, 22 moving players, keyboard movement, formation/drill save isolation, resume and absence of API calls. It is included in CI alongside all previous browser journeys, native PostgreSQL integration, production HTTPS/container checks and the dependency audit. Use the run attached to the exact branch commit for the current browser/production result.

## Manual playtest

1. In a private browser window, open `/games/football` and choose 4-3-3. Start a quick match without registering.
2. Hold Shield and watch the minimap: teammates should offer two angles, forwards should advance, and a defender should press while another stays goal-side.
3. Pass and release movement briefly. The receiver should move toward the incoming ball. Then aim or hold Shoot to take over the first touch.
4. Lose possession. Watch your team recover, cover and track runners instead of all chasing the ball.
5. Pause, close, reopen the same formation and resume. A different formation and the finishing drill should have separate saves.

Physical Mac/Safari/iPhone/Android and controller playtests and measured frame times remain necessary. The internal browser preview is not a public Vercel deployment. This increment does not establish commercial readiness or EA SPORTS FC-level quality.
