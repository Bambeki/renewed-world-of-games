# Browser first-touch control increment

The game continues from the verified browser checkpoint `90dbaf7`. The web platform and existing management/league features are retained. No native game client or main-branch merge is part of this increment.

Kicking now changes ball velocity at its actual position. Previously a pass or shot moved the ball to a fixed point 0.95 metres in front of the player before launching it, producing a visible jump. Aim is now calculated from the ball's position too.

A receiver cushions the incoming horizontal speed. Move as the ball arrives to direct the first touch; Sprint pushes it farther, while Shield settles it closely. The ball rolls independently for the reception interval instead of immediately replacing that contact with a dribble impulse.

Press pass, through ball, lob, or release a shot within 180 ms before controlling a nearby ball to prepare a first-time action. An intended receiver can hold Shoot while the pass approaches to prepare power. The queued aim and power belong to that receiver; switching, interception, expiration or pausing cancels stale commands. Releasing Shoot too early discards its prepared power.

Device saves remain club/lineup-specific and client-only. The optional buffered action is validated for player, action, duration, aim and power. Old saves without that field remain accepted. Exhibition results do not change league results or club finances.

## Verification

From the repository root:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

With the API, web and a disposable test PostgreSQL database running:

```bash
npm run test:football-control:browser
npm run test:football-production:browser
npm run test:football-visual:browser
```

The full CI run also covers existing football controls, management, Ludo, campaigns, native PostgreSQL integration, production containers, HTTPS routing and the runtime dependency scan. Check the run attached to the exact branch commit.

For a manual playtest, open `/matches` and start a 3D match:

1. Pass toward a teammate and use movement as the ball arrives. Compare an ordinary touch with Sprint and Shield.
2. Press Pass shortly before receiving. The receiver should pass once, without another press.
3. Hold Shoot as an intended pass approaches, release just before reception, and check the first-time shot and power bar.
4. Try an early press that expires, switch players or pause. The old command should not trigger later.
5. Watch a stationary or sideways pass in the close camera. Its launch should retain the ball's contact position.

This is a gameplay increment, not an EA SPORTS FC quality certification. General locomotion and procedural football poses, incomplete match rules and rule-based AI remain. Real Mac/iPhone/Android performance and player feedback still need testing. No Vercel/public deployment was performed here.
