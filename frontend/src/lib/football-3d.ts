/** Authoritative only for this local exhibition. Fixed-step simulation in metres. */
export type Athlete = {
  x: number;
  z: number;
  vx: number;
  vz: number;
  baseX: number;
  baseZ: number;
  team: 0 | 1;
  keeper: boolean;
  number: number;
  name: string;
  overall: number;
  stamina: number;
  facing: number;
  kick: number;
  tackle: number;
  skill: number;
};
export type FootballInput = {
  x: number;
  z: number;
  sprint: boolean;
  shield: boolean;
  shootHeld: boolean;
  shoot: boolean;
  pass: boolean;
  through: boolean;
  lob: boolean;
  tackle: boolean;
  skill: boolean;
  switch: boolean;
};
export type FootballState = {
  players: Athlete[];
  ball: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    owner: number | null;
    lastTouch: 0 | 1;
    cooldown: number;
    releasedBy?: number;
  };
  selected: number;
  score: [number, number];
  elapsed: number;
  phase: "kickoff" | "playing" | "goal" | "restart" | "fulltime";
  phaseTime: number;
  charge: number;
  message: string;
  eventId: number;
  shots: [number, number];
  possession: [number, number];
  restartTeam: 0 | 1;
  keeperHold: number;
};
export const FOOTBALL_DURATION = 180;
export const neutralInput = (): FootballInput => ({
  x: 0,
  z: 0,
  sprint: false,
  shield: false,
  shootHeld: false,
  shoot: false,
  pass: false,
  through: false,
  lob: false,
  tackle: false,
  skill: false,
  switch: false,
});
export const limit = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function createFootball(
  roster: { name: string; overall: number }[] = [],
  formation = "4-4-2",
): FootballState {
  const counts = /^(4-4-2|4-3-3|3-5-2)$/.test(formation)
    ? formation.split("-").map(Number)
    : [4, 4, 2];
  const spots: [number, number][] = [[-48, 0]];
  counts.forEach((count, row) => {
    for (let i = 0; i < count; i++)
      spots.push([
        [-30, -10, 15][row],
        (i - (count - 1) / 2) *
          (count === 2 ? 14 : count === 3 ? 15 : count === 5 ? 11 : 13),
      ]);
  });
  const players: Athlete[] = [0, 1].flatMap((team) =>
    spots.map(([x, z], i) => ({
      x: team ? -x : x,
      z,
      baseX: team ? -x : x,
      baseZ: z,
      vx: 0,
      vz: 0,
      team: team as 0 | 1,
      keeper: i === 0,
      number: i + 1,
      name: team ? `Visitors ${i + 1}` : roster[i]?.name || `RWOG ${i + 1}`,
      overall: team ? 68 : roster[i]?.overall || 68,
      stamina: 100,
      facing: team ? -Math.PI / 2 : Math.PI / 2,
      kick: 0,
      tackle: 0,
      skill: 0,
    })),
  );
  const s: FootballState = {
    players,
    ball: {
      x: 0,
      y: 0.22,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      owner: 9,
      lastTouch: 0,
      cooldown: 1,
    },
    selected: 9,
    score: [0, 0],
    elapsed: 0,
    phase: "kickoff",
    phaseTime: 2,
    charge: 0,
    message: "Kick off. Green attacks the right goal.",
    eventId: 0,
    shots: [0, 0],
    possession: [0, 0],
    restartTeam: 0,
    keeperHold: 0,
  };
  kickoff(s, 0);
  return s;
}
function announce(s: FootballState, text: string) {
  s.message = text;
  s.eventId++;
}
function kickoff(s: FootballState, team: 0 | 1) {
  s.players.forEach((p) => {
    p.x = p.baseX;
    p.z = p.baseZ;
    p.vx = 0;
    p.vz = 0;
  });
  const taker = team === 0 ? 9 : 20;
  const p = s.players[taker];
  p.x = team === 0 ? -0.8 : 0.8;
  p.z = 0;
  // Keep opponents outside the centre circle at restarts.
  s.players.forEach((q) => {
    if (q.team !== team && !q.keeper && Math.hypot(q.x, q.z) < 10) {
      q.x = team === 0 ? 11 : -11;
    }
  });
  s.ball = {
    x: 0,
    y: 0.22,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    owner: taker,
    lastTouch: team,
    cooldown: 1,
  };
  s.selected = team === 0 ? taker : 8;
  s.keeperHold = 0;
  s.charge = 0;
}
function nearest(s: FootballState, team: number, exclude = -1) {
  return s.players
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => p.team === team && !p.keeper && i !== exclude)
    .sort((a, b) => dist(a.p, s.ball) - dist(b.p, s.ball))[0].i;
}
function run(p: Athlete, tx: number, tz: number, speed: number, dt: number) {
  const dx = tx - p.x,
    dz = tz - p.z,
    d = Math.hypot(dx, dz);
  const targetX = d > 0.15 ? (dx / d) * speed : 0,
    targetZ = d > 0.15 ? (dz / d) * speed : 0;
  const response = 1 - Math.exp(-7 * dt);
  p.vx += (targetX - p.vx) * response;
  p.vz += (targetZ - p.vz) * response;
  p.x = limit(p.x + p.vx * dt, -51, 51);
  p.z = limit(p.z + p.vz * dt, -33, 33);
  if (Math.hypot(p.vx, p.vz) > 0.2) p.facing = Math.atan2(p.vx, p.vz);
}
function kick(
  s: FootballState,
  index: number,
  tx: number,
  tz: number,
  speed: number,
  loft: number,
) {
  const p = s.players[index],
    b = s.ball;
  const d = Math.hypot(tx - p.x, tz - p.z) || 1;
  b.x = p.x + ((tx - p.x) / d) * 0.95;
  b.z = p.z + ((tz - p.z) / d) * 0.95;
  b.y = 0.3;
  b.vx = ((tx - p.x) / d) * speed;
  b.vz = ((tz - p.z) / d) * speed;
  b.vy = loft;
  b.owner = null;
  b.releasedBy = index;
  b.lastTouch = p.team;
  b.cooldown = 0.23;
  p.kick = 0.4;
  s.keeperHold = 0;
}
export function stepFootball(
  old: FootballState,
  input: FootballInput,
  dt: number,
): FootballState {
  if (old.phase === "fulltime") return old;
  dt = limit(dt, 0, 1 / 30);
  if (!dt) return old;
  const s: FootballState = {
    ...old,
    players: old.players.map((p) => ({ ...p })),
    ball: { ...old.ball },
    score: [...old.score],
    shots: [...old.shots],
    possession: [...old.possession],
  };
  const b = s.ball;
  s.players.forEach((p) => {
    p.kick = Math.max(0, p.kick - dt);
    p.tackle = Math.max(0, p.tackle - dt);
    p.skill = Math.max(0, p.skill - dt);
  });
  if (s.phase !== "playing") {
    s.phaseTime -= dt;
    if (s.phaseTime <= 0) {
      if (s.phase === "goal") kickoff(s, s.restartTeam);
      s.phase = "playing";
      announce(s, "Play on. Find space and build the attack.");
    }
    return s;
  }
  s.elapsed = Math.min(FOOTBALL_DURATION, s.elapsed + dt);
  if (s.elapsed === FOOTBALL_DURATION) {
    s.phase = "fulltime";
    announce(
      s,
      s.score[0] > s.score[1]
        ? "Full time — victory!"
        : s.score[0] < s.score[1]
          ? "Full time — the visitors win."
          : "Full time — honours even.",
    );
    return s;
  }
  b.cooldown = Math.max(0, b.cooldown - dt);
  if (input.switch) s.selected = nearest(s, 0, s.selected);
  // A goalkeeper always remains autonomous; switching never traps the user in goal.
  if (s.players[s.selected].keeper) s.selected = nearest(s, 0);
  const controlled = s.players[s.selected];
  const magnitude = Math.hypot(input.x, input.z);
  const sprint = input.sprint && controlled.stamina > 5 && !input.shield;
  controlled.stamina = limit(
    controlled.stamina + (sprint && magnitude ? -15 : 9) * dt,
    0,
    100,
  );
  const pace =
    (input.shield ? 3.1 : sprint ? 8.6 : 5.7) *
    (0.9 + controlled.overall / 700);
  run(
    controlled,
    controlled.x + (magnitude ? (input.x / magnitude) * 5 : 0),
    controlled.z + (magnitude ? (input.z / magnitude) * 5 : 0),
    magnitude ? pace : 0,
    dt,
  );
  if (
    input.skill &&
    controlled.skill === 0 &&
    b.owner === s.selected &&
    controlled.stamina >= 12
  ) {
    controlled.skill = 0.75;
    controlled.stamina -= 12;
    controlled.x = limit(
      controlled.x + Math.cos(controlled.facing) * 1.7,
      -51,
      51,
    );
    controlled.z = limit(
      controlled.z - Math.sin(controlled.facing) * 1.7,
      -33,
      33,
    );
    b.cooldown = 0.5;
    announce(s, "A quick body feint — push into the space.");
  }
  const pressing = [nearest(s, 0), nearest(s, 1)];
  for (let i = 0; i < s.players.length; i++) {
    if (i === s.selected) continue;
    const p = s.players[i],
      direction = p.team === 0 ? 1 : -1;
    if (p.keeper) {
      const goalX = p.team === 0 ? -48 : 48;
      run(
        p,
        goalX + direction * limit((52 - Math.abs(b.x)) / 25, 0, 2),
        limit(b.z * 0.65, -3.3, 3.3),
        5.3,
        dt,
      );
      continue;
    }
    if (i === b.owner) {
      run(p, p.team === 1 ? -49 : 49, limit(p.z * 0.92, -10, 10), 5.1, dt);
      continue;
    }
    const owns = b.owner !== null && s.players[b.owner].team === p.team;
    if (!owns && i === pressing[p.team]) {
      run(p, b.x, b.z, 5.2, dt);
      continue;
    }
    const shift =
      limit(b.x * 0.25, -12, 12) + (owns ? direction * 9 : -direction * 3);
    const targetX = limit(p.baseX + shift, -43, 43),
      targetZ = limit(
        p.baseZ + b.z * 0.15 + Math.sin(s.elapsed * 0.8 + i) * 1.2,
        -29,
        29,
      );
    run(p, targetX, targetZ, 4.3, dt);
  }
  // Bodies have volume: separation prevents dribbling straight through defenders.
  for (let i = 0; i < s.players.length; i++)
    for (let j = i + 1; j < s.players.length; j++) {
      const a = s.players[i],
        c = s.players[j],
        d = dist(a, c);
      if (d < 0.92) {
        const nx = d > 0.001 ? (a.x - c.x) / d : 1,
          nz = d > 0.001 ? (a.z - c.z) / d : 0,
          push = (0.92 - d) / 2;
        a.x += nx * push;
        a.z += nz * push;
        c.x -= nx * push;
        c.z -= nz * push;
      }
    }
  if (input.tackle && controlled.tackle === 0) {
    controlled.tackle = 1.1;
    if (
      b.owner !== null &&
      s.players[b.owner].team === 1 &&
      dist(controlled, b) < 2.2 &&
      b.y < 0.7
    ) {
      b.owner = s.selected;
      b.cooldown = 0.6;
      b.lastTouch = 0;
      announce(s, "Clean standing tackle. Possession won.");
    } else announce(s, "Tackle missed — recover your position.");
  }
  if (b.owner !== null) {
    const owner = s.players[b.owner],
      human = b.owner === s.selected;
    if (owner.keeper) {
      s.keeperHold += dt;
      if (s.keeperHold > 1) {
        kick(
          s,
          b.owner,
          owner.x + (owner.team === 0 ? 22 : -22),
          owner.z * 0.5,
          17,
          3,
        );
        announce(s, "The goalkeeper distributes.");
      }
    } else if (human) {
      if (input.shootHeld) s.charge = Math.min(1, s.charge + dt / 0.9);
      if (input.shoot) {
        const power = limit(s.charge, 0.18, 1);
        const targetZ = limit(owner.z * 0.22 + input.z * 3.5, -3.2, 3.2);
        kick(s, b.owner, 54, targetZ, 20 + power * 13, power > 0.8 ? 3.4 : 1.1);
        s.shots[0]++;
        s.charge = 0;
        announce(s, "Shot on goal!");
      } else if (input.pass || input.through || input.lob) {
        const ax = magnitude ? input.x / magnitude : Math.sin(owner.facing),
          az = magnitude ? input.z / magnitude : Math.cos(owner.facing);
        const target = s.players
          .map((p, i) => ({ p, i }))
          .filter(({ p, i }) => p.team === 0 && !p.keeper && i !== b.owner)
          .sort((a, c) => {
            const rank = (p: Athlete) => {
              const d = dist(owner, p) || 1;
              return (
                d - ((ax * (p.x - owner.x) + az * (p.z - owner.z)) / d) * 25
              );
            };
            return rank(a.p) - rank(c.p);
          })[0];
        kick(
          s,
          b.owner,
          target.p.x + (input.through ? 6 : target.p.vx * 0.3),
          target.p.z + target.p.vz * 0.3,
          input.through ? 23 : 18,
          input.lob ? 7.2 : 0.6,
        );
        s.charge = 0;
        announce(
          s,
          `${input.lob ? "Lofted ball" : input.through ? "Through ball" : "Pass"} to ${target.p.name}.`,
        );
      }
    } else if (
      owner.team === 1 &&
      owner.x < -25 &&
      Math.abs(owner.z) < 18 &&
      b.cooldown === 0
    ) {
      kick(s, b.owner, -54, Math.sin(s.elapsed * 1.7) * 2.8, 25, 1.4);
      s.shots[1]++;
      announce(s, "The visitors shoot. The keeper sets himself.");
    }
    // Shielding and skill windows protect the ball; computer tackles are not instantaneous.
    if (
      b.owner !== null &&
      !owner.keeper &&
      b.cooldown === 0 &&
      !(human && (input.shield || owner.skill > 0))
    ) {
      const challenger = s.players.findIndex(
        (p) =>
          p.team !== owner.team &&
          !p.keeper &&
          dist(p, owner) < 1.15 &&
          p.tackle === 0,
      );
      if (challenger !== -1) {
        s.players[challenger].tackle = 1.3;
        b.owner = challenger;
        b.lastTouch = s.players[challenger].team;
        b.cooldown = 0.7;
        s.charge = 0;
        if (b.lastTouch === 0) s.selected = challenger;
        announce(s, "A challenge wins the ball.");
      }
    }
    if (b.owner !== null) {
      const carrier = s.players[b.owner];
      const moving = Math.hypot(carrier.vx, carrier.vz);
      const stride = 0.7 + Math.sin(s.elapsed * 12) * 0.12;
      b.x = carrier.x + Math.sin(carrier.facing) * stride;
      b.z = carrier.z + Math.cos(carrier.facing) * stride;
      b.y =
        0.22 +
        Math.abs(Math.sin(s.elapsed * 12)) * 0.04 * Math.min(moving / 5, 1);
      b.vx = carrier.vx;
      b.vz = carrier.vz;
      b.vy = 0;
      s.possession[carrier.team] += dt;
    }
  } else {
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.y += b.vy * dt;
    b.vy -= 9.81 * dt;
    if (b.y < 0.22) {
      b.y = 0.22;
      if (b.vy < -0.8) b.vy *= -0.42;
      else b.vy = 0;
      const friction = Math.exp(-1.05 * dt);
      b.vx *= friction;
      b.vz *= friction;
    } else {
      const drag = Math.exp(-0.12 * dt);
      b.vx *= drag;
      b.vz *= drag;
    }
    {
      const eligible = (i: number) => i !== b.releasedBy || b.cooldown === 0;
      const keeper = s.players.findIndex(
        (p, i) => eligible(i) && p.keeper && dist(p, b) < 1.4 && b.y < 1.9,
      );
      const catcher =
        keeper !== -1
          ? keeper
          : s.players.findIndex(
              (p, i) =>
                eligible(i) && !p.keeper && dist(p, b) < 0.85 && b.y < 0.65,
            );
      if (catcher !== -1) {
        b.owner = catcher;
        b.cooldown = 0.55;
        b.lastTouch = s.players[catcher].team;
        s.keeperHold = 0;
        if (s.players[catcher].team === 0 && !s.players[catcher].keeper)
          s.selected = catcher;
        announce(
          s,
          s.players[catcher].keeper
            ? "Saved! The goalkeeper gathers."
            : `${s.players[catcher].name} controls the ball.`,
        );
      }
    }
    if (b.owner === null && (Math.abs(b.x) > 52.5 || Math.abs(b.z) > 34)) {
      if (Math.abs(b.x) > 52.5 && Math.abs(b.z) < 3.66 && b.y < 2.44) {
        const scorer = b.x > 0 ? 0 : 1;
        s.score[scorer]++;
        s.phase = "goal";
        s.phaseTime = 3;
        s.restartTeam = scorer === 0 ? 1 : 0;
        b.vx = 0;
        b.vz = 0;
        announce(
          s,
          scorer === 0
            ? "GOAL! Your team finds the net!"
            : "Goal for the visitors. Regroup for kickoff.",
        );
      } else {
        const restart = (1 - b.lastTouch) as 0 | 1;
        b.x = limit(b.x, -47, 47);
        b.z = limit(b.z, -32, 32);
        const taker = nearest(s, restart);
        s.players[taker].x = b.x;
        s.players[taker].z = b.z;
        b.owner = taker;
        b.lastTouch = restart;
        b.cooldown = 1.3;
        b.y = 0.22;
        b.vx = 0;
        b.vy = 0;
        b.vz = 0;
        s.phase = "restart";
        s.phaseTime = 1.2;
        if (restart === 0) s.selected = taker;
        announce(
          s,
          "Ball out. Possession restarts from the sideline / goal line.",
        );
      }
    }
  }
  // Defensive clamping also covers body separation at field edges.
  s.players.forEach((p) => {
    p.x = limit(p.x, -51.5, 51.5);
    p.z = limit(p.z, -33.5, 33.5);
  });
  return s;
}
