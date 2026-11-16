/* eslint-disable @typescript-eslint/no-require-imports -- Node test harness for pure campaign engines. */
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const {
  loadEngine,
  adventurePlan,
  romanPlan,
} = require("../../tests/campaign-driver.cjs");
const a = loadEngine("adventure"),
  r = loadEngine("rome");
test("all three adventure missions are completable through actual actions", () => {
  for (let i = 0; i < 3; i++) {
    const plan = adventurePlan(i);
    assert.equal(plan.state.status, "won", `mission ${i}`);
    assert.ok(plan.state.health > 0);
    assert.ok(plan.actions.length > 10);
    assert.ok(a.readAdventure(JSON.parse(JSON.stringify(plan.state))));
  }
});
test("adventure role abilities, walls and invalid movement preserve the prior state", () => {
  const s = a.newAdventure(),
    before = JSON.stringify(s);
  const n = a.adventureAction(s, { type: "move", dx: -1, dy: 0 });
  assert.deepEqual(n.heroes, s.heroes);
  assert.equal(JSON.stringify(s), before);
  assert.equal(a.adventureAction(s, { type: "move", dx: 2, dy: 1 }), s);
  assert.equal(a.adventureAction(s, { type: "interact" }).beacon, false);
});
test("adventure storm can cause defeat and retry starts clean", () => {
  let s = a.newAdventure();
  for (let i = 0; i < 145 && s.status === "playing"; i++)
    s = a.adventureAction(s, { type: "move", dx: i % 2 ? -1 : 1, dy: 0 });
  assert.equal(s.status, "lost");
  assert.equal(a.adventureAction(s, { type: "switch" }), s);
  assert.equal(a.newAdventure().health, 6);
});
test("reaching the exit without objectives cannot bypass storm defeat", () => {
  const s = a.newAdventure();
  s.heroes = [
    { x: 10, y: 1 },
    { x: 11, y: 2 },
  ];
  s.moves = 143;
  s.health = 1;
  const n = a.adventureAction(s, { type: "move", dx: 1, dy: 0 });
  assert.equal(n.health, 0);
  assert.equal(n.status, "lost");
  assert.ok(a.readAdventure(JSON.parse(JSON.stringify(n))));
});
test("all Roman campaign battles are winnable through legal moves and turns", () => {
  for (let i = 0; i < 3; i++) {
    const plan = romanPlan(i);
    assert.equal(
      plan.state.status,
      "won",
      `mission ${i}: ${plan.state.message}`,
    );
    assert.ok(plan.state.fort > 0);
    assert.ok(plan.state.round <= 18);
    assert.ok(r.readRome(JSON.parse(JSON.stringify(plan.state))));
  }
});
test("Roman movement cannot teleport, traverse blocked water or spend the same move twice", () => {
  const s = r.newRome(),
    before = JSON.stringify(s);
  assert.equal(r.romeAction(s, { type: "cell", x: 8, y: 6 }).units[0].x, 1);
  const n = r.romeAction(s, { type: "cell", x: 3, y: 2 });
  assert.equal(n.units[0].x, 3);
  assert.equal(r.romeAction(n, { type: "cell", x: 4, y: 2 }).units[0].x, 3);
  assert.equal(r.romanPath(s, s.units[0], 4, 0), null);
  assert.equal(JSON.stringify(s), before);
});
test("Roman attacks require range and are limited to once per round; recruitment conserves gold", () => {
  let s = r.newRome();
  s.units[2].x = 2;
  s.units[2].y = 2;
  const hit = r.romeAction(s, { type: "cell", x: 2, y: 2 });
  assert.equal(hit.units[2].hp, s.units[2].hp - 4);
  assert.equal(
    r.romeAction(hit, { type: "cell", x: 2, y: 2 }).units[2].hp,
    hit.units[2].hp,
  );
  const recruited = r.romeAction(s, { type: "recruit", kind: "archer" });
  assert.equal(recruited.gold, 4);
  assert.equal(recruited.units.length, s.units.length + 1);
  assert.ok(recruited.units.at(-1).attacked);
});
test("Roman turn limit provides a defeat condition", () => {
  let s = r.newRome();
  s.round = 18;
  const n = r.romeAction(s, { type: "end" });
  assert.equal(n.status, "lost");
  assert.equal(r.romeAction(n, { type: "end" }), n);
});
test("battlefield clicks can select a survivor after the selected unit dies", () => {
  const s = r.newRome();
  s.units[0].hp = 1;
  s.units[2].x = 2;
  s.units[2].y = 2;
  const afterAttack = r.romeAction(s, { type: "end" });
  assert.equal(afterAttack.selected, null);
  assert.ok(!afterAttack.units.some((u) => u.id === 1));
  const survivor = afterAttack.units.find((u) => u.id === 2);
  assert.ok(survivor);
  const selected = r.romeAction(afterAttack, {
    type: "cell",
    x: survivor.x,
    y: survivor.y,
  });
  assert.equal(selected.selected, 2);
  assert.equal(
    r
      .romeAction(selected, { type: "cell", x: 2, y: 4 })
      .units.find((u) => u.id === 2).x,
    2,
  );
});
test("save readers reject malformed coordinates, versions, unit kinds and corrupted payloads", () => {
  for (const reader of [a.readAdventure, r.readRome])
    for (const value of [null, [], {}, "bad", { version: 99 }])
      assert.equal(reader(value), null);
  assert.equal(
    a.readAdventure({
      ...a.newAdventure(),
      heroes: [
        { x: -1, y: 1 },
        { x: 1, y: 6 },
      ],
    }),
    null,
  );
  const s = r.newRome();
  s.units[0].kind = "__proto__";
  assert.equal(r.readRome(s), null);
});
