"use client";
import { useEffect, useRef, useState } from "react";
import { ArcadeState, Controls, createArcade, stepArcade } from "@/lib/arcade";
import styles from "./match-arcade.module.css";
const empty = (): Controls => ({
  x: 0,
  y: 0,
  shoot: false,
  pass: false,
  switch: false,
});
export default function MatchArcade({
  home,
  away,
  onClose,
}: {
  home: string;
  away: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<ArcadeState>(createArcade);
  const [running, setRunning] = useState(false);
  const controls = useRef(empty());
  const keys = useRef(new Set<string>());
  const pitch = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let previous = 0;
    let renderAt = 0;
    function tick(now: number) {
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      const k = keys.current;
      const input = {
        ...controls.current,
        x:
          controls.current.x +
          Number(k.has("arrowright") || k.has("d")) -
          Number(k.has("arrowleft") || k.has("a")),
        y:
          controls.current.y +
          Number(k.has("arrowdown") || k.has("s")) -
          Number(k.has("arrowup") || k.has("w")),
      };
      stateRef.current = stepArcade(stateRef.current, input, dt);
      controls.current.shoot = false;
      controls.current.pass = false;
      controls.current.switch = false;
      if (now - renderAt > 30 || stateRef.current.finished) {
        setState(stateRef.current);
        renderAt = now;
      }
      if (stateRef.current.finished) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
  useEffect(() => {
    const release = () => {
      keys.current.clear();
      controls.current = empty();
    };
    const hide = () => {
      if (document.hidden) {
        release();
        setRunning(false);
      }
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  function action(key: "shoot" | "pass" | "switch") {
    controls.current[key] = true;
    pitch.current?.focus();
  }
  function reset() {
    setRunning(false);
    keys.current.clear();
    controls.current = empty();
    const next = createArcade();
    stateRef.current = next;
    setState(next);
  }
  const minute = Math.min(90, Math.floor((state.elapsed / 120) * 90));
  return (
    <section className={styles.arcade} aria-label="Playable football match">
      <div className={styles.top}>
        <div>
          <p className="eyebrow">PLAYABLE 2D FOOTBALL · EXHIBITION</p>
          <h2>You’re on the pitch</h2>
        </div>
        <button
          className="secondary"
          onClick={() => {
            if (
              !running ||
              window.confirm(
                "Leave this exhibition? Its score will not be saved.",
              )
            )
              onClose();
          }}
        >
          Close match
        </button>
      </div>
      <p>
        Control the green team. Attack the right goal. This 6-a-side, two-minute
        exhibition does not change your league results or budget.
      </p>
      <div className={styles.scoreboard} aria-label="Exhibition scoreboard">
        <span>{home}</span>
        <strong>
          <span data-testid="home-score">{state.score[0]}</span> –{" "}
          <span data-testid="away-score">{state.score[1]}</span>
        </strong>
        <span>{away}</span>
        <b data-testid="match-clock">
          {minute}′ {state.finished ? "Full time" : running ? "Live" : "Paused"}
        </b>
      </div>
      <div
        ref={pitch}
        className={styles.pitch}
        tabIndex={0}
        role="group"
        aria-label="Football pitch. Arrow keys or WASD move, Space shoots, P passes, C switches player."
        onKeyDown={(e) => {
          const k = e.key.toLowerCase();
          if (
            [
              "arrowup",
              "arrowdown",
              "arrowleft",
              "arrowright",
              "w",
              "a",
              "s",
              "d",
              " ",
              "p",
              "c",
            ].includes(k)
          ) {
            e.preventDefault();
            keys.current.add(k);
            if (!e.repeat) {
              if (k === " ") controls.current.shoot = true;
              if (k === "p") controls.current.pass = true;
              if (k === "c") controls.current.switch = true;
            }
          }
        }}
        onKeyUp={(e) => keys.current.delete(e.key.toLowerCase())}
        onBlur={() => {
          keys.current.clear();
          controls.current = empty();
        }}
      >
        <svg viewBox="-4 -3 108 70" aria-hidden="true">
          <defs>
            <pattern
              id="grass-stripes"
              width="20"
              height="64"
              patternUnits="userSpaceOnUse"
            >
              <rect width="10" height="64" fill="#176b42" />
              <rect x="10" width="10" height="64" fill="#1b774a" />
            </pattern>
          </defs>
          <rect x="-4" y="-3" width="108" height="70" rx="2" fill="#0b3926" />
          <rect width="100" height="64" fill="url(#grass-stripes)" />
          <g fill="none" stroke="#d9f5dd" strokeWidth=".35">
            <rect x=".5" y=".5" width="99" height="63" />
            <path d="M50 0V64" />
            <circle cx="50" cy="32" r="9" />
            <path d="M0 16H16V48H0M100 16H84V48H100M0 24H6V40H0M100 24H94V40H100" />
            <rect x="-3" y="25" width="3" height="14" />
            <rect x="100" y="25" width="3" height="14" />
          </g>
          {state.players.map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              {i === state.selected && (
                <circle
                  r="2.5"
                  fill="none"
                  stroke="#ffe16a"
                  strokeWidth=".65"
                />
              )}
              <circle
                r="1.8"
                fill={p.team === 0 ? "#37ee92" : "#f27181"}
                stroke="#102634"
                strokeWidth=".35"
              />
              <text
                textAnchor="middle"
                y=".7"
                fontSize="2"
                fontWeight="800"
                fill="#07141c"
              >
                {p.number}
              </text>
            </g>
          ))}
          <circle
            cx={state.ball.x}
            cy={state.ball.y}
            r=".85"
            fill="white"
            stroke="#152a20"
            strokeWidth=".3"
          />
        </svg>
        {!running && (
          <div className={styles.overlay}>
            <strong>
              {state.finished
                ? "Full time"
                : state.elapsed > 0
                  ? "Match paused"
                  : "Ready for kick off?"}
            </strong>
            <span>
              {state.finished
                ? `${state.score[0]} – ${state.score[1]}`
                : "Select Start / Resume below to play."}
            </span>
          </div>
        )}
      </div>
      <p role="status" className={styles.commentary}>
        {state.message}
      </p>
      <div className={styles.toolbar}>
        <button
          disabled={state.finished}
          onClick={() => {
            setRunning((v) => !v);
            keys.current.clear();
            controls.current = empty();
            pitch.current?.focus();
          }}
        >
          {running
            ? "Pause match"
            : state.elapsed > 0
              ? "Resume match"
              : "Start match"}
        </button>
        <button
          className="secondary"
          onClick={() => {
            if (
              state.elapsed === 0 ||
              window.confirm("Restart this exhibition at 0–0?")
            )
              reset();
          }}
        >
          Restart exhibition
        </button>
      </div>
      <p>
        Move: <b>WASD / arrows</b> · Shoot: <b>Space</b> · Pass: <b>P</b> ·
        Switch: <b>C</b>. The yellow ring marks your player. Click the pitch to
        restore keyboard focus.
      </p>
      <div className={styles.touch} aria-label="Touch match controls">
        <div className={styles.dpad}>
          {[
            { label: "Move up", x: 0, y: -1, symbol: "↑" },
            { label: "Move left", x: -1, y: 0, symbol: "←" },
            { label: "Move down", x: 0, y: 1, symbol: "↓" },
            { label: "Move right", x: 1, y: 0, symbol: "→" },
          ].map((d) => (
            <button
              key={d.label}
              aria-label={d.label}
              disabled={!running}
              onPointerDown={(e) => {
                  e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                controls.current.x = d.x;
                controls.current.y = d.y;
              }}
              onPointerUp={() => {
                controls.current.x = 0;
                controls.current.y = 0;
              }}
              onPointerCancel={() => {
                controls.current.x = 0;
                controls.current.y = 0;
              }}
            >
              {d.symbol}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button disabled={!running} onClick={() => action("shoot")}>
            Shoot
          </button>
          <button disabled={!running} onClick={() => action("pass")}>
            Pass
          </button>
          <button disabled={!running} onClick={() => action("switch")}>
            Switch player
          </button>
        </div>
      </div>
      {state.finished && (
        <p className="success" role="alert">
          Exhibition complete. {state.message} Your league season is unchanged.
          Restart to play again.
        </p>
      )}
    </section>
  );
}
