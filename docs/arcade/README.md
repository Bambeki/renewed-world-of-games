# Playable football exhibition

Open Matches → Play live exhibition → Start match. Green attacks right. Use arrows/WASD to move the yellow-ringed player, Space to shoot, P to pass, and C to select the nearest green outfield player when defending. Collecting the ball automatically selects its green carrier. Touch direction and action buttons are also available.

The match is a responsive animated SVG, not prerecorded video. Twelve numbered players, the ball, possession, keeper distribution, pressing, shots, rebounds, goals, kickoffs, a compressed 90-minute clock, and a full-time result are simulated locally. Two minutes of active play complete one match. Pause/Resume freezes/resumes the simulation; hiding the tab automatically pauses. Restart requires confirmation after kickoff; closing an active match also requires confirmation. Exhibition state is discarded on navigation or reload.

## Scope and limitations

This first arcade release is 6-a-side and uses generic numbered players. It does not use the saved starting XI, player attributes or formation, and does not modify league fixtures, standings or budgets. Existing instant league simulation stays available below it. Local browser scores are not submitted as authoritative league results. Multiplayer, 3D models, animation capture, fouls, corners, throw-ins, offside, substitutions, audio and match save/resume are deferred. Touchlines and missed shots rebound to keep the demo moving. Space shoots towards the centre of the opposing goal; positioning before shooting matters.

## Investor walkthrough

1. Sign in using an existing account, open Matches and launch the exhibition.
2. Start, move with arrows, pass with P, retrieve the ball and shoot with Space. Try Switch player while defending.
3. Pause: verify players and ball stop. Resume or confirm Restart.
4. Play to full time (two active minutes); show the final score and play again.
5. Close the exhibition. The original season still has the same completed fixtures and budget. League simulation can be demonstrated separately.

## Verification

`node --test frontend/test/arcade.test.cjs` checks immutable normalized movement, passing/shooting, switching, scoring both ends exactly once, wide shots, boundaries, a complete match and the terminal state. `npm run test:arcade:browser` needs the running application, migrated test database and Playwright Chromium. It creates an isolated account and checks keyboard/touch movement, action controls, pause, reset cancellation/confirmation, full time, closing, 1440/768/390 px layouts, no HTTP game mutations, unchanged league data, and page/5xx errors. The browser clock accelerates the full-time check. Goal edge cases use constructed simulation states in unit tests.
