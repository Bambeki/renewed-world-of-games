/* eslint-disable @typescript-eslint/no-require-imports -- Node simulation test harness. */
const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module"),
  path = require("node:path");
const file = path.resolve(__dirname, "../src/lib/football-3d.ts");
const m = new Module(file, module);
m._compile(
  ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  file,
);
const { createFootball, stepFootball, neutralInput, FOOTBALL_DURATION } =
  m.exports;
const play = () => {
  const s = createFootball();
  s.phase = "playing";
  return s;
};
const step = (s, input = {}, n = 1) => {
  for (let i = 0; i < n; i++)
    s = stepFootball(s, { ...neutralInput(), ...input }, 1 / 60);
  return s;
};
test("saved XI names/ratings and supported formations produce 11 physical players per side", () => {
  for (const f of ["4-4-2", "4-3-3", "3-5-2"]) {
    const roster = Array.from({ length: 11 }, (_, i) => ({
      name: `Player ${i}`,
      overall: 70 + i,
    }));
    const s = createFootball(roster, f);
    assert.equal(s.players.length, 22);
    assert.equal(s.players.filter((p) => p.team === 0).length, 11);
    assert.equal(s.players.filter((p) => p.keeper).length, 2);
    assert.equal(s.players[3].name, "Player 3");
    assert.equal(s.players[3].overall, 73);
    const [def, mid, fwd] = f.split("-").map(Number);
    for (const [x, count] of [
      [-30, def],
      [-10, mid],
      [15, fwd],
    ])
      assert.equal(
        s.players.filter((p) => p.team === 0 && p.baseX === x).length,
        count,
      );
  }
});
test("movement has inertia, sprint consumes stamina and the input state is immutable", () => {
  const s = play(),
    before = JSON.stringify(s);
  const walk = step(s, { x: 1 }, 30),
    sprint = step(s, { x: 1, sprint: true }, 30);
  assert.equal(JSON.stringify(s), before);
  assert.ok(sprint.players[9].x > walk.players[9].x);
  assert.ok(sprint.players[9].stamina < 100);
  const slowed = step(sprint, {}, 30);
  assert.ok(Math.abs(slowed.players[9].vx) < Math.abs(sprint.players[9].vx));
});
test("pass, through ball and lob release the ball with distinct trajectories", () => {
  for (const action of ["pass", "through", "lob"]) {
    const s = step(play(), { [action]: true });
    assert.equal(s.ball.owner, null);
    assert.ok(Math.hypot(s.ball.vx, s.ball.vz) > 15);
    assert.ok(s.players[9].kick > 0);
    if (action === "lob") assert.ok(s.ball.vy > 6);
  }
});
test("charging a shot increases launch speed, creates a shot and clears the charge", () => {
  const s = step(play(), { shootHeld: true }, 45);
  assert.ok(s.charge > 0.7);
  const shot = step(s, { shoot: true });
  assert.equal(shot.ball.owner, null);
  assert.ok(Math.hypot(shot.ball.vx, shot.ball.vz) > 28);
  assert.equal(shot.shots[0], 1);
  assert.equal(shot.charge, 0);
});
test("standing tackle, shielding and body feint provide different possession outcomes", () => {
  const setup = () => {
    const s = play();
    s.ball.cooldown = 0;
    s.players[9].x = 0;
    s.players[9].z = 0;
    s.players[20].x = 1;
    s.players[20].z = 0;
    s.ball.x = 0;
    s.ball.z = 0;
    return s;
  };
  assert.equal(step(setup(), { shield: true }).ball.owner, 9);
  assert.notEqual(step(setup()).ball.owner, 9);
  const feint = step(setup(), { skill: true });
  assert.equal(feint.ball.owner, 9);
  assert.ok(feint.players[9].stamina < 100);
  assert.ok(feint.players[9].skill > 0);
  const s = setup();
  s.ball.owner = 20;
  s.ball.x = 1;
  assert.equal(step(s, { tackle: true }).ball.owner, 9);
});
test("body collisions separate players and switching excludes the goalkeeper", () => {
  const s = play();
  s.players[9].x = 10;
  s.players[9].z = 0;
  s.players[20].x = 10;
  s.players[20].z = 0;
  const n = step(s);
  assert.ok(
    Math.hypot(
      n.players[9].x - n.players[20].x,
      n.players[9].z - n.players[20].z,
    ) > 0.8,
  );
  const switched = step(s, { switch: true });
  assert.notEqual(switched.selected, s.selected);
  assert.equal(switched.players[switched.selected].team, 0);
  assert.equal(switched.players[switched.selected].keeper, false);
});
test("goals count once, include a celebration pause and give kickoff to the conceding side", () => {
  for (const [x, scorer] of [
    [53, 0],
    [-53, 1],
  ]) {
    const s = play();
    s.ball = {
      x,
      y: 1,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      owner: null,
      lastTouch: scorer,
      cooldown: 1,
    };
    let n = step(s);
    assert.equal(n.score[scorer], 1);
    assert.equal(n.phase, "goal");
    const elapsed = n.elapsed;
    n = step(n, {}, 190);
    assert.equal(n.score[scorer], 1);
    assert.ok(n.elapsed < elapsed + 0.3);
    assert.equal(n.players[n.ball.owner].team, 1 - scorer);
  }
});
test("high/wide balls and sideline exits restart without awarding a goal", () => {
  for (const ball of [
    { x: 53, y: 4, z: 0 },
    { x: 53, y: 1, z: 6 },
    { x: 20, y: 0.3, z: 35 },
  ]) {
    const s = play();
    Object.assign(s.ball, ball, { owner: null, cooldown: 1, lastTouch: 1 });
    const n = step(s);
    assert.deepEqual(n.score, [0, 0]);
    assert.equal(n.phase, "restart");
    assert.equal(n.ball.lastTouch, 0);
    assert.equal(n.ball.owner, n.selected);
  }
});
test("keepers catch low balls and distribute without trapping the controlled player", () => {
  const s = play();
  s.ball.owner = 0;
  s.ball.cooldown = 0;
  s.ball.x = -48;
  s.selected = 0;
  const n = step(s, {}, 65);
  assert.notEqual(n.selected, 0);
  assert.equal(n.ball.owner, null);
  assert.ok(n.ball.vx > 0);
});
test("full time is terminal and a complete idle match stays finite and bounded", () => {
  let s = play();
  for (let i = 0; i < 15000 && s.phase !== "fulltime"; i++) s = step(s);
  assert.equal(s.elapsed, FOOTBALL_DURATION);
  assert.equal(s.phase, "fulltime");
  assert.equal(step(s, { shoot: true, x: 1 }), s);
  assert.ok(
    s.players.every(
      (p) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.z) &&
        Math.abs(p.x) <= 51.5 &&
        Math.abs(p.z) <= 33.5,
    ),
  );
  assert.ok(Number.isFinite(s.ball.y));
  console.log("Idle exhibition score:", s.score.join("–"));
});

test("an aimed shot from the box can beat the keeper under normal ball physics", () => {
  const s = play();
  s.players[9].x = 35;
  s.players[9].z = -7;
  s.ball.x = 35;
  s.ball.z = -7;
  s.charge = 0.8;
  let shot = step(s, { shoot: true, z: -1 });
  for (let i = 0; i < 180 && shot.phase === "playing"; i++) shot = step(shot);
  assert.equal(shot.score[0], 1);
  assert.equal(shot.phase, "goal");
});
