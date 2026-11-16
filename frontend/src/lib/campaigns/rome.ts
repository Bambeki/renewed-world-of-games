export type LegionKind = "legionary" | "archer" | "cavalry";
export type RomanUnit = {
  id: number;
  side: 0 | 1;
  kind: LegionKind;
  x: number;
  y: number;
  hp: number;
  moved: boolean;
  attacked: boolean;
};
export type RomeState = {
  version: 1;
  mission: number;
  units: RomanUnit[];
  selected: number | null;
  round: number;
  gold: number;
  fort: number;
  status: "playing" | "won" | "lost";
  message: string;
  nextId: number;
};
export const ROMAN_MISSIONS = [
  {
    name: "Guard the crossing",
    brief:
      "Secure the frontier. Defeat the raiders before they destroy your fort.",
    enemy: 3,
  },
  {
    name: "The broken road",
    brief:
      "A larger force holds the supply road. Use archers behind your legionaries.",
    enemy: 4,
  },
  {
    name: "The last standard",
    brief:
      "Hold the fort through a final assault. Cavalry can outflank the opposing line.",
    enemy: 5,
  },
];
export const UNIT_RULES = {
  legionary: { hp: 10, damage: 4, range: 1, move: 2, cost: 7 },
  archer: { hp: 7, damage: 3, range: 3, move: 2, cost: 8 },
  cavalry: { hp: 9, damage: 4, range: 1, move: 3, cost: 10 },
};
export const romanBlocked = (x: number, y: number) =>
  (x === 4 && (y === 0 || y === 1 || y === 5 || y === 6)) ||
  (x === 2 && y === 0) ||
  (x === 6 && y === 6);
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export function newRome(mission = 0): RomeState {
  if (!ROMAN_MISSIONS[mission]) throw new Error("Unknown campaign battle");
  const units: RomanUnit[] = [
    {
      id: 1,
      side: 0,
      kind: "legionary",
      x: 1,
      y: 2,
      hp: 10,
      moved: false,
      attacked: false,
    },
    {
      id: 2,
      side: 0,
      kind: "archer",
      x: 1,
      y: 4,
      hp: 7,
      moved: false,
      attacked: false,
    },
  ];
  for (let i = 0; i < ROMAN_MISSIONS[mission].enemy; i++) {
    const kind = i === 1 ? "archer" : "legionary";
    units.push({
      id: 10 + i,
      side: 1,
      kind,
      x: 7 + (i % 2),
      y: 1 + i,
      hp: UNIT_RULES[kind].hp,
      moved: false,
      attacked: false,
    });
  }
  return {
    version: 1,
    mission,
    units,
    selected: 1,
    round: 1,
    gold: 12,
    fort: 20,
    status: "playing",
    message: ROMAN_MISSIONS[mission].brief,
    nextId: 30,
  };
}
export function romanPath(
  s: RomeState,
  unit: RomanUnit,
  x: number,
  y: number,
): number | null {
  if (
    x < 0 ||
    x >= 9 ||
    y < 0 ||
    y >= 7 ||
    romanBlocked(x, y) ||
    s.units.some((u) => u.id !== unit.id && u.x === x && u.y === y)
  )
    return null;
  const queue = [{ x: unit.x, y: unit.y, n: 0 }],
    seen = new Set([`${unit.x},${unit.y}`]);
  while (queue.length) {
    const p = queue.shift()!;
    if (p.x === x && p.y === y) return p.n;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = p.x + dx,
        ny = p.y + dy,
        key = `${nx},${ny}`;
      if (
        nx < 0 ||
        nx >= 9 ||
        ny < 0 ||
        ny >= 7 ||
        seen.has(key) ||
        romanBlocked(nx, ny) ||
        s.units.some((u) => u.id !== unit.id && u.x === nx && u.y === ny)
      )
        continue;
      seen.add(key);
      queue.push({ x: nx, y: ny, n: p.n + 1 });
    }
  }
  return null;
}
function finish(s: RomeState) {
  s.units = s.units.filter((u) => u.hp > 0);
  s.fort = Math.max(0, s.fort);
  if (!s.units.some((u) => u.side === 1)) {
    s.status = "won";
    s.message = "Victory. The standard holds; the frontier is secure.";
  } else if (s.fort <= 0 || s.round > 18) {
    s.status = "lost";
    s.message =
      "The fort has fallen or supplies have run out. Retry the battle.";
  }
  if (!s.units.some((u) => u.id === s.selected)) s.selected = null;
  return s;
}
export type RomeAction =
  | { type: "select"; id: number }
  | { type: "cell"; x: number; y: number }
  | { type: "recruit"; kind: LegionKind }
  | { type: "end" };
export function romeAction(old: RomeState, action: RomeAction): RomeState {
  if (old.status !== "playing") return old;
  const s: RomeState = { ...old, units: old.units.map((u) => ({ ...u })) };
  if (action.type === "select") {
    if (s.units.some((u) => u.id === action.id && u.side === 0))
      s.selected = action.id;
    return s;
  }
  if (action.type === "recruit") {
    const rule = UNIT_RULES[action.kind];
    if (!rule) return old;
    const cell = [
      [0, 3],
      [0, 2],
      [0, 4],
    ].find(([x, y]) => !s.units.some((u) => u.x === x && u.y === y));
    if (
      !cell ||
      s.gold < rule.cost ||
      s.units.filter((u) => u.side === 0).length >= 6
    ) {
      s.message =
        "Recruitment needs enough gold, a free western deployment tile, and fewer than six units.";
      return s;
    }
    const unit: RomanUnit = {
      id: s.nextId++,
      side: 0,
      kind: action.kind,
      x: cell[0],
      y: cell[1],
      hp: rule.hp,
      moved: true,
      attacked: true,
    };
    s.units.push(unit);
    s.gold -= rule.cost;
    s.selected = unit.id;
    s.message = "Reinforcement arrives. It can act next round.";
    return s;
  }
  if (action.type === "cell") {
    const target = s.units.find((u) => u.x === action.x && u.y === action.y);
    if (target?.side === 0) {
      s.selected = target.id;
      return s;
    }
    const unit = s.units.find((u) => u.id === s.selected && u.side === 0);
    if (!unit) {
      s.message = "Select a surviving Roman unit before giving an order.";
      return s;
    }
    if (target) {
      if (
        unit.attacked ||
        distance(unit, target) > UNIT_RULES[unit.kind].range
      ) {
        s.message =
          "Target is outside attack range, or this unit has already attacked.";
        return s;
      }
      const damage =
        UNIT_RULES[unit.kind].damage +
        (unit.kind === "cavalry" && target.kind === "archer" ? 2 : 0);
      target.hp -= damage;
      unit.attacked = true;
      s.message = `Your ${unit.kind} deals ${damage} damage.`;
      if (target.hp <= 0) s.gold += 3;
      return finish(s);
    }
    const path = romanPath(s, unit, action.x, action.y);
    if (unit.moved || path === null || path > UNIT_RULES[unit.kind].move) {
      s.message =
        "Move is blocked, too far, or already used. Rivers can only be crossed through the central passage.";
      return s;
    }
    unit.x = action.x;
    unit.y = action.y;
    unit.moved = true;
    s.message =
      "Unit moves. It can still attack if it has not attacked this round.";
    return s;
  }
  for (const enemy of s.units.filter((u) => u.side === 1 && u.hp > 0)) {
    const target = s.units
      .filter((u) => u.side === 0 && u.hp > 0)
      .sort(
        (a, b) => distance(enemy, a) - distance(enemy, b) || a.id - b.id,
      )[0];
    const range = UNIT_RULES[enemy.kind].range;
    if (target && distance(enemy, target) <= range) {
      target.hp -= UNIT_RULES[enemy.kind].damage;
      s.message = "The enemy strikes your line.";
      continue;
    }
    if (distance(enemy, { x: 0, y: 3 }) <= 1) {
      s.fort -= 4;
      continue;
    }
    const destinations = [];
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 9; x++) {
        const n = romanPath(s, enemy, x, y);
        if (n !== null && n > 0 && n <= UNIT_RULES[enemy.kind].move)
          destinations.push({
            x,
            y,
            d: distance({ x, y }, target || { x: 0, y: 3 }),
          });
      }
    destinations.sort((a, b) => a.d - b.d || a.x - b.x || a.y - b.y);
    if (destinations[0]) {
      enemy.x = destinations[0].x;
      enemy.y = destinations[0].y;
    }
  }
  s.round++;
  s.gold += 4;
  s.units.forEach((u) => {
    u.moved = false;
    u.attacked = false;
  });
  s.message = `Round ${s.round}. Four gold arrives from the supply road.`;
  return finish(s);
}
export function readRome(value: unknown): RomeState | null {
  if (!value || typeof value !== "object") return null;
  const s = value as RomeState;
  if (
    s.version !== 1 ||
    !Number.isInteger(s.mission) ||
    s.mission < 0 ||
    s.mission > 2 ||
    !["playing", "won", "lost"].includes(s.status) ||
    !Number.isInteger(s.round) ||
    s.round < 1 ||
    s.round > 19 ||
    !Number.isInteger(s.gold) ||
    s.gold < 0 ||
    s.gold > 500 ||
    !Number.isInteger(s.fort) ||
    s.fort < -10 ||
    s.fort > 20 ||
    !Number.isInteger(s.nextId) ||
    s.nextId < 30 ||
    s.nextId > 500 ||
    !(s.selected === null || Number.isInteger(s.selected)) ||
    typeof s.message !== "string" ||
    s.message.length > 1000
  )
    return null;
  if (
    !Array.isArray(s.units) ||
    s.units.length > 12 ||
    s.units.some((u) => !u || typeof u !== "object") ||
    new Set(s.units.map((u) => u.id)).size !== s.units.length ||
    new Set(s.units.map((u) => `${u.x},${u.y}`)).size !== s.units.length
  )
    return null;
  if (
    s.units.some(
      (u) =>
        !u ||
        !Number.isInteger(u.id) ||
        (u.side !== 0 && u.side !== 1) ||
        !Object.hasOwn(UNIT_RULES, u.kind) ||
        !Number.isInteger(u.hp) ||
        u.hp < 1 ||
        u.hp > UNIT_RULES[u.kind].hp ||
        !Number.isInteger(u.x) ||
        !Number.isInteger(u.y) ||
        u.x < 0 ||
        u.x > 8 ||
        u.y < 0 ||
        u.y > 6 ||
        romanBlocked(u.x, u.y) ||
        typeof u.moved !== "boolean" ||
        typeof u.attacked !== "boolean",
    )
  )
    return null;
  return { ...s, units: s.units.map((u) => ({ ...u })) };
}
