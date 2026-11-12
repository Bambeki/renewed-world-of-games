const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  newLudo,
  rollLudo,
  moveLudo,
  ludoMoves,
  ludoSquare,
  ludoPosition,
  LUDO_TRACK,
  LUDO_COLORS,
  parseLudo,
} = require("../dist/ludo");
test("setup supports 2–4 players and opposite colours for two players", () => {
  for (const count of [2, 3, 4]) {
    const s = newLudo(count, [" Alex "]);
    assert.equal(s.players.length, count);
    assert.equal(s.players[0].name, "Alex");
    assert.ok(
      s.players.every(
        (p) => p.tokens.length === 4 && p.tokens.every((t) => t === -1),
      ),
    );
    assert.ok(parseLudo(JSON.stringify(s)));
  }
  assert.deepEqual(
    newLudo(2).players.map((p) => p.color),
    ["red", "yellow"],
  );
  assert.throws(() => newLudo(1));
});
test("six required to enter; a legal roll cannot be rolled again", () => {
  const initial = newLudo(2);
  let s = rollLudo(initial, 3);
  assert.equal(s.current, 1);
  assert.equal(s.die, null);
  assert.equal(initial.current, 0);
  s = rollLudo(s, 6);
  assert.deepEqual(ludoMoves(s), [0, 1, 2, 3]);
  assert.throws(() => rollLudo(s, 2));
  s = moveLudo(s, 0);
  assert.equal(s.players[1].tokens[0], 0);
  assert.equal(s.current, 1);
  assert.equal(s.die, null);
  s = moveLudo(rollLudo(s, 4), 0);
  assert.equal(s.players[1].tokens[0], 4);
  assert.equal(s.current, 0);
  for (const die of [0, 7, 1.2, NaN])
    assert.throws(() => rollLudo(initial, die));
});
test("capture uses shared board coordinates; safe squares protect all tokens", () => {
  let s = newLudo(2);
  s.players[0].tokens[0] = 0;
  s.players[1].tokens[0] = 27; // physical square 1
  s = moveLudo(rollLudo(s, 1), 0);
  assert.equal(s.players[1].tokens[0], -1);
  s = newLudo(2);
  s.players[0].tokens[0] = 7;
  s.players[1].tokens[0] = 34; // physical safe square 8
  s = moveLudo(rollLudo(s, 1), 0);
  assert.equal(s.players[1].tokens[0], 34);
  assert.equal(s.players[0].tokens[0], 8);
});
test("home lanes are private; exact finish and finished tokens enforced", () => {
  let s = newLudo(2);
  s.players[0].tokens = [55, 56, 56, 56];
  assert.deepEqual(ludoMoves(rollLudo(s, 1)), [0]);
  assert.deepEqual(ludoMoves(rollLudo(s, 2)), []);
  s = moveLudo(rollLudo(s, 1), 0);
  assert.equal(s.winner, "red");
  assert.equal(s.current, 0);
  assert.equal(s.die, null);
  assert.throws(() => rollLudo(s, 6));
  assert.throws(() => moveLudo(s, 0));
  assert.ok(parseLudo(JSON.stringify(s)));
  assert.equal(ludoSquare("red", 51), null);
});
test("no-move roll passes turn, except a six grants another roll", () => {
  let s = newLudo(2);
  s.players[0].tokens = [55, 55, 55, 55];
  s = rollLudo(s, 6);
  assert.equal(s.current, 0);
  assert.equal(s.die, null);
  s = rollLudo(s, 2);
  assert.equal(s.current, 1);
  assert.equal(s.die, null);
  assert.throws(() => moveLudo(s, 0));
});
test("track geometry is unique, wraps correctly and every colour enters its home lane", () => {
  assert.equal(LUDO_TRACK.length, 52);
  assert.equal(new Set(LUDO_TRACK.map(String)).size, 52);
  for (const color of LUDO_COLORS) {
    for (let step = 0; step <= 56; step++) {
      const [r, c] = ludoPosition(color, step, 0);
      assert.ok(r >= 0 && r < 15 && c >= 0 && c < 15);
    }
    const a = ludoPosition(color, 50, 0),
      b = ludoPosition(color, 51, 0);
    assert.equal(Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), 1);
  }
  assert.equal(ludoSquare("blue", 14), 1);
});
test("bad saves are rejected, including invalid winners and impossible pending rolls", () => {
  const valid = newLudo(2);
  assert.equal(parseLudo("{"), null);
  for (const change of [
    (s) => (s.version = 2),
    (s) => (s.current = 3),
    (s) => (s.players[0].tokens = [-2, 0, 0, 0]),
    (s) => (s.players[0].color = "blue"),
    (s) => (s.die = 8),
    (s) => (s.winner = "red"),
    (s) => (s.players[0].tokens = [56, 56, 56, 56]),
    (s) => (s.history = [{}]),
    (s) => (s.die = 1),
  ]) {
    const s = structuredClone(valid);
    change(s);
    assert.equal(parseLudo(JSON.stringify(s)), null);
  }
});
test("complete seeded games reach a winner while preserving token bounds and snapshots", () => {
  for (const count of [2, 3, 4]) {
    let s = newLudo(count),
      seed = 37,
      moves = 0;
    const nextRand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed;
    };
    while (!s.winner && moves++ < 10000) {
      s = rollLudo(s, (nextRand() % 6) + 1);
      const legal = ludoMoves(s);
      if (legal.length) s = moveLudo(s, legal[nextRand() % legal.length]);
      assert.ok(parseLudo(JSON.stringify(s)));
      assert.ok(
        s.players.every((p) => p.tokens.every((t) => t >= -1 && t <= 56)),
      );
    }
    assert.ok(s.winner, `${count}-player game should finish`);
    assert.ok(
      s.players.find((p) => p.color === s.winner).tokens.every((t) => t === 56),
    );
  }
});
