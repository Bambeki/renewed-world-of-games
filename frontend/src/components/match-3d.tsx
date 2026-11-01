"use client";
import { useEffect, useRef, useState } from "react";
import {
  createFootball,
  FootballInput,
  FootballState,
  FOOTBALL_DURATION,
  neutralInput,
  stepFootball,
} from "@/lib/football-3d";
import type { CameraMode } from "@/lib/football-scene";
import styles from "./match-3d.module.css";
type Props = {
  home: string;
  away: string;
  roster: { name: string; overall: number }[];
  formation: string;
  onClose: () => void;
};
export default function Match3D({
  home,
  away,
  roster,
  formation,
  onClose,
}: Props) {
  const [initial] = useState(() => createFootball(roster, formation));
  const current = useRef(initial);
  const [snapshot, setSnapshot] = useState<FootballState>(initial);
  const input = useRef<FootballInput>(neutralInput());
  const keys = useRef(new Set<string>());
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const host = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    container = useRef<HTMLElement>(null);
  const cameraRef = useRef<CameraMode>("follow");
  const [camera, setCamera] = useState<CameraMode>("follow");
  const [controller, setController] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const [sound, setSound] = useState(false);
  function clear() {
    keys.current.clear();
    input.current = neutralInput();
    current.current.charge = 0;
  }
  function pause() {
    runningRef.current = false;
    setRunning(false);
    clear();
    setSnapshot({ ...current.current });
  }
  function toggle() {
    if (runningRef.current) {
      pause();
      return;
    }
    clear();
    runningRef.current = true;
    setRunning(true);
    viewport.current?.focus();
  }
  function action(
    key: "pass" | "through" | "lob" | "tackle" | "skill" | "switch",
  ) {
    input.current[key] = true;
    viewport.current?.focus();
  }
  function restart() {
    if (
      current.current.elapsed > 0 &&
      !window.confirm(
        "Restart this exhibition? The current score will be discarded.",
      )
    )
      return;
    pause();
    current.current = createFootball(roster, formation);
    setSnapshot(current.current);
  }
  async function toggleSound() {
    if (audio.current) {
      await audio.current.close();
      audio.current = null;
      setSound(false);
      return;
    }
    try {
      audio.current = new AudioContext();
      await audio.current.resume();
      setSound(true);
    } catch {
      setSound(false);
    }
  }
  function beep(goal: boolean) {
    const context = audio.current;
    if (!context) return;
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = goal ? "sine" : "triangle";
    oscillator.frequency.setValueAtTime(goal ? 660 : 130, context.currentTime);
    gain.gain.setValueAtTime(0.04, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + (goal ? 0.45 : 0.08),
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (goal ? 0.5 : 0.1));
  }
  useEffect(() => {
    let stopped = false,
      frame = 0;
    let scene: ReturnType<
      typeof import("@/lib/football-scene").createFootballScene
    > | null = null;
    let previous = 0,
      accumulator = 0,
      lastHUD = 0,
      eventId = 0;
    let lastPad: boolean[] = [];
    setReady(false);
    import("@/lib/football-scene")
      .then(({ createFootballScene }) => {
        if (stopped || !host.current) return;
        try {
          scene = createFootballScene(host.current, () => {
            runningRef.current = false;
            setRunning(false);
            setReady(false);
            setError(
              "The 3D graphics context was lost. Restart the renderer or use the simple 2D mode.",
            );
          });
          setReady(true);
          setError("");
        } catch {
          setError(
            "3D graphics could not start. Enable WebGL / hardware acceleration in your browser, or close this view and use simple 2D mode.",
          );
          return;
        }
        const tick = (now: number) => {
          if (stopped || !scene) return;
          const dt = previous ? Math.min((now - previous) / 1000, 0.1) : 0;
          previous = now;
          if (runningRef.current) {
            let pad: Gamepad | null = null;
            try {
              pad =
                Array.from(navigator.getGamepads?.() || []).find(
                  (p) => p?.connected && p.mapping === "standard",
                ) || null;
            } catch {}
            const k = keys.current;
            const controls = {
              ...input.current,
              x:
                input.current.x +
                Number(k.has("arrowright") || k.has("d")) -
                Number(k.has("arrowleft") || k.has("a")),
              z:
                input.current.z +
                Number(k.has("arrowdown") || k.has("s")) -
                Number(k.has("arrowup") || k.has("w")),
              sprint: input.current.sprint || k.has("shift"),
              shield: input.current.shield || k.has("f"),
              shootHeld: input.current.shootHeld || k.has(" "),
            };
            if (pad) {
              const pressed = pad.buttons.map((b) => b.pressed);
              const edge = (i: number) => pressed[i] && !lastPad[i];
              controls.x += Math.abs(pad.axes[0]) > 0.18 ? pad.axes[0] : 0;
              controls.z += Math.abs(pad.axes[1]) > 0.18 ? pad.axes[1] : 0;
              controls.pass ||= edge(0);
              controls.shoot ||= Boolean(lastPad[1] && !pressed[1]);
              controls.shootHeld ||= pressed[1];
              controls.tackle ||= edge(2);
              controls.through ||= edge(3);
              controls.switch ||= edge(4);
              controls.sprint ||= pressed[5] || pressed[7];
              controls.shield ||= pressed[6];
              controls.skill ||= edge(11);
              lastPad = pressed;
            }
            accumulator += dt;
            let steps = 0;
            while (accumulator >= 1 / 60 && steps < 6) {
              current.current = stepFootball(current.current, controls, 1 / 60);
              accumulator -= 1 / 60;
              steps++;
              controls.shoot = false;
              controls.pass = false;
              controls.through = false;
              controls.lob = false;
              controls.tackle = false;
              controls.skill = false;
              controls.switch = false;
            }
            if (steps) {
              input.current.shoot = false;
              input.current.pass = false;
              input.current.through = false;
              input.current.lob = false;
              input.current.tackle = false;
              input.current.skill = false;
              input.current.switch = false;
            }
            if (current.current.phase === "fulltime") {
              runningRef.current = false;
              setRunning(false);
            }
          } else accumulator = 0;
          if (current.current.eventId !== eventId) {
            eventId = current.current.eventId;
            if (
              current.current.phase === "goal" ||
              /shoot|Shot on/.test(current.current.message)
            )
              beep(current.current.phase === "goal");
          }
          scene.render(current.current, cameraRef.current, dt);
          if (now - lastHUD > 100) {
            setSnapshot({ ...current.current });
            lastHUD = now;
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!stopped)
          setError(
            "Unable to load the 3D renderer. Check your connection and retry.",
          );
      });
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      scene?.dispose();
    };
  }, [attempt]);
  useEffect(() => {
    const blur = () => pause();
    const visibility = () => {
      if (document.hidden) pause();
    };
    const pad = () => {
      try {
        setController(
          Array.from(navigator.getGamepads?.() || []).some(
            (p) => p?.mapping === "standard",
          ),
        );
      } catch {
        setController(false);
      }
    };
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("gamepadconnected", pad);
    window.addEventListener("gamepaddisconnected", pad);
    pad();
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("gamepadconnected", pad);
      window.removeEventListener("gamepaddisconnected", pad);
      runningRef.current = false;
      void audio.current?.close();
    };
    // Event handlers read mutable simulation refs; they must not restart the renderer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const selected = snapshot.players[snapshot.selected],
    minute = Math.min(
      90,
      Math.floor((snapshot.elapsed / FOOTBALL_DURATION) * 90),
    );
  const oneShot: Record<
    string,
    "pass" | "through" | "lob" | "tackle" | "skill" | "switch"
  > = {
    p: "pass",
    l: "through",
    o: "lob",
    j: "tackle",
    q: "skill",
    c: "switch",
  };
  return (
    <section
      ref={container}
      className={styles.match}
      aria-label="3D football exhibition"
    >
      <div className={styles.header}>
        <div>
          <p className="eyebrow">RWOG FOOTBALL · 3D PROTOTYPE</p>
          <h2>Step onto the pitch</h2>
          <p>11 v 11 · {formation} · Your saved XI · Exhibition</p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            if (
              current.current.elapsed === 0 ||
              window.confirm(
                "Leave this exhibition? The score will not be saved.",
              )
            ) {
              pause();
              onClose();
            }
          }}
        >
          Close 3D match
        </button>
      </div>
      <div className={styles.score}>
        <span>
          {home}
          <small>GREEN · ATTACK RIGHT →</small>
        </span>
        <strong>
          <span data-testid="3d-home-score">{snapshot.score[0]}</span> :{" "}
          <span data-testid="3d-away-score">{snapshot.score[1]}</span>
        </strong>
        <span>
          {away}
          <small>CORAL · COMPUTER</small>
        </span>
        <b data-testid="3d-clock">
          {minute}′ ·{" "}
          {snapshot.phase === "fulltime"
            ? "FULL TIME"
            : running
              ? snapshot.phase.toUpperCase()
              : "PAUSED"}
        </b>
      </div>
      <div className={styles.toolbar}>
        <button
          disabled={!ready || snapshot.phase === "fulltime"}
          onClick={toggle}
        >
          {running
            ? "Pause 3D match"
            : snapshot.elapsed
              ? "Resume 3D match"
              : "Start 3D match"}
        </button>
        <button className="secondary" onClick={restart}>
          Restart 3D exhibition
        </button>
        <label>
          Camera{" "}
          <select
            aria-label="3D camera"
            value={camera}
            onChange={(e) => {
              const mode = e.target.value as CameraMode;
              cameraRef.current = mode;
              setCamera(mode);
            }}
          >
            <option value="follow">Follow the ball</option>
            <option value="close">Close to the action</option>
            <option value="broadcast">Whole pitch</option>
          </select>
        </label>
        <button
          className="secondary"
          onClick={() => {
            if (!document.fullscreenElement)
              void container.current
                ?.requestFullscreen?.()
                .catch(() =>
                  setError(
                    "Fullscreen is unavailable in this browser. The match can still be played in this view.",
                  ),
                );
            else void document.exitFullscreen();
          }}
        >
          Fullscreen
        </button>
        <button
          className="secondary"
          aria-pressed={sound}
          onClick={() => void toggleSound()}
        >
          Match sounds {sound ? "on" : "off"}
        </button>
      </div>
      {error && (
        <p role="alert" className="alert">
          {error}{" "}
          <button
            className="secondary"
            onClick={() => {
              pause();
              setAttempt((a) => a + 1);
            }}
          >
            Retry 3D graphics
          </button>
        </p>
      )}
      <div
        ref={viewport}
        className={styles.viewport}
        tabIndex={0}
        role="group"
        aria-label="3D match controls"
        data-controlled-x={selected.x.toFixed(2)}
        data-controlled-z={selected.z.toFixed(2)}
        data-charge={snapshot.charge.toFixed(2)}
        data-phase={snapshot.phase}
        data-shots={snapshot.shots[0]}
        onKeyDown={(e) => {
          const key = e.key.toLowerCase();
          if (key === "escape") {
            pause();
            return;
          }
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
              "shift",
              "f",
              " ",
              ...Object.keys(oneShot),
            ].includes(key)
          ) {
            e.preventDefault();
            if (!runningRef.current) return;
            keys.current.add(key);
            if (!e.repeat && oneShot[key]) input.current[oneShot[key]] = true;
          }
        }}
        onKeyUp={(e) => {
          const key = e.key.toLowerCase();
          const wasHeld = keys.current.has(key);
          keys.current.delete(key);
          if (key === " " && wasHeld && runningRef.current)
            input.current.shoot = true;
        }}
        onBlur={() => {
          keys.current.clear();
          input.current.shootHeld = false;
        }}
      >
        <div ref={host} className={styles.scene} data-testid="3d-scene" />
        {(!running ||
          !ready ||
          snapshot.phase === "goal" ||
          snapshot.phase === "kickoff") && (
          <div className={styles.overlay}>
            <strong>
              {!ready
                ? error
                  ? "3D graphics unavailable"
                  : "Preparing the stadium…"
                : snapshot.phase === "fulltime"
                  ? "FULL TIME"
                  : snapshot.phase === "goal"
                    ? "GOAL!"
                    : running
                      ? `${Math.ceil(snapshot.phaseTime)} · KICK OFF`
                      : snapshot.elapsed
                        ? "MATCH PAUSED"
                        : "READY TO PLAY"}
            </strong>
            <span>
              {snapshot.phase === "fulltime"
                ? `${snapshot.score[0]} – ${snapshot.score[1]}`
                : !running
                  ? "Start above. Click the pitch for keyboard control."
                  : snapshot.message}
            </span>
          </div>
        )}
        <div className={styles.playerHUD}>
          <span>
            ▲ {selected.number} · {selected.name}
          </span>
          <label>
            Stamina <meter min="0" max="100" value={selected.stamina} />
          </label>
          <label>
            Shot power <meter min="0" max="1" value={snapshot.charge} />
          </label>
        </div>
      </div>
      <p role="status" className={styles.commentary}>
        {snapshot.message}
      </p>
      <div className={styles.controlGuide}>
        <p>
          <b>Move</b> WASD / arrows · <b>Sprint</b> Shift · <b>Shield</b> F ·{" "}
          <b>Body feint</b> Q · <b>Switch</b> C
        </p>
        <p>
          <b>Pass</b> P · <b>Through ball</b> L · <b>Lob</b> O · <b>Tackle</b> J
          · <b>Shoot</b> hold Space, release to kick · <b>Pause</b> Esc
        </p>
        <p>
          Aim passes with the movement keys. Approach from an angle, shield from
          a challenge, and release a charged shot near the box. Yellow marks
          your controlled footballer. Keepers distribute automatically.
        </p>
      </div>
      <div className={styles.touch} aria-label="3D touch controls">
        <div className={styles.dpad}>
          {[
            { name: "Run up", x: 0, z: -1, label: "↑" },
            { name: "Run left", x: -1, z: 0, label: "←" },
            { name: "Run down", x: 0, z: 1, label: "↓" },
            { name: "Run right", x: 1, z: 0, label: "→" },
          ].map((d) => (
            <button
              key={d.name}
              aria-label={d.name}
              disabled={!running}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                input.current.x = d.x;
                input.current.z = d.z;
              }}
              onPointerUp={() => {
                input.current.x = 0;
                input.current.z = 0;
              }}
              onPointerCancel={() => {
                input.current.x = 0;
                input.current.z = 0;
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className={styles.touchActions}>
          {(
            [
              { key: "pass", label: "Pass" },
              { key: "through", label: "Through" },
              { key: "lob", label: "Lob" },
              { key: "tackle", label: "Tackle" },
              { key: "skill", label: "Skill" },
              { key: "switch", label: "Switch" },
            ] as const
          ).map((a) => (
            <button
              key={a.key}
              disabled={!running}
              onClick={() => action(a.key)}
            >
              {a.label}
            </button>
          ))}
          <button
            disabled={!running}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              input.current.shootHeld = true;
            }}
            onPointerUp={() => {
              input.current.shootHeld = false;
              input.current.shoot = true;
            }}
            onPointerCancel={() => {
              input.current.shootHeld = false;
              current.current.charge = 0;
            }}
          >
            Hold / release shot
          </button>
          {(["sprint", "shield"] as const).map((key) => (
            <button
              key={key}
              disabled={!running}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                input.current[key] = true;
              }}
              onPointerUp={() => {
                input.current[key] = false;
              }}
              onPointerCancel={() => {
                input.current[key] = false;
              }}
            >
              Hold {key}
            </button>
          ))}
        </div>
      </div>
      <p className={styles.notes}>
        {controller
          ? "Standard controller detected. Left stick: move · A/Cross: pass · B/Circle: hold/release shot · X/Square: tackle · Y/Triangle: through · LB/L1: switch · RB/R1: sprint · LT/L2: shield · right-stick click: skill."
          : "Optional standard-mapped gamepad support: connect a controller and press a button."}{" "}
        Camera and graphics are experimental. This local exhibition uses your
        XI’s names and ratings but does not write scores to the league. Three
        active minutes, plus restarts. Match progress is discarded on reload.
      </p>
      {snapshot.phase === "fulltime" && (
        <div className="success" role="alert">
          <h3>{snapshot.message}</h3>
          <p>
            Shots: {snapshot.shots[0]} – {snapshot.shots[1]}. Your league
            fixtures and budget are unchanged.
          </p>
        </div>
      )}
    </section>
  );
}
