import type { FootballState } from "./football-3d";

export type GraphicsQuality = "auto" | "performance" | "balanced" | "high";
export type FootballSettings = {
  camera: "follow" | "broadcast" | "close" | "telecast";
  graphics: GraphicsQuality;
  difficulty: "casual" | "club" | "elite";
};
export const defaultFootballSettings: FootballSettings = {
  camera: "telecast", graphics: "auto", difficulty: "club",
};
export function decodeFootballSettings(raw: string | null): FootballSettings {
  try {
    const value = JSON.parse(raw || "null");
    return {
      camera: ["follow", "broadcast", "close", "telecast"].includes(value?.camera) ? value.camera : "telecast",
      graphics: ["auto", "performance", "balanced", "high"].includes(value?.graphics) ? value.graphics : "auto",
      difficulty: ["casual", "club", "elite"].includes(value?.difficulty) ? value.difficulty : "club",
    };
  } catch { return { ...defaultFootballSettings }; }
}
type SavedMatch = { version: 1; signature: string; savedAt: number; state: FootballState };
const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
const index = (value: unknown) => Number.isInteger(value) && finite(value, 0, 21);
const pair = (value: unknown, max: number) => Array.isArray(value) && value.length === 2 && value.every(n => finite(n, 0, max));

/** Device-only exhibition checkpoint. Never accepted by the league/API as a result. */
export function encodeFootballSave(state: FootballState, signature: string, savedAt = Date.now()) {
  return JSON.stringify({version: 1, signature, savedAt, state} satisfies SavedMatch);
}
export function decodeFootballSave(raw: string | null, signature: string): SavedMatch | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const value = JSON.parse(raw), s = value?.state as FootballState;
    if (value.version !== 1 || value.signature !== signature || !finite(value.savedAt, 0, 1e14)
      || !s || !Array.isArray(s.players) || s.players.length !== 22 || !index(s.selected)
      || typeof s.training !== "boolean" || !finite(s.elapsed, 0, 180)
      || !["kickoff", "playing", "goal", "restart", "fulltime"].includes(s.phase)
      || !finite(s.phaseTime, -1, 10) || !finite(s.charge, 0, 1)
      || !pair(s.score, 1000) || !pair(s.shots, 10000) || !pair(s.possession, 181)
      || !finite(s.keeperHold, 0, 10) || !Number.isInteger(s.eventId) || !finite(s.eventId, 0, 1e7)
      || ![0, 1].includes(s.restartTeam) || typeof s.message !== "string" || s.message.length > 500
      || (s.difficulty !== undefined && !["casual", "club", "elite"].includes(s.difficulty))
      || (s.passes !== undefined && !pair(s.passes, 10000))
      || (s.completedPasses !== undefined && !pair(s.completedPasses, 10000))
      || (s.passTarget !== undefined && !index(s.passTarget))
      || (s.passTeam !== undefined && ![0, 1].includes(s.passTeam))) return null;
    const b = s.ball;
    if (!b || !finite(b.x, -60, 60) || !finite(b.z, -40, 40) || !finite(b.y, 0, 50)
      || !finite(b.vx, -100, 100) || !finite(b.vz, -100, 100) || !finite(b.vy, -100, 100)
      || !finite(b.cooldown, 0, 10) || ![0, 1].includes(b.lastTouch)
      || (b.owner !== null && !index(b.owner)) || (b.releasedBy !== undefined && !index(b.releasedBy))) return null;
    for (let i = 0; i < s.players.length; i++) {
      const p = s.players[i];
      if (!p || p.team !== (i < 11 ? 0 : 1) || p.keeper !== (i % 11 === 0)
        || typeof p.name !== "string" || p.name.length > 120 || !finite(p.number, 1, 99)
        || !finite(p.x, -60, 60) || !finite(p.z, -40, 40) || !finite(p.baseX, -60, 60) || !finite(p.baseZ, -40, 40)
        || !finite(p.vx, -30, 30) || !finite(p.vz, -30, 30) || !finite(p.facing, -1e7, 1e7)
        || !finite(p.overall, 1, 100) || !finite(p.stamina, 0, 100)
        || ![p.kick, p.tackle, p.skill].every(n => finite(n, 0, 10))
        || (p.inactive !== undefined && typeof p.inactive !== "boolean")
        || (p.shielding !== undefined && typeof p.shielding !== "boolean")
        || [p.gait, p.touchClock, p.receiving, p.pressure, p.decisionClock, p.save].some(n => n !== undefined && !finite(n, 0, 1e7))
        || Boolean(p.inactive) !== (Boolean(s.training) && i !== 9 && i !== 11)) return null;
    }
    if (s.players[s.selected].inactive || s.players[s.selected].keeper
      || (b.owner !== null && s.players[b.owner].inactive)
      || (s.passTarget !== undefined && s.players[s.passTarget].inactive)) return null;
    return value as SavedMatch;
  } catch { return null; }
}
