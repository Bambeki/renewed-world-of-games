"use client";
import {
  ADVENTURE_LEVELS,
  adventureAction,
  adventureTile,
  newAdventure,
  readAdventure,
} from "@/lib/campaigns/adventure";
import { useCampaign } from "@/components/campaigns/use-campaign";
import CampaignShell from "@/components/campaigns/campaign-shell";
import styles from "@/components/campaigns/campaigns.module.css";
const symbols: Record<string, string> = {
  X: "Rockfall",
  B: "Beacon",
  D: "Locked door",
  K: "Key",
  N: "Survivor",
  E: "Exit",
  "=": "Bridge",
};
export default function Adventure() {
  const {
    state: s,
    setState,
    ready,
    saveNotice,
    reset,
  } = useCampaign("rwog.adventure.v1", newAdventure, readAdventure);
  const move = (dx: number, dy: number) =>
    setState((old) => adventureAction(old, { type: "move", dx, dy }));
  const interact = () =>
    setState((old) => adventureAction(old, { type: "interact" }));
  const swap = () =>
    setState((old) => adventureAction(old, { type: "switch" }));
  const restart = () => {
    if (
      window.confirm(
        "Restart this mission? Its current progress will be replaced.",
      )
    )
      reset(newAdventure(s.level));
  };
  if (!ready)
    return (
      <CampaignShell>
        <p>Loading your expedition…</p>
      </CampaignShell>
    );
  return (
    <CampaignShell>
      <p className={styles.eyebrow}>
        ORIGINAL ADVENTURE · SINGLE PLAYER · PROTOTYPE
      </p>
      <h1>Jack & Rose: Lost Signals</h1>
      <p>
        Switch explorers to combine their abilities. This is an original
        island-rescue story.
      </p>
      {saveNotice && (
        <p role="alert" className={styles.notice}>
          {saveNotice}
        </p>
      )}
      <div className={styles.titleRow}>
        <h2>
          Mission {s.level + 1}: {ADVENTURE_LEVELS[s.level].title}
        </h2>
        <button onClick={restart}>Restart mission</button>
      </div>
      <div className={styles.metrics}>
        <span data-testid="adventure-active">
          Playing as {s.active === 0 ? "Jack" : "Rose"}
        </span>
        <span>Storm shelter: {s.health}/6</span>
        <span>Actions: {s.moves}</span>
      </div>
      <p role="status" className={styles.status}>
        {s.message}
      </p>
      <div className={styles.layout}>
        <div>
          <div
            tabIndex={0}
            role="group"
            aria-label="Adventure map controls"
            className={styles.board}
            onKeyDown={(e) => {
              const key = e.key.toLowerCase();
              const dirs: Record<string, [number, number]> = {
                arrowup: [0, -1],
                w: [0, -1],
                arrowdown: [0, 1],
                s: [0, 1],
                arrowleft: [-1, 0],
                a: [-1, 0],
                arrowright: [1, 0],
                d: [1, 0],
              };
              if (dirs[key]) {
                e.preventDefault();
                move(...dirs[key]);
              } else if (key === "e" || key === " ") {
                e.preventDefault();
                interact();
              } else if (key === "r") {
                e.preventDefault();
                swap();
              }
            }}
          >
            <svg
              viewBox="0 0 650 400"
              role="img"
              aria-label={`Island map. Jack at ${s.heroes[0].x},${s.heroes[0].y}; Rose at ${s.heroes[1].x},${s.heroes[1].y}.`}
            >
              <defs>
                <linearGradient id="ocean" x2="1" y2="1">
                  <stop stopColor="#1c5371" />
                  <stop offset="1" stopColor="#102b4d" />
                </linearGradient>
              </defs>
              {ADVENTURE_LEVELS[s.level].map.flatMap((row, y) =>
                [...row].map((_, x) => {
                  const t = adventureTile(s, x, y);
                  return (
                    <g key={`${x},${y}`}>
                      <rect
                        x={x * 50}
                        y={y * 50}
                        width="50"
                        height="50"
                        fill={
                          t === "#"
                            ? "#324c49"
                            : t === "="
                              ? s.beacon
                                ? "#bda369"
                                : "url(#ocean)"
                              : (x + y) % 2
                                ? "#c2b58a"
                                : "#cabb96"
                        }
                        stroke="#ffffff12"
                      />
                      {t === "#" ? (
                        <path
                          d={`M${x * 50 + 5},${y * 50 + 43}l17,-32 20,32Z`}
                          fill="#497064"
                        />
                      ) : (
                        symbols[t] && (
                          <>
                            <circle
                              cx={x * 50 + 25}
                              cy={y * 50 + 23}
                              r="17"
                              fill={
                                t === "E"
                                  ? "#174b70"
                                  : t === "B"
                                    ? "#f6d56e"
                                    : t === "X"
                                      ? "#7e6d58"
                                      : "#eee8cf"
                              }
                            />
                            <text
                              x={x * 50 + 25}
                              y={y * 50 + 28}
                              textAnchor="middle"
                              fontSize="17"
                              fontWeight="bold"
                              fill="#203845"
                            >
                              {t === "X"
                                ? "◆"
                                : t === "B"
                                  ? "☀"
                                  : t === "E"
                                    ? "⚓"
                                    : t === "K"
                                      ? "⚿"
                                      : t === "D"
                                        ? "▣"
                                        : t === "N"
                                          ? "!"
                                          : "≈"}
                            </text>
                          </>
                        )
                      )}
                    </g>
                  );
                }),
              )}
              {s.heroes.map((h, i) => (
                <g
                  key={i}
                  transform={`translate(${h.x * 50 + 25 + (s.heroes[0].x === s.heroes[1].x && s.heroes[0].y === s.heroes[1].y ? (i === 0 ? -9 : 9) : 0)} ${h.y * 50 + 25})`}
                >
                  {s.active === i && (
                    <circle
                      r="23"
                      fill="none"
                      stroke="#ffe076"
                      strokeWidth="3"
                    />
                  )}
                  <ellipse cy="13" rx="13" ry="5" fill="#102a3255" />
                  <path
                    d="M-9 11V0q9-10 18 0v11"
                    fill={i === 0 ? "#253e63" : "#a34644"}
                  />
                  <circle cy="-8" r="8" fill="#edbd91" />
                  <text
                    y="30"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#152d33"
                  >
                    {i === 0 ? "JACK" : "ROSE"}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className={styles.legend}>
            {Object.entries(symbols).map(([t, label]) => (
              <span key={t}>
                {t}: {label}
              </span>
            ))}
          </div>
          <div className={styles.toolbar}>
            <div className={styles.dpad}>
              {[
                { dx: 0, dy: -1, label: "↑", name: "Move north" },
                { dx: -1, dy: 0, label: "←", name: "Move west" },
                { dx: 0, dy: 1, label: "↓", name: "Move south" },
                { dx: 1, dy: 0, label: "→", name: "Move east" },
              ].map((d) => (
                <button
                  key={d.name}
                  aria-label={d.name}
                  disabled={s.status !== "playing"}
                  onClick={() => move(d.dx, d.dy)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              className={styles.primary}
              disabled={s.status !== "playing"}
              onClick={interact}
            >
              Interact
            </button>
            <button disabled={s.status !== "playing"} onClick={swap}>
              Switch explorer
            </button>
          </div>
          <p className={styles.small}>
            WASD/arrows: move · E/Space: interact · R: switch. Click the map for
            keyboard control. Switching is free; every 24 successful actions
            costs one shelter point.
          </p>
        </div>
        <aside className={styles.panel}>
          <h2>Mission objectives</h2>
          <p>{ADVENTURE_LEVELS[s.level].objective}</p>
          <p>
            {s.beacon ? "✓ Signal restored" : "○ Signal offline"}
            <br />
            {s.level === 1 ? (
              <>
                {s.key ? "✓ Key collected" : "○ Find the brass key"}
                <br />
                {s.removed.includes("8,2")
                  ? "✓ Archive unlocked"
                  : "○ Unlock the archive door"}
              </>
            ) : (
              <>
                {s.removed.some((position) => {
                  const [x, y] = position.split(",").map(Number);
                  return ADVENTURE_LEVELS[s.level].map[y]?.[x] === "X";
                })
                  ? "✓ Rockfall cleared"
                  : "○ Jack must clear the rockfall"}
                {s.level === 2 && (
                  <>
                    <br />
                    {s.rescued ? "✓ Survivor rescued" : "○ Reach the survivor"}
                  </>
                )}
              </>
            )}
          </p>
          <h2>Your team</h2>
          <p>
            <b>Jack</b> clears adjacent rockfalls.
            <br />
            <b>Rose</b> repairs adjacent beacons and bridge controls.
          </p>
          <p>
            Both explorers must finish on or beside the exit. Overlapping on
            safe ground is allowed.
          </p>
          <p className={styles.small}>
            Progress saves automatically on this device. Completing a mission
            unlocks the next chapter.
          </p>
        </aside>
      </div>
      {s.status !== "playing" && (
        <section
          role="region"
          aria-label="Adventure result"
          className={styles.campaignEnd}
        >
          <h2>
            {s.status === "won"
              ? s.level === 2
                ? "Campaign complete"
                : "Mission complete"
              : "Expedition interrupted"}
          </h2>
          <p>{s.message}</p>
          {s.status === "won" && s.level < 2 ? (
            <button
              className={styles.primary}
              onClick={() => reset(newAdventure(s.level + 1))}
            >
              Next mission
            </button>
          ) : (
            <button
              onClick={() =>
                reset(newAdventure(s.status === "won" ? 0 : s.level))
              }
            >
              {s.status === "won" ? "Play campaign again" : "Retry mission"}
            </button>
          )}
        </section>
      )}
    </CampaignShell>
  );
}
