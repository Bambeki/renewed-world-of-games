"use client";
import {
  newRome,
  readRome,
  romeAction,
  romanBlocked,
  romanPath,
  ROMAN_MISSIONS,
  UNIT_RULES,
  LegionKind,
} from "@/lib/campaigns/rome";
import { useCampaign } from "@/components/campaigns/use-campaign";
import CampaignShell from "@/components/campaigns/campaign-shell";
import styles from "@/components/campaigns/campaigns.module.css";
export default function Rome() {
  const {
    state: s,
    setState,
    ready,
    saveNotice,
    reset,
  } = useCampaign("rwog.rome.v1", newRome, readRome);
  const selected = s.units.find((u) => u.id === s.selected);
  const cell = (x: number, y: number) =>
    setState((old) => romeAction(old, { type: "cell", x, y }));
  if (!ready)
    return (
      <CampaignShell>
        <p>Preparing the frontier…</p>
      </CampaignShell>
    );
  return (
    <CampaignShell>
      <p className={styles.eyebrow}>
        FICTIONAL ROMAN FRONTIER · SINGLE PLAYER TACTICS · PROTOTYPE
      </p>
      <h1>Standards of Rome</h1>
      <div className={styles.titleRow}>
        <h2>
          Battle {s.mission + 1}: {ROMAN_MISSIONS[s.mission].name}
        </h2>
        <button
          onClick={() => {
            if (window.confirm("Restart this battle and replace its progress?"))
              reset(newRome(s.mission));
          }}
        >
          Restart battle
        </button>
      </div>
      <p>{ROMAN_MISSIONS[s.mission].brief}</p>
      {saveNotice && (
        <p role="alert" className={styles.notice}>
          {saveNotice}
        </p>
      )}
      <div className={styles.metrics}>
        <span>Round {s.round}/18</span>
        <span data-testid="roman-gold">Gold: {s.gold}</span>
        <span>Fort: {Math.max(0, s.fort)}/20</span>
      </div>
      <p role="status" className={styles.status}>
        {s.message}
      </p>
      <div className={styles.layout}>
        <div>
          <div className={styles.board}>
            <svg
              viewBox="0 0 630 490"
              role="group"
              aria-label="Roman battlefield"
            >
              {Array.from({ length: 63 }, (_, i) => {
                const x = i % 9,
                  y = Math.floor(i / 9),
                  unit = s.units.find((u) => u.x === x && u.y === y),
                  path =
                    selected && selected.side === 0 && !selected.moved
                      ? romanPath(s, selected, x, y)
                      : null,
                  reachable =
                    path !== null &&
                    selected &&
                    path <= UNIT_RULES[selected.kind].move;
                return (
                  <g
                    key={i}
                    className={styles.tileButton}
                    role="button"
                    tabIndex={s.status === "playing" ? 0 : -1}
                    aria-label={`Tile ${x + 1},${y + 1}${unit ? `, ${unit.side === 0 ? "Roman" : "enemy"} ${unit.kind}, ${unit.hp} health` : romanBlocked(x, y) ? ", blocked" : ""}`}
                    onClick={() => cell(x, y)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        cell(x, y);
                      }
                    }}
                  >
                    <rect
                      x={x * 70 + 1}
                      y={y * 70 + 1}
                      width="68"
                      height="68"
                      rx="4"
                      fill={
                        romanBlocked(x, y)
                          ? x === 4
                            ? "#295e76"
                            : "#68644d"
                          : reachable
                            ? "#587d63"
                            : (x + y) % 2
                              ? "#b2a47b"
                              : "#c1b18a"
                      }
                      stroke={unit?.id === s.selected ? "#ffe075" : "#ffffff15"}
                      strokeWidth={unit?.id === s.selected ? 4 : 1}
                    />
                    {romanBlocked(x, y) && (
                      <text
                        x={x * 70 + 35}
                        y={y * 70 + 43}
                        textAnchor="middle"
                        fontSize="26"
                        fill="#b8d8d1"
                      >
                        {x === 4 ? "≈" : "▲"}
                      </text>
                    )}
                    {x === 0 && y === 3 && (
                      <path
                        d={`M8 ${y * 70 + 50}v-30h12v-9h12v9h12v-9h12v39Z`}
                        fill="#5b4744"
                      />
                    )}
                    {unit && (
                      <g transform={`translate(${x * 70 + 35} ${y * 70 + 30})`}>
                        <ellipse cy="18" rx="22" ry="7" fill="#332b3340" />
                        <path
                          d="M-13 14V-3q13-13 26 0v17Z"
                          fill={unit.side === 0 ? "#a13238" : "#353c58"}
                        />
                        <circle cy="-9" r="10" fill="#d0ad78" />
                        <path
                          d="M-11-9q11-17 22 0"
                          fill={unit.side === 0 ? "#e6c66a" : "#8995a9"}
                        />
                        <text
                          y="8"
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="bold"
                          fill="#fff6d5"
                        >
                          {unit.kind === "archer"
                            ? "↗"
                            : unit.kind === "cavalry"
                              ? "♞"
                              : "Ⅰ"}
                        </text>
                        <text
                          y="32"
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="bold"
                          fill="#152830"
                        >
                          {unit.hp} HP
                        </text>
                        {unit.moved && unit.attacked && (
                          <circle cx="20" cy="-15" r="4" fill="#2a5145" />
                        )}
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className={styles.toolbar}>
            <button
              className={styles.primary}
              disabled={s.status !== "playing"}
              onClick={() =>
                setState((old) => romeAction(old, { type: "end" }))
              }
            >
              End turn
            </button>
            <span>
              Click a Roman unit, then a highlighted tile to move or an enemy to
              attack.
            </span>
          </div>
          <p className={styles.small}>
            Each unit can move once and attack once per round. Arrows have range
            3; melee range is 1. River tiles are blocked except at the central
            crossing. Four gold arrives each round; defeated enemies grant
            three.
          </p>
        </div>
        <aside className={styles.panel}>
          <h2>Selected unit</h2>
          {selected ? (
            <>
              <p>
                {selected.kind.toUpperCase()} · {selected.hp} HP
                <br />
                Movement: {UNIT_RULES[selected.kind].move} · Range:{" "}
                {UNIT_RULES[selected.kind].range}
                <br />
                {selected.moved ? "Move used" : "Move available"} ·{" "}
                {selected.attacked ? "Attack used" : "Attack available"}
              </p>
            </>
          ) : (
            <p>Select one of your Roman units.</p>
          )}
          <h2>Reinforcements</h2>
          <div className={styles.unitList}>
            {(Object.keys(UNIT_RULES) as LegionKind[]).map((kind) => (
              <button
                key={kind}
                disabled={
                  s.status !== "playing" || s.gold < UNIT_RULES[kind].cost
                }
                onClick={() =>
                  setState((old) => romeAction(old, { type: "recruit", kind }))
                }
              >
                Recruit {kind} · {UNIT_RULES[kind].cost} gold
              </button>
            ))}
          </div>
          <h2>Win the battle</h2>
          <p>
            Defeat every enemy before round 19. Keep the fort above zero health.
            Recruitment is limited to six friendly units and needs a free
            western deployment tile.
          </p>
          <p className={styles.small}>
            This fictional campaign uses simplified combat and local saves. It
            is not a historical simulation.
          </p>
        </aside>
      </div>
      {s.status !== "playing" && (
        <section
          role="region"
          aria-label="Roman battle result"
          className={styles.campaignEnd}
        >
          <h2>
            {s.status === "won"
              ? s.mission === 2
                ? "Campaign secured"
                : "Battle won"
              : "Defeat"}
          </h2>
          <p>{s.message}</p>
          {s.status === "won" && s.mission < 2 ? (
            <button
              className={styles.primary}
              onClick={() => reset(newRome(s.mission + 1))}
            >
              Next battle
            </button>
          ) : (
            <button
              onClick={() => reset(newRome(s.status === "won" ? 0 : s.mission))}
            >
              {s.status === "won" ? "Play campaign again" : "Retry battle"}
            </button>
          )}
        </section>
      )}
    </CampaignShell>
  );
}
