# Browser football: character and control revision

The target stays **in the browser**, as requested on 8 November 2026. The 11 November matchday revision adds an immersive broadcast interface, TV camera, graphics choices, CPU passing/difficulty, saved-match recovery and a staging package; see [verification](VERIFICATION.md) and [deployment](../production/README.md). This increment is isolated on `feature/football-browser-quality`, based on the reviewed multi-game candidate. Work here focuses on football. The other games and manager database/API are preserved.

The previous build's block-body renderer and simple limb rotation were insufficient for the requested football presentation. Passing engine tests did not establish good animation, believable ball control or EA SPORTS FC-level quality. This revision replaces that rendering path rather than describing it as finished.

## Implemented

- A bundled, skinned humanoid replaces the box-limb figures. Each footballer has an independent 65-bone skeleton and four retargeted clips: idle, walk, jog and sprint. Speed blends the clips; pose overlays handle kicking, shot preparation, first touch, shielding/keeper arms and body feints. Pausing freezes the bone pose as well as the simulation.
- Team shirts, shorts, socks, skin tones, boots, hair and bone-attached shirt numbers distinguish players. The 980 KB asset is served locally with the app; playing does not contact an asset marketplace or require an account there.
- Closer follow/close cameras make players and ball contests easier to see. A live tactical minimap retains awareness of teammates and opponents. Procedural turf detail replaces flat colour alone.
- A mouse/touch analogue stick supports arbitrary directions and partial input strength. Keyboard, directional buttons and the existing standard gamepad controls remain available.
- A pass hands control to the intended receiver while the ball travels. The receiver can be positioned before the first touch.
- Body feints move through time instead of teleporting sideways. Computer challenges require a short sustained pressure window; shielding cancels it. The human player's tackle still requires the tackle input.
- A keeper holds the ball above ground before distributing it. Training continues to have one attacker and one keeper; the full exhibition uses all 22 animated players.
- Asset/graphics load failure has an explicit retry path. Late async loads are disposed when the match has been closed. The match still pauses on hidden tabs/window focus loss.

## Try it

Stop the existing dev server with Control+C, then from the project root:

```bash
git fetch origin
git switch feature/football-browser-quality
npm ci
npm run docker:up
npm run dev
```

Open `http://localhost:4000/matches`, log in with your existing club and choose **Play 3D match**. Select **Kick off** on the pitch. Choose the **Close** camera to inspect the figures. `/training` gives a simpler finishing drill.

WASD/arrows move, Shift sprints, F shields, Q feints, P passes, L plays through, O lobs, J tackles and C switches. Hold Space to charge and release to shoot. Drag the analogue stick for 360-degree movement. Green attacks the right goal. Exhibition scores remain separate from the management season.

## Evidence and acceptance

See [verification](VERIFICATION.md). Automated checks establish working controls and regression safety. The next product decision requires an actual playthrough: movement should respond immediately; feet/ball contacts should be readable; a player should be able to receive, turn, pass, tackle and shoot without fighting the camera. Computer pressure should leave a perceptible reaction opportunity.

Capture a short real browser playthrough when reviewing this branch. Assess visible foot sliding, pose transitions, ball distance on turns, input delay, camera tracking and performance on the target Mac/iPhone. Do not accept a static stadium screenshot or a test count alone as proof that the game feels good.

## Limits

This remains a simplified browser football game. It is **not EA SPORTS FC-equivalent**. There are no dedicated football motion-capture clips, full foot-plant IK, detailed face/cloth simulation, authored goalkeeper dives, offside/referee system, licensed teams or online authoritative matches. The local exhibition does not write league scores. Motion, CPU tactics, camera tuning and low-end-device performance need continued player testing.

The new character is a stylized anatomical humanoid, not a photorealistic scan. Locomotion is sourced from a general-purpose animation library; football-specific poses are custom additive adjustments. Those are concrete remaining presentation limits, rather than a promise that a different language model will remove them automatically.

## Asset provenance

Character and locomotion source: **Quaternius**, CC0 1.0 Universal.

- [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html), Standard free Superhero Male. The source mesh was obtained from [a documented CC0 redistribution](https://github.com/programasweights/avatar/blob/main/public/assets/character.glb) after the direct download was rate limited. Only the base character was used; no celebrity costume or Mixamo asset is included.
- [Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html), official free Standard pack, `Unreal-Godot/UAL1_Standard.glb`, without root motion. Only four locomotion clips are bundled.
- Original license notices are in `frontend/public/assets/football`. `PROVENANCE.json` records the inputs and SHA-256 hashes.
- `scripts/prepare-football-assets.py` retargets the clips to the target rest pose while keeping original mesh proportions and bone lengths. It creates the committed `player.glb`; Blender and asset downloads are not needed to run the game.

EA's public gameplay notes informed the emphasis on control, touch intervals, animation transitions and clear player feedback: [EA SPORTS FC 26 gameplay fundamentals](https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-gameplay-deep-dive). No EA code, artwork, likenesses, marks or animation data were copied.
