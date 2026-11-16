// Requires a migrated test database and running API. Creates isolated test accounts.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const base = process.env.API_URL || "http://localhost:4001/api/v1";
const password = "TestOnly-2026!";
async function req(path, token, body, method = "POST") {
  const res = await fetch(base + path, {
    method: body ? method : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}
async function account(suffix) {
  const key = `test${Date.now()}${suffix}`;
  const email = `${key}@example.com`;
  assert.equal(
    (await req("/auth/register", null, { email, username: key, password }))
      .status,
    201,
  );
  const login = await req("/auth/login", null, { email, password });
  assert.equal(login.status, 201);
  return login.data.access_token;
}
test("authenticated manager journey, persistence, isolation and invalid mutations", async () => {
  const token = await account("a"),
    other = await account("b");
  assert.equal((await req("/game")).status, 401);
  const initial = await req("/game", token);
  assert.equal(initial.status, 200);
  let g = initial.data;
  assert.equal(g.players.length, 18);
  assert.equal(g.season.lineup.length, 11);
  assert.equal(g.team.budget, 1000000);
  const originalIds = g.players.map((p) => p.id);
  const roster = await req("/players", token);
  assert.equal(roster.data.length, 18);
  assert.equal(roster.data.filter((p) => p.isStarter).length, 11);
  assert.equal((await req(`/players/${g.players[0].id}`, token)).status, 200);
  assert.equal((await req(`/players/${g.players[0].id}`, other)).status, 404);
  assert.equal((await req("/players/not-a-uuid", token)).status, 404);
  assert.equal(
    (
      await req(
        "/teams/my-team",
        token,
        { name: "Journey FC", shortName: "JFC" },
        "PATCH",
      )
    ).status,
    200,
  );
  assert.equal((await req("/game", token)).data.team.name, "Journey FC");
  assert.equal((await req("/game/play", token, { revision: -1 })).status, 400);
  assert.equal(
    (
      await req("/game/play", token, {
        revision: g.season.revision,
        teamId: "other",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req(
        "/game/lineup",
        token,
        {
          revision: 0,
          formation: "4-4-2",
          playerIds: Array(11).fill(g.players[0].id),
        },
        "PUT",
      )
    ).status,
    400,
  );
  const otherState = (await req("/game", other)).data;
  assert.equal(
    (
      await req(
        "/game/lineup",
        token,
        {
          revision: 0,
          formation: "4-4-2",
          playerIds: otherState.season.lineup,
        },
        "PUT",
      )
    ).status,
    400,
  );
  const ids = ["GK", "DEF", "MID", "FWD"].flatMap((pos, i) =>
    g.players
      .filter((p) => p.position === pos)
      .slice(0, [1, 4, 3, 3][i])
      .map((p) => p.id),
  );
  let r = await req(
    "/game/lineup",
    token,
    { revision: 0, formation: "4-3-3", playerIds: ids },
    "PUT",
  );
  assert.equal(r.status, 200);
  g = r.data;
  const reload = (await req("/game", token)).data;
  assert.deepEqual(reload.season.lineup, ids);
  assert.equal(reload.season.formation, "4-3-3");
  const attempts = await Promise.all([
    req("/game/play", token, { revision: g.season.revision }),
    req("/game/play", token, { revision: g.season.revision }),
  ]);
  assert.deepEqual(attempts.map((r) => r.status).sort(), [201, 409]);
  g = (await req("/game", token)).data;
  assert.equal(g.season.fixtures.filter((f) => f.homeGoals !== null).length, 3);
  assert.equal(g.standings.find((s) => s.id === g.team.id).played, 1);
  assert.equal(
    (await req("/game", other)).data.season.fixtures.filter(
      (f) => f.homeGoals !== null,
    ).length,
    0,
  );
  const target = g.season.market[0],
    before = g.team.budget;
  r = await req("/game/buy", token, {
    revision: g.season.revision,
    playerId: target.id,
  });
  assert.equal(r.status, 201);
  g = r.data;
  assert.equal(g.team.budget, before - target.price);
  assert.equal(g.players.length, 19);
  assert.ok(g.players.some((p) => p.id === target.id));
  assert.equal((await req(`/players/${target.id}`, token)).status, 200);
  assert.equal(
    (
      await req("/game/buy", token, {
        revision: g.season.revision,
        playerId: target.id,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req("/game/sell", token, {
        revision: g.season.revision,
        playerId: g.season.lineup[0],
      })
    ).status,
    400,
  );
  assert.equal(
    (await req("/game/sell", other, { revision: 0, playerId: target.id }))
      .status,
    404,
  );
  r = await req("/game/sell", token, {
    revision: g.season.revision,
    playerId: target.id,
  });
  assert.equal(r.status, 201);
  g = r.data;
  assert.equal(g.team.budget, before - target.price + target.overall * 2000);
  assert.equal(g.players.length, 18);
  assert.equal((await req(`/players/${target.id}`, token)).status, 404);
  // Spend budget and verify atomic refusal when funds are insufficient.
  for (const p of [...g.season.market]) {
    const budget = g.team.budget;
    const buy = await req("/game/buy", token, {
      revision: g.season.revision,
      playerId: p.id,
    });
    if (p.price > budget) {
      assert.equal(buy.status, 400);
      assert.equal((await req("/game", token)).data.team.budget, budget);
    } else {
      assert.equal(buy.status, 201);
      g = buy.data;
    }
  }
  for (let i = 1; i < 10; i++) {
    r = await req("/game/play", token, { revision: g.season.revision });
    assert.equal(r.status, 201);
    g = r.data;
  }
  assert.ok(g.season.fixtures.every((f) => f.homeGoals !== null));
  assert.ok(g.standings.every((s) => s.played === 10));
  assert.equal(
    (await req("/game/play", token, { revision: g.season.revision })).status,
    400,
  );
  assert.ok(originalIds.every((id) => g.players.some((p) => p.id === id)));
  assert.deepEqual((await req("/game", token)).data.season, g.season);
});

test("empty legacy clubs recover once without resetting club or season", async () => {
  const { PrismaClient } = require("@prisma/client");
  const db = new PrismaClient();
  try {
    for (const existingSeason of [false, true]) {
      const token = await account(`legacy${existingSeason}`);
      const userId = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url"),
      ).sub;
      const team = await db.team.findUniqueOrThrow({
        where: { ownerId: userId },
      });
      let before;
      if (existingSeason) before = (await req("/game", token)).data.season;
      await db.player.deleteMany({ where: { teamId: team.id } });
      const responses = await Promise.all([
        req("/game", token),
        req("/game", token),
      ]);
      for (const response of responses) {
        assert.equal(response.status, 200);
        assert.equal(response.data.players.length, 18);
        assert.equal(response.data.season.lineup.length, 11);
        assert.equal(response.data.team.name, team.name);
        assert.equal(response.data.team.budget, team.budget);
        if (before) {
          assert.deepEqual(response.data.season.fixtures, before.fixtures);
          assert.deepEqual(response.data.season.market, before.market);
          assert.equal(response.data.season.revision, before.revision + 1);
        }
      }
      const recovered = responses[0].data;
      const reload = (await req("/game", token)).data;
      assert.deepEqual(reload.season, recovered.season);
      assert.deepEqual(
        reload.players.map((p) => p.id).sort(),
        recovered.players.map((p) => p.id).sort(),
      );
      assert.equal(await db.player.count({ where: { teamId: team.id } }), 18);
      assert.equal(
        (await req("/players", token)).data.filter((p) => p.isStarter).length,
        11,
      );
      assert.equal(
        (
          await req("/game/play", token, {
            revision: recovered.season.revision,
          })
        ).status,
        201,
      );
    }
    const token = await account("preserve");
    const initial = (await req("/game", token)).data;
    const keep = initial.players[0].id;
    await db.player.deleteMany({
      where: { teamId: initial.team.id, id: { not: keep } },
    });
    assert.deepEqual(
      (await req("/game", token)).data.players.map((p) => p.id),
      [keep],
    );
    await db.player.deleteMany({ where: { teamId: initial.team.id } });
    const playedSeason = initial.season;
    playedSeason.fixtures[0].homeGoals = 1;
    playedSeason.fixtures[0].awayGoals = 0;
    await db.gameState.update({
      where: { teamId: initial.team.id },
      data: { payload: playedSeason },
    });
    const played = (await req("/game", token)).data;
    assert.equal(played.players.length, 0);
    assert.deepEqual(played.season, playedSeason);
  } finally {
    await db.$disconnect();
  }
});
