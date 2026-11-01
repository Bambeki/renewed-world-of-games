// Small deterministic arcade simulation. Coordinates use a 100 × 64 pitch.
export type Footballer = {
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  team: number;
  number: number;
};
export type ArcadeState = {
  players: Footballer[];
  selected: number;
  ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    owner: number | null;
    cooldown: number;
  };
  score: [number, number];
  elapsed: number;
  remaining: number;
  message: string;
  finished: boolean;
  kickoffs: number;
};
export type Controls = {
  x: number;
  y: number;
  shoot: boolean;
  pass: boolean;
  switch: boolean;
};
export const MATCH_SECONDS = 120;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export function createArcade(): ArcadeState {
  const positions = [
    [5, 32],
    [25, 15],
    [25, 49],
    [42, 20],
    [42, 44],
    [49, 32],
  ];
  const players = [0, 1].flatMap((team) =>
    positions.map(([x, y], i) => ({
      x: team ? 100 - x : x,
      y,
      homeX: team ? 100 - x : x,
      homeY: y,
      team,
      number: i + 1,
    })),
  );
  // Give the kickoff taker space outside the opposing centre circle.
  players[11].x = 61;
  return {
    players,
    selected: 5,
    ball: { x: 50, y: 32, vx: 0, vy: 0, owner: 5, cooldown: 0 },
    score: [0, 0],
    elapsed: 0,
    remaining: MATCH_SECONDS,
    message: "Kick off! Green attacks to the right.",
    finished: false,
    kickoffs: 0,
  };
}
function move(p: Footballer, x: number, y: number, speed: number, dt: number) {
  const d = Math.hypot(x - p.x, y - p.y);
  if (d > 0.1) {
    p.x += ((x - p.x) / d) * Math.min(d, speed * dt);
    p.y += ((y - p.y) / d) * Math.min(d, speed * dt);
  }
  p.x = clamp(p.x, 1, 99);
  p.y = clamp(p.y, 1, 63);
}
export function stepArcade(
  state: ArcadeState,
  input: Controls,
  dt: number,
): ArcadeState {
  if (state.finished) return state;
  dt = clamp(dt, 0, 0.05);
  const s: ArcadeState = {
    ...state,
    players: state.players.map((p) => ({ ...p })),
    ball: { ...state.ball },
    score: [...state.score],
  };
  s.elapsed = Math.min(MATCH_SECONDS, s.elapsed + dt);
  s.remaining = Math.max(0, MATCH_SECONDS - s.elapsed);
  if (s.remaining === 0) {
    s.finished = true;
    s.message = `Full time. ${s.score[0] === s.score[1] ? "A draw." : s.score[0] > s.score[1] ? "You win!" : "The visitors win."}`;
    return s;
  }
  const b = s.ball;
  b.cooldown = Math.max(0, b.cooldown - dt);
  if (input.switch) {
    const candidates = s.players
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => p.team === 0 && i !== s.selected && p.number !== 1)
      .sort((a, c) => distance(a.p, b) - distance(c.p, b));
    s.selected =
      b.owner !== null && s.players[b.owner].team === 0
        ? b.owner
        : candidates[0].i;
  }
  const controlled = s.players[s.selected];
  const length = Math.hypot(input.x, input.y);
  if (length)
    move(
      controlled,
      controlled.x + (input.x / length) * 10,
      controlled.y + (input.y / length) * 10,
      19,
      dt,
    );
  // Both keepers track the ball; closest outfield opponent presses, others hold shape.
  const opponent = s.players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.team === 1 && p.number !== 1)
    .sort((a, c) => distance(a.p, b) - distance(c.p, b))[0].i;
  for (let i = 0; i < s.players.length; i++) {
    if (i === s.selected) continue;
    const p = s.players[i];
    if (p.number === 1) {
      move(p, p.homeX, clamp(b.y, 24, 40), 12, dt);
      continue;
    }
    if (i === b.owner && p.team === 1) {
      move(p, 5, 32, 13, dt);
      continue;
    }
    if (p.team === 1 && i === opponent) {
      move(p, b.x, b.y, 13, dt);
      continue;
    }
    const attacking = b.owner !== null && s.players[b.owner].team === p.team;
    move(
      p,
      clamp(p.homeX + (attacking ? (p.team === 0 ? 14 : -14) : 0), 8, 92),
      p.homeY + Math.sin(s.elapsed * 1.3 + i) * 3,
      8,
      dt,
    );
  }
  if (b.owner !== null) {
    const owner = s.players[b.owner];
    b.x = owner.x + (owner.team === 0 ? 1 : -1);
    b.y = owner.y;
    const human = owner.team === 0 && b.owner === s.selected;
    const aiShoot = owner.team === 1 && owner.x < 35 && b.cooldown === 0;
    if ((human && (input.shoot || input.pass) && b.cooldown === 0) || aiShoot) {
      let tx = owner.team === 0 ? 102 : -2,
        ty = 32;
      if (human && input.pass && !input.shoot) {
        const target = s.players
          .filter((p, i) => p.team === 0 && i !== b.owner && p.number !== 1)
          .sort(
            (a, c) =>
              distance(a, { x: owner.x + 18, y: owner.y }) -
              distance(c, { x: owner.x + 18, y: owner.y }),
          )[0];
        tx = target.x;
        ty = target.y;
        s.message = `Pass to number ${target.number}.`;
      } else {
        s.message = human
          ? "Shot! Aim by moving into space before shooting."
          : "The visitors shoot!";
      }
      const d = Math.hypot(tx - b.x, ty - b.y) || 1;
      const speed = human && input.pass && !input.shoot ? 40 : 57;
      b.vx = ((tx - b.x) / d) * speed;
      b.vy = ((ty - b.y) / d) * speed;
      b.owner = null;
      b.cooldown = 0.22;
    } else {
      const tackler = s.players.findIndex(
        (p) => p.team !== owner.team && distance(p, owner) < 1.8,
      );
      if (tackler !== -1 && b.cooldown === 0) {
        b.owner = tackler;
        b.cooldown = 0.5;
        s.message = "Possession changes.";
        if (s.players[tackler].team === 0) s.selected = tackler;
      }
    }
  } else {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const drag = Math.exp(-0.45 * dt);
    b.vx *= drag;
    b.vy *= drag;
    if (b.y < 1 || b.y > 63) {
      b.y = clamp(b.y, 1, 63);
      b.vy *= -0.7;
      s.message = "Ball rebounds off the touchline.";
    }
    if (b.x < 0 || b.x > 100) {
      if (b.y > 25 && b.y < 39) {
        const scorer = b.x > 100 ? 0 : 1;
        s.score[scorer]++;
        s.kickoffs++;
        s.message =
          scorer === 0 ? "GOAL! Your club scores!" : "Goal for the visitors.";
        s.players.forEach((p) => {
          p.x = p.homeX;
          p.y = p.homeY;
        });
        b.owner = scorer === 0 ? 11 : 5;
        if (scorer === 0) s.players[5].x = 39;
        else s.players[11].x = 61;
        s.selected = 5;
        b.x = 50;
        b.y = 32;
        b.vx = 0;
        b.vy = 0;
        b.cooldown = 1;
      } else {
        b.x = clamp(b.x, 1, 99);
        b.vx *= -0.65;
        s.message = "Wide! The ball stays in play.";
      }
    }
    if (b.owner === null && b.cooldown === 0) {
      const catcher = s.players.findIndex((p) => distance(p, b) < 2);
      if (catcher !== -1) {
        b.owner = catcher;
        b.cooldown = 0.3;
        if (s.players[catcher].team === 0) s.selected = catcher;
      }
    }
  }
  // A keeper redistributes rather than holding the ball indefinitely.
  if (b.owner !== null && s.players[b.owner].number === 1 && b.cooldown === 0) {
    const p = s.players[b.owner];
    b.owner = null;
    b.vx = p.team === 0 ? 35 : -35;
    b.vy = (32 - p.y) * 0.4;
    b.cooldown = 0.4;
    s.message = "Goalkeeper clears.";
  }
  return s;
}
