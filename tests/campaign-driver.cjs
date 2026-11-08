const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  ts = require("typescript");
function loadEngine(name) {
  const file = path.resolve(
      __dirname,
      `../frontend/src/lib/campaigns/${name}.ts`,
    ),
    m = new Module(file, module);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
function adventurePlan(level) {
  const e = loadEngine("adventure");
  let s = e.newAdventure(level);
  const actions = [];
  const act = (a) => {
    s = e.adventureAction(s, a);
    actions.push(a);
  };
  function switchTo(i) {
    if (s.active !== i) act({ type: "switch" });
  }
  function walk(x, y) {
    const start = s.heroes[s.active],
      queue = [{ ...start, path: [] }],
      seen = new Set([`${start.x},${start.y}`]);
    let result;
    while (queue.length) {
      const p = queue.shift();
      if (p.x === x && p.y === y) {
        result = p.path;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]) {
        const nx = p.x + dx,
          ny = p.y + dy,
          key = `${nx},${ny}`,
          t = e.adventureTile(s, nx, ny);
        if (
          seen.has(key) ||
          t === "#" ||
          t === "X" ||
          t === "D" ||
          (t === "=" && !s.beacon)
        )
          continue;
        seen.add(key);
        queue.push({
          x: nx,
          y: ny,
          path: [...p.path, { type: "move", dx, dy }],
        });
      }
    }
    if (!result) throw Error(`No route ${level}:${x},${y}`);
    for (const a of result) act(a);
  }
  if (level === 0) {
    walk(3, 1);
    act({ type: "interact" });
    switchTo(1);
    walk(7, 2);
    act({ type: "interact" });
  }
  if (level === 1) {
    walk(4, 1);
    walk(7, 2);
    act({ type: "interact" });
    switchTo(1);
    walk(3, 5);
    act({ type: "interact" });
  }
  if (level === 2) {
    walk(2, 1);
    act({ type: "interact" });
    walk(6, 1);
    switchTo(1);
    walk(5, 5);
    act({ type: "interact" });
  }
  walk(11, 1);
  switchTo(0);
  walk(11, 1);
  return { state: s, actions };
}
function romanPlan(mission) {
  const e = loadEngine("rome");
  let s = e.newRome(mission);
  const actions = [];
  const act = (a) => {
    s = e.romeAction(s, a);
    actions.push(a);
  };
  const d = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  while (s.status === "playing" && s.round <= 18) {
    if (s.gold >= 7 && s.units.filter((u) => u.side === 0).length < 6) {
      act({ type: "recruit", kind: s.gold >= 8 ? "archer" : "legionary" });
    }
    const friends = s.units
      .filter((u) => u.side === 0 && !u.attacked)
      .sort((a, b) => a.x - b.x);
    for (const f of friends) {
      if (s.status !== "playing") break;
      act({ type: "select", id: f.id });
      let u = s.units.find((x) => x.id === f.id);
      if (!u) continue;
      let enemies = s.units
        .filter((x) => x.side === 1)
        .sort((a, b) => d(u, a) - d(u, b) || a.hp - b.hp);
      let target = enemies.find((x) => d(u, x) <= e.UNIT_RULES[u.kind].range);
      if (!target && !u.moved) {
        const cells = [];
        for (let y = 0; y < 7; y++)
          for (let x = 0; x < 9; x++) {
            const n = e.romanPath(s, u, x, y);
            if (n !== null && n > 0 && n <= e.UNIT_RULES[u.kind].move)
              cells.push({
                x,
                y,
                d: Math.min(...enemies.map((t) => d({ x, y }, t))),
              });
          }
        cells.sort((a, b) => a.d - b.d || b.x - a.x);
        if (cells[0]) act({ type: "cell", x: cells[0].x, y: cells[0].y });
        u = s.units.find((x) => x.id === f.id);
        target = enemies.find((x) => d(u, x) <= e.UNIT_RULES[u.kind].range);
      }
      if (target) act({ type: "cell", x: target.x, y: target.y });
    }
    if (s.status === "playing") act({ type: "end" });
  }
  return { state: s, actions };
}
module.exports = { loadEngine, adventurePlan, romanPlan };
