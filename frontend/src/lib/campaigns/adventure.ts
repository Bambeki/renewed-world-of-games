export const ADVENTURE_LEVELS = [
  {
    title: "The silent harbour",
    story:
      "A storm has cut off the island. Jack can shift fallen stone; Rose can repair the emergency beacon. Bring both explorers to the boat.",
    map: [
      "#############",
      "#J..X..B...E#",
      "#...#...#...#",
      "#...#...#...#",
      "#...#...#...#",
      "#...#...#...#",
      "#R..........#",
      "#############",
    ],
    objective:
      "Clear the rubble with Jack. Repair the beacon with Rose. Meet at the boat.",
  },
  {
    title: "The flooded archive",
    story:
      "The evacuation route is locked inside an old archive. Find the brass key and restore the bridge controls before the tide returns.",
    map: [
      "#############",
      "#J..K...#..E#",
      "#.......D...#",
      "#.......#...#",
      "#.......#...#",
      "#R..B...=...#",
      "#.......#...#",
      "#############",
    ],
    objective:
      "Find the key, unlock the archive door, and repair the bridge console. Bring both explorers to the exit.",
  },
  {
    title: "Last light on the ridge",
    story:
      "A missing surveyor is trapped behind a rockfall. The rescue signal is dark. Work together to guide the last survivor off the ridge.",
    map: [
      "#############",
      "#J.X..N....E#",
      "#...........#",
      "#...###.....#",
      "#...........#",
      "#R....B.....#",
      "#...........#",
      "#############",
    ],
    objective:
      "Jack must clear the rockfall. Rose must restore the signal. Reach the survivor, then meet at the exit.",
  },
] as const;
export type AdventureState = {
  version: 1;
  level: number;
  active: 0 | 1;
  heroes: [{ x: number; y: number }, { x: number; y: number }];
  removed: string[];
  key: boolean;
  beacon: boolean;
  rescued: boolean;
  moves: number;
  health: number;
  status: "playing" | "won" | "lost";
  message: string;
};
export type AdventureAction =
  | { type: "move"; dx: number; dy: number }
  | { type: "interact" }
  | { type: "switch" };
const id = (x: number, y: number) => `${x},${y}`;
export function newAdventure(level = 0): AdventureState {
  const map = ADVENTURE_LEVELS[level]?.map;
  if (!map) throw new Error("Unknown mission");
  const find = (symbol: string) => {
    const y = map.findIndex((row) => row.includes(symbol));
    return { x: map[y].indexOf(symbol), y };
  };
  return {
    version: 1,
    level,
    active: 0,
    heroes: [find("J"), find("R")],
    removed: [],
    key: false,
    beacon: false,
    rescued: false,
    moves: 0,
    health: 6,
    status: "playing",
    message: ADVENTURE_LEVELS[level].story,
  };
}
export function adventureTile(s: AdventureState, x: number, y: number): string {
  const symbol = ADVENTURE_LEVELS[s.level].map[y]?.[x] || "#";
  return s.removed.includes(id(x, y)) ? "." : symbol;
}
export function adventureAction(
  old: AdventureState,
  action: AdventureAction,
): AdventureState {
  if (old.status !== "playing") return old;
  const s: AdventureState = {
    ...old,
    heroes: old.heroes.map((h) => ({ ...h })) as AdventureState["heroes"],
    removed: [...old.removed],
  };
  if (action.type === "switch") {
    s.active = s.active === 0 ? 1 : 0;
    s.message =
      s.active === 0
        ? "Jack leads. He can clear rockfalls."
        : "Rose leads. She can repair signal equipment.";
    return s;
  }
  const hero = s.heroes[s.active],
    name = s.active === 0 ? "Jack" : "Rose";
  if (action.type === "move") {
    if (
      !Number.isInteger(action.dx) ||
      !Number.isInteger(action.dy) ||
      Math.abs(action.dx) + Math.abs(action.dy) !== 1
    )
      return old;
    const x = hero.x + action.dx,
      y = hero.y + action.dy,
      tile = adventureTile(s, x, y);
    if (
      tile === "#" ||
      tile === "X" ||
      tile === "D" ||
      (tile === "=" && !s.beacon)
    ) {
      s.message =
        tile === "X"
          ? "Rockfall. Bring Jack next to it and use Interact."
          : tile === "D"
            ? "Locked door. Find the brass key, then interact beside it."
            : tile === "="
              ? "Bridge is down. Rose must repair the console."
              : "The route is blocked.";
      return s;
    }
    hero.x = x;
    hero.y = y;
    s.moves++;
    s.message = `${name} moves.`;
    if (tile === "K") {
      s.key = true;
      s.removed.push(id(x, y));
      s.message = "Brass key found. The archive can be opened.";
    }
    if (tile === "N") {
      s.rescued = true;
      s.removed.push(id(x, y));
      s.message =
        "The surveyor is safe. Restore the beacon and reach the exit together.";
    }
  } else {
    const nearby = [
      hero,
      { x: hero.x + 1, y: hero.y },
      { x: hero.x - 1, y: hero.y },
      { x: hero.x, y: hero.y + 1 },
      { x: hero.x, y: hero.y - 1 },
    ];
    const target = nearby.find((h) => {
      const t = adventureTile(s, h.x, h.y);
      return (
        (t === "X" && s.active === 0) ||
        (t === "B" && s.active === 1 && !s.beacon) ||
        (t === "D" && s.key)
      );
    });
    if (!target) {
      s.message =
        "Nothing this explorer can use here. Move beside rubble, a beacon or a locked door.";
      return s;
    }
    const tile = adventureTile(s, target.x, target.y);
    s.removed.push(id(target.x, target.y));
    s.moves++;
    if (tile === "B") {
      s.beacon = true;
      s.message = "Rose restores the signal. The route is ready.";
    } else
      s.message =
        tile === "X"
          ? "Jack clears the rockfall."
          : "The key opens the archive.";
  }
  // Storm pressure creates a loss condition while leaving generous planning time.
  if (s.moves > 0 && s.moves % 24 === 0) {
    s.health--;
    s.message += " The storm is worsening; shelter is running out.";
  }
  const map = ADVENTURE_LEVELS[s.level].map,
    exitY = map.findIndex((row) => row.includes("E")),
    exitX = map[exitY].indexOf("E");
  const together = s.heroes.every(
    (h) => Math.abs(h.x - exitX) + Math.abs(h.y - exitY) <= 1,
  );
  const rubbleCleared = !map.some((row, y) =>
    [...row].some((t, x) => t === "X" && !s.removed.includes(id(x, y))),
  );
  if (
    together &&
    s.beacon &&
    rubbleCleared &&
    (s.level !== 1 ||
      (s.key &&
        s.removed.some((t) => {
          const [x, y] = t.split(",").map(Number);
          return map[y]?.[x] === "D";
        }))) &&
    (s.level !== 2 || s.rescued)
  ) {
    s.status = "won";
    s.message = "Mission complete. Both explorers reach safety.";
  } else if (s.health <= 0) {
    s.status = "lost";
    s.message =
      "The storm closes the route. Retry the mission with a new plan.";
  } else if (together)
    s.message =
      "The exit needs both explorers and all mission objectives. Check the objective panel.";
  return s;
}
export function readAdventure(value: unknown): AdventureState | null {
  if (!value || typeof value !== "object") return null;
  const s = value as AdventureState;
  if (
    s.version !== 1 ||
    !Number.isInteger(s.level) ||
    s.level < 0 ||
    s.level >= ADVENTURE_LEVELS.length ||
    (s.active !== 0 && s.active !== 1) ||
    !["playing", "won", "lost"].includes(s.status) ||
    !Number.isInteger(s.moves) ||
    s.moves < 0 ||
    s.moves > 10000 ||
    !Number.isInteger(s.health) ||
    s.health < 0 ||
    s.health > 6
  )
    return null;
  if (
    !Array.isArray(s.heroes) ||
    s.heroes.length !== 2 ||
    s.heroes.some(
      (h) =>
        !h ||
        !Number.isInteger(h.x) ||
        !Number.isInteger(h.y) ||
        h.y < 0 ||
        h.y >= 8 ||
        h.x < 0 ||
        h.x >= 13 ||
        ADVENTURE_LEVELS[s.level].map[h.y][h.x] === "#",
    )
  )
    return null;
  if (
    !Array.isArray(s.removed) ||
    s.removed.length > 25 ||
    s.removed.some((t) => typeof t !== "string" || !/^\d{1,2},\d$/.test(t))
  )
    return null;
  if (
    [s.key, s.beacon, s.rescued].some((v) => typeof v !== "boolean") ||
    typeof s.message !== "string" ||
    s.message.length > 1000
  )
    return null;
  return {
    ...s,
    heroes: s.heroes.map((h) => ({ ...h })) as AdventureState["heroes"],
    removed: [...new Set(s.removed)],
  };
}
