# Investor and playtest walkthrough

Use a local/test deployment. Start at `/games`. Allow approximately 10–15 minutes. The new stories are original browser prototypes; describe them as playable product directions, not finished commercial games.

## Before the meeting

1. Follow the root README setup. Start Docker and apply existing migrations. Keep the server terminal running.
2. Run `DEMO_PASSWORD='your-local-password' npm run demo:prepare` in a second terminal. Sign in with `investor@rwog.example` and that password. Use distinct email/username values if preserving another demo season.
3. Open `/games`, `/training`, `/games/adventure` and `/games/rome` once on the demonstration computer. Test its keyboard and graphics.
4. Resume an existing local campaign or use its confirmed Restart button. Refresh intentionally preserves progress.
5. Keep screenshots of each game and the latest verification report as a fallback. Never reset the database to restart a demo.

## Football manager: 3 minutes

- Open Founders League and show the club dashboard.
- Open Squad, then a player detail page; return to Starting XI. Choose a formation and save a legal XI.
- Simulate one matchday in Matches. This computes a management result immediately. Show the report, remaining fixtures and standings.
- Buy an affordable player in Transfers; show budget/squad changes. Sell a bench player if desired. Refresh to demonstrate database persistence.

## Football laboratory: 2 minutes

- Open Training pitch and Play 3D match. Select **Kick off** on the pitch.
- Use WASD/arrows to move in any direction. Shift sprints; F shields for close control; Q performs a body feint. Hold Space to charge and release to shoot at the right goal.
- Show the ball rolling between foot touches and the goalkeeper response. C stays with the only attacker in this drill. Passing is available in the full 11 v 11 exhibition.
- Escape pauses. Click Continue play to resume. Switching browser tabs/windows also pauses and explains why; return and resume explicitly.
- Full exhibition: open Matches → Play 3D match. P passes, L plays through, O lobs, J tackles and C changes controlled player. It is separate from the simulated league result.

## Jack & Rose: Lost Signals: 3–5 minutes

- No account is required. Start with Jack in Mission 1, **The silent harbour**.
- Move Jack toward the rockfall (diamond). Stand beside it and use Interact. Switch to Rose; take her to the signal/beacon and use Interact. Guide both to the boat/exit at the upper right.
- Keyboard: WASD/arrows move, E/Space interact, R switches. Click the map first. The on-screen directional and action buttons work without a keyboard.
- Jack clears stone; Rose repairs equipment. Both must be on or immediately beside the exit. The objective panel tracks progress. Switching is free; each 24 successful actions costs one of six shelter points.
- Continue to **The flooded archive**: collect the key, unlock the door, repair the bridge and bring both explorers out.
- Mission 3, **Last light on the ridge**: clear the rockfall, restore the signal, reach the survivor and evacuate both explorers.
- Refresh after moving: progress resumes at the same stage. Restart asks before replacing the current mission. Complete all three to show the campaign-end/replay path. Running out of shelter gives a retry screen.

## Standards of Rome: 3–5 minutes

- Select a red Roman unit. Its statistics and unused orders appear beside the board. Green tiles indicate reachable ground.
- Click a highlighted empty tile to move; click an enemy in range to attack. Each unit has one move and one attack per round. Archers reach three tiles, legionaries/cavalry one. Cavalry moves farther and deals extra damage to archers.
- Recruit reinforcements with gold. Newly recruited units act next round. A free western deployment tile and fewer than six friendly units are required.
- End turn lets the enemy advance or attack. Each new round gives four gold; defeating an enemy gives three.
- Defeat every enemy while the fort survives, before round 19. Complete **Guard the crossing**, **The broken road** and **The last standard**. A lost fort or expired turn limit gives a retry screen.
- Refresh to show persistence, cancel a restart to preserve the board, then replay after victory. Tab/Enter or Space can activate battlefield cells.

## Finish

Return to All games and open Ludo to demonstrate another retained game style. Clearly state the current scope: manager MVP, local Ludo, experimental football action, and two short mission campaigns. Ask playtesters which loop they would return to and where they became confused. Record actual feedback before choosing the next production investment.
