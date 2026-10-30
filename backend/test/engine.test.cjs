const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  newSeason,
  validLineup,
  autoLineup,
  playRound,
  standings,
} = require("../dist/game/engine");
const players = [
  "GK",
  "GK",
  ...Array(6).fill("DEF"),
  ...Array(6).fill("MID"),
  ...Array(4).fill("FWD"),
].map((position, i) => ({
  id: `p${i}`,
  position,
  overall: 60 + i,
  firstName: "A",
  lastName: `P${i}`,
  age: 22,
}));
const team = { id: "mine", name: "My Club" };
test("all formations produce eleven unique players with positional counts", () => {
  for (const f of ["4-4-2", "4-3-3", "3-5-2"])
    assert.equal(validLineup(players, autoLineup(players, f), f), true);
  const ids = autoLineup(players, "4-4-2");
  assert.equal(
    validLineup(players, [...ids.slice(0, 10), ids[0]], "4-4-2"),
    false,
  );
  assert.equal(
    validLineup(players, [...ids.slice(0, 10), "outsider"], "4-4-2"),
    false,
  );
  assert.equal(validLineup(players, ids.slice(1), "4-4-2"), false);
  assert.equal(validLineup(players, ids, "4-3-3"), false);
});
test("double round robin has 30 fixtures, ten rounds, each pair home and away", () => {
  const s = newSeason(team, players);
  assert.equal(s.fixtures.length, 30);
  assert.equal(new Set(s.fixtures.map((f) => f.id)).size, 30);
  for (let round = 1; round <= 10; round++) {
    const fs = s.fixtures.filter((f) => f.round === round);
    assert.equal(fs.length, 3);
    assert.equal(new Set(fs.flatMap((f) => [f.home, f.away])).size, 6);
  }
  for (const a of s.clubs)
    for (const b of s.clubs)
      if (a !== b)
        assert.equal(
          s.fixtures.filter((f) => f.home === a.id && f.away === b.id).length,
          1,
        );
});
test("one click completes only next round; full season standings balance", () => {
  const s = newSeason(team, players);
  let seed = 14;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let round = 1; round <= 10; round++) {
    assert.equal(playRound(s, team.id, players, rng), round);
    assert.equal(
      s.fixtures.filter((f) => f.homeGoals !== null).length,
      round * 3,
    );
  }
  const rows = standings(s);
  assert.equal(
    rows.reduce((n, r) => n + r.gf, 0),
    rows.reduce((n, r) => n + r.ga, 0),
  );
  for (const r of rows) {
    assert.equal(r.played, 10);
    assert.equal(r.won + r.drawn + r.lost, 10);
    assert.equal(r.points, r.won * 3 + r.drawn);
  }
  assert.throws(() => playRound(s, team.id, players), /Season complete/);
});
test("draws, wins, losses and goal difference are calculated from completed fixtures only", () => {
  const s = newSeason(team, players);
  const f = s.fixtures[0];
  f.homeGoals = 3;
  f.awayGoals = 1;
  let rows = standings(s);
  assert.equal(rows.find((r) => r.id === f.home).points, 3);
  assert.equal(rows.find((r) => r.id === f.away).lost, 1);
  f.homeGoals = 1;
  rows = standings(s);
  assert.equal(rows.find((r) => r.id === f.home).drawn, 1);
  assert.equal(rows.find((r) => r.id === f.away).points, 1);
});
test("invalid XI blocks simulation without modifying fixtures", () => {
  const s = newSeason(team, players);
  s.lineup = [];
  assert.throws(() => playRound(s, team.id, players), /starting XI/);
  assert.ok(s.fixtures.every((f) => f.homeGoals === null));
});
