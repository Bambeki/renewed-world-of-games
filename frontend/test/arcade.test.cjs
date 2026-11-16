/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness loads the simulation as CommonJS. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const path = require("node:path");
const filename = path.resolve(__dirname, "../src/lib/arcade.ts");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const mod = new Module(filename, module);
mod._compile(compiled, filename);
const { createArcade, stepArcade, MATCH_SECONDS } = mod.exports;
const idle = { x: 0, y: 0, shoot: false, pass: false, switch: false };
test("movement is normalized, bounded and immutable", () => {
  const initial = createArcade();
  const before = JSON.stringify(initial);
  const straight = stepArcade(initial, { ...idle, x: 1 }, 0.05);
  const diagonal = stepArcade(initial, { ...idle, x: 1, y: 1 }, 0.05);
  assert.equal(JSON.stringify(initial), before);
  assert.ok(
    Math.abs(
      Math.hypot(diagonal.players[5].x - 49, diagonal.players[5].y - 32) -
        (straight.players[5].x - 49),
    ) < 0.001,
  );
  assert.ok(straight.players[5].x > initial.players[5].x);
});
test("shoot and pass release the owned ball, switching selects a green player", () => {
  for (const control of ["shoot", "pass"]) {
    const next = stepArcade(createArcade(), { ...idle, [control]: true }, 0.01);
    assert.equal(next.ball.owner, null);
    assert.ok(Math.hypot(next.ball.vx, next.ball.vy) > 30);
  }
  const s = createArcade();
  s.ball.owner = 7;
  const n = stepArcade(s, { ...idle, switch: true }, 0.01);
  assert.notEqual(n.selected, s.selected);
  assert.equal(n.players[n.selected].team, 0);
});
test("both goals count once, restart possession and keep independent scores", () => {
  for (const [x, team] of [
    [100.5, 0],
    [-0.5, 1],
  ]) {
    const s = createArcade();
    s.ball = { x, y: 32, vx: 0, vy: 0, owner: null, cooldown: 1 };
    const n = stepArcade(s, idle, 0.01);
    assert.equal(n.score[team], 1);
    assert.equal(n.kickoffs, 1);
    assert.notEqual(n.ball.owner, null);
    assert.deepEqual(stepArcade(n, idle, 0.01).score, n.score);
  }
});
test("wide shots do not score and wall rebounds stay in bounds", () => {
  const s = createArcade();
  s.ball = { x: 101, y: 10, vx: 20, vy: 0, owner: null, cooldown: 1 };
  const n = stepArcade(s, idle, 0.02);
  assert.deepEqual(n.score, [0, 0]);
  assert.ok(n.ball.x <= 100);
  assert.ok(n.ball.vx < 0);
});
test("120 seconds end the match and finished games cannot advance", () => {
  let s = createArcade();
  for (let i = 0; i < 2401; i++) s = stepArcade(s, idle, 0.05);
  assert.equal(s.elapsed, MATCH_SECONDS);
  assert.equal(s.remaining, 0);
  assert.equal(s.finished, true);
  assert.equal(stepArcade(s, { ...idle, shoot: true, x: 1 }, 0.05), s);
  assert.ok(
    s.players.every(
      (p) =>
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        p.x >= 1 &&
        p.x <= 99 &&
        p.y >= 1 &&
        p.y <= 63,
    ),
  );
  assert.deepEqual(createArcade().score, [0, 0]);
});

test("a player can dribble around the defence and score using ordinary controls", () => {
  let s = createArcade();
  for (let i = 0; i < 80; i++) s = stepArcade(s, { ...idle, y: 1 }, 1 / 60);
  for (let i = 0; i < 120; i++) s = stepArcade(s, { ...idle, x: 1 }, 1 / 60);
  s = stepArcade(s, { ...idle, shoot: true }, 1 / 60);
  for (let i = 0; i < 180; i++) s = stepArcade(s, idle, 1 / 60);
  assert.equal(s.score[0], 1);
});
