/** RWOG local Ludo: six to leave the yard; safe squares; exact finish; six earns another roll.
 * Friendly tokens may share squares. No blockades, capture bonus or three-sixes penalty.
 */
export const LUDO_COLORS = ["red", "green", "yellow", "blue"] as const;
export type LudoColor = (typeof LUDO_COLORS)[number];
export type LudoCount = 2 | 3 | 4;
export const LUDO_FINISH = 56;
export const LUDO_SAFE = [0, 8, 13, 21, 26, 34, 39, 47];
export const LUDO_TRACK: readonly (readonly [number, number])[] = [
  [6, 1],
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [5, 6],
  [4, 6],
  [3, 6],
  [2, 6],
  [1, 6],
  [0, 6],
  [0, 7],
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8],
  [6, 9],
  [6, 10],
  [6, 11],
  [6, 12],
  [6, 13],
  [6, 14],
  [7, 14],
  [8, 14],
  [8, 13],
  [8, 12],
  [8, 11],
  [8, 10],
  [8, 9],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
  [14, 8],
  [14, 7],
  [14, 6],
  [13, 6],
  [12, 6],
  [11, 6],
  [10, 6],
  [9, 6],
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0],
  [7, 0],
  [6, 0],
];
export interface LudoPlayer {
  color: LudoColor;
  name: string;
  tokens: number[];
}
export interface LudoState {
  version: 1;
  players: LudoPlayer[];
  current: number;
  die: number | null;
  lastRoll: number | null;
  winner: LudoColor | null;
  message: string;
  history: string[];
}
export function newLudo(count: LudoCount, names: string[] = []): LudoState {
  if (![2, 3, 4].includes(count))
    throw new Error("Choose two, three or four players.");
  const colors: readonly LudoColor[] =
    count === 2 ? ["red", "yellow"] : LUDO_COLORS.slice(0, count);
  const players = colors.map((color, i) => ({
    color,
    name: names[i]?.trim().slice(0, 24) || `Player ${i + 1}`,
    tokens: [-1, -1, -1, -1],
  }));
  return {
    version: 1,
    players,
    current: 0,
    die: null,
    lastRoll: null,
    winner: null,
    message: `${players[0].name}, roll the die to begin.`,
    history: [],
  };
}
export function ludoSquare(color: LudoColor, step: number): number | null {
  return step >= 0 && step <= 50
    ? (LUDO_COLORS.indexOf(color) * 13 + step) % 52
    : null;
}
export function ludoPosition(
  color: LudoColor,
  step: number,
  token: number,
): readonly [number, number] {
  const c = LUDO_COLORS.indexOf(color);
  if (step === -1) {
    const offsets = [
      [0, 0],
      [0, 9],
      [9, 9],
      [9, 0],
    ][c];
    return [
      offsets[0] + (token < 2 ? 2 : 4),
      offsets[1] + (token % 2 === 0 ? 2 : 4),
    ];
  }
  const square = ludoSquare(color, step);
  if (square !== null) return LUDO_TRACK[square];
  const lane = step - 50;
  return [
    [7, lane],
    [lane, 7],
    [7, 14 - lane],
    [14 - lane, 7],
  ][c] as [number, number];
}
export function ludoMoves(state: LudoState): number[] {
  if (state.winner || state.die === null) return [];
  return state.players[state.current].tokens.flatMap((step, i) =>
    (
      step === -1
        ? state.die === 6
        : step < LUDO_FINISH && step + state.die! <= LUDO_FINISH
    )
      ? [i]
      : [],
  );
}
function record(state: LudoState, message: string) {
  state.message = message;
  state.history = [message, ...state.history].slice(0, 12);
}
export function rollLudo(state: LudoState, die: number): LudoState {
  if (state.winner || state.die !== null)
    throw new Error("Finish the current move before rolling.");
  if (!Number.isInteger(die) || die < 1 || die > 6)
    throw new Error("Die must be between one and six.");
  const next = structuredClone(state);
  const player = next.players[next.current];
  next.die = die;
  next.lastRoll = die;
  if (!ludoMoves(next).length) {
    next.die = null;
    if (die !== 6) next.current = (next.current + 1) % next.players.length;
    record(
      next,
      `${player.name} rolled ${die}: no legal move. ${next.players[next.current].name}, roll next.`,
    );
  } else
    record(next, `${player.name} rolled ${die}. Choose a highlighted token.`);
  return next;
}
export function moveLudo(state: LudoState, token: number): LudoState {
  if (!ludoMoves(state).includes(token))
    throw new Error("That token cannot move.");
  const next = structuredClone(state);
  const player = next.players[next.current];
  const die = next.die!;
  player.tokens[token] =
    player.tokens[token] === -1 ? 0 : player.tokens[token] + die;
  const square = ludoSquare(player.color, player.tokens[token]);
  let captures = 0;
  if (square !== null && !LUDO_SAFE.includes(square))
    for (const opponent of next.players.filter((p) => p.color !== player.color))
      opponent.tokens = opponent.tokens.map((step) => {
        if (ludoSquare(opponent.color, step) === square) {
          captures++;
          return -1;
        }
        return step;
      });
  next.die = null;
  const detail =
    player.tokens[token] === LUDO_FINISH
      ? "reached home"
      : captures
        ? `captured ${captures} token${captures === 1 ? "" : "s"}`
        : "moved";
  if (player.tokens.every((step) => step === LUDO_FINISH)) {
    next.winner = player.color;
    record(next, `${player.name} wins! All four tokens are home.`);
    return next;
  }
  if (die !== 6) next.current = (next.current + 1) % next.players.length;
  record(
    next,
    `${player.name} ${detail} with token ${token + 1}. ${die === 6 ? "Six earns another roll. " : ""}${next.players[next.current].name}, roll next.`,
  );
  return next;
}
/** Never trust browser storage: reject malformed or incompatible saves. */
export function parseLudo(raw: string): LudoState | null {
  try {
    const s = JSON.parse(raw) as LudoState;
    if (
      s?.version !== 1 ||
      !Array.isArray(s.players) ||
      ![2, 3, 4].includes(s.players.length) ||
      !Number.isInteger(s.current) ||
      s.current < 0 ||
      s.current >= s.players.length
    )
      return null;
    const expected =
      s.players.length === 2
        ? ["red", "yellow"]
        : LUDO_COLORS.slice(0, s.players.length);
    if (
      s.players.some(
        (p, i) =>
          !p ||
          p.color !== expected[i] ||
          typeof p.name !== "string" ||
          !p.name.trim() ||
          p.name.length > 24 ||
          !Array.isArray(p.tokens) ||
          p.tokens.length !== 4 ||
          p.tokens.some(
            (t) => !Number.isInteger(t) || t < -1 || t > LUDO_FINISH,
          ),
      )
    )
      return null;
    if (
      [s.die, s.lastRoll].some(
        (d) => d !== null && (!Number.isInteger(d) || d < 1 || d > 6),
      )
    )
      return null;
    if (
      typeof s.message !== "string" ||
      s.message.length > 240 ||
      !Array.isArray(s.history) ||
      s.history.length > 12 ||
      s.history.some((h) => typeof h !== "string" || h.length > 240)
    )
      return null;
    const winners = s.players.filter((p) =>
      p.tokens.every((t) => t === LUDO_FINISH),
    );
    if (
      s.winner !== null
        ? winners.length !== 1 ||
          winners[0].color !== s.winner ||
          s.players[s.current].color !== s.winner ||
          s.die !== null
        : winners.length > 0
    )
      return null;
    if (s.die !== null && !ludoMoves(s).length) return null;
    return s;
  } catch {
    return null;
  }
}
