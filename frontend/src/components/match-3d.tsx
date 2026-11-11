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
import {
  decodeFootballSave, decodeFootballSettings, defaultFootballSettings,
  encodeFootballSave, type FootballSettings,
} from "@/lib/football-session";
import styles from "./match-3d.module.css";
type Props = {
  training?: boolean;
  home: string;
  away: string;
  roster: { name: string; overall: number }[];
  formation: string;
  storageKey?: string;
  onClose: () => void;
};
export default function Match3D({
  training = false,
  home,
  away,
  roster,
  formation,
  storageKey,
  onClose,
}: Props) {
  const [initial] = useState(() => createFootball(roster, formation, training));
  const current = useRef(initial);
  const [snapshot, setSnapshot] = useState<FootballState>(initial);
  const input = useRef<FootballInput>(neutralInput());
  const keys = useRef(new Set<string>());
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [pauseReason, setPauseReason] = useState(
    "Choose Start to begin. Click the pitch for keyboard control.",
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const host = useRef<HTMLDivElement>(null),
    viewport = useRef<HTMLDivElement>(null),
    container = useRef<HTMLElement>(null);
  const cameraRef = useRef<CameraMode>("telecast");
  const [camera, setCamera] = useState<CameraMode>("telecast");
  const settingsRef = useRef<FootballSettings>({...defaultFootballSettings});
  const [settings, setSettings] = useState<FootballSettings>({...defaultFootballSettings});
  const sceneRef = useRef<Awaited<ReturnType<typeof import("@/lib/football-scene").createFootballScene>> | null>(null);
  const [saved, setSaved] = useState<ReturnType<typeof decodeFootballSave>>(null);
  const [saveNotice, setSaveNotice] = useState("");
  const signature = JSON.stringify([home, away, formation, training, roster]);
  const saveKey = storageKey ? `rwog.football.match.v1:${storageKey}:${training ? "training" : "exhibition"}` : null;
  const [controller, setController] = useState(false);
  const [stick, setStick] = useState({ x: 0, z: 0 });
  const stickPointer = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const [sound, setSound] = useState(false);
  function saveCheckpoint() {
    if (!saveKey || current.current.elapsed === 0) return;
    try {
      const raw = encodeFootballSave(current.current, signature);
      localStorage.setItem(saveKey, raw);
      setSaved(decodeFootballSave(raw, signature));
      setSaveNotice("");
    } catch { setSaveNotice("Device storage is unavailable. Keep this tab open to retain the match."); }
  }
  function changeSettings(next: FootballSettings) {
    const oldGraphics = settingsRef.current.graphics;
    settingsRef.current = next;
    setSettings(next);
    cameraRef.current = next.camera;
    setCamera(next.camera);
    current.current.difficulty = next.difficulty;
    if (oldGraphics !== next.graphics) sceneRef.current?.setGraphics(next.graphics);
    try { localStorage.setItem("rwog.football.settings.v1", JSON.stringify(next)); } catch {}
  }
  useEffect(() => {
    try {
      const next = decodeFootballSettings(localStorage.getItem("rwog.football.settings.v1"));
      settingsRef.current = next;
      setSettings(next);
      cameraRef.current = next.camera;
      setCamera(next.camera);
      current.current.difficulty = next.difficulty;
      if (saveKey) {
        const raw = localStorage.getItem(saveKey), checkpoint = decodeFootballSave(raw, signature);
        setSaved(checkpoint);
        if (raw && !checkpoint) setSaveNotice("The previous save is incompatible with this lineup. Start a new match.");
      }
    } catch {}
    const timer = window.setInterval(() => saveCheckpoint(), 2000);
    const leave = () => saveCheckpoint();
    window.addEventListener("pagehide", leave);
    return () => { window.clearInterval(timer); window.removeEventListener("pagehide", leave); };
    // Save the latest simulation ref; HUD updates must not restart this interval.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveKey, signature]);
  useEffect(() => {
    const oldOverflow = document.body.style.overflow, opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !container.current) return;
      const elements = [...container.current.querySelectorAll<HTMLElement>("button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex='0']")]
        .filter(el => el.getClientRects().length > 0);
      const first = elements[0], last = elements.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !container.current.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !container.current.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", trap); opener?.focus(); };
  }, []);
  function clear() {
    keys.current.clear();
    input.current = neutralInput();
    current.current.charge = 0;
    stickPointer.current = null;
    setStick({ x: 0, z: 0 });
  }
  function moveStick(event: React.PointerEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    let x = (event.clientX - box.x - box.width / 2) / (box.width * 0.36);
    let z = (event.clientY - box.y - box.height / 2) / (box.height * 0.36);
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1) {
      x /= magnitude;
      z /= magnitude;
    }
    input.current.x = Math.abs(x) < 0.06 ? 0 : x;
    input.current.z = Math.abs(z) < 0.06 ? 0 : z;
    setStick({ x, z });
  }
  function releaseStick() {
    stickPointer.current = null;
    input.current.x = 0;
    input.current.z = 0;
    setStick({ x: 0, z: 0 });
  }
  function pause(reason = "Paused by you. Resume when you are ready.") {
    setPauseReason(reason);
    runningRef.current = false;
    setRunning(false);
    clear();
    saveCheckpoint();
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
    current.current = createFootball(roster, formation, training);
    current.current.difficulty = settingsRef.current.difficulty;
    setSnapshot(current.current);
    setSaved(null);
    try { if (saveKey) localStorage.removeItem(saveKey); } catch {}
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
    let scene: Awaited<
      ReturnType<typeof import("@/lib/football-scene").createFootballScene>
    > | null = null;
    let previous = 0,
      accumulator = 0,
      lastHUD = 0,
      eventId = 0;
    let lastPad: boolean[] = [];
    setReady(false);
    import("@/lib/football-scene")
      .then(async ({ createFootballScene }) => {
        if (stopped || !host.current) return;
        try {
          scene = await createFootballScene(host.current, () => {
            runningRef.current = false;
            setRunning(false);
            setReady(false);
            setError(
              "The 3D graphics context was lost. Restart the renderer or use the simple 2D mode.",
            );
          }, settingsRef.current.graphics);
          if (stopped) {
            scene.dispose();
            return;
          }
          setReady(true);
          scene.setGraphics(settingsRef.current.graphics);
          sceneRef.current = scene;
          setError("");
        } catch {
          setError(
            "The player assets or 3D graphics could not load. Check your connection and WebGL support, then retry.",
          );
          return;
        }
        const tick = (now: number) => {
          if (stopped || !scene) return;
          const dt = previous
            ? Math.max(0, Math.min((now - previous) / 1000, 0.1))
            : 0;
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
              if (edge(9)) pause();
              lastPad = pressed;
            }
            accumulator += dt;
            let steps = 0;
            while (runningRef.current && accumulator >= 1 / 60 && steps < 6) {
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
          scene.render(
            current.current,
            cameraRef.current,
            dt,
            runningRef.current,
          );
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
      sceneRef.current = null;
    };
    // The scene owns a long-lived RAF loop reading refs; restarting it on every
    // HUD render would discard the renderer, input state and in-flight asset load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  useEffect(() => {
    const blur = () =>
      pause(
        "Paused because this window lost focus. Select Resume to continue.",
      );
    const visibility = () => {
      if (document.hidden)
        pause("Paused because this tab was hidden. Select Resume to continue.");
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
      data-mode={training ? "training" : "exhibition"}
      data-running={running}
    >
      <div className={styles.header}>
        <div>
          <p className="eyebrow">RWG FOOTBALL <span className={styles.liveTag}>MATCHDAY</span></p>
          <h2>{training ? "THE TRAINING GROUND" : "THIS IS YOUR GAME."}</h2>
          <p>
            {training
              ? "Finishing drill · One attacker and goalkeeper · Three active minutes"
              : `11 v 11 · ${formation} · Your saved XI · Exhibition`}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            if (
              current.current.elapsed === 0 ||
              window.confirm(
                "Leave this exhibition? Your progress stays saved on this device when storage is available.",
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
              changeSettings({...settingsRef.current, camera: mode});
            }}
          >
            <option value="telecast">TV broadcast</option>
            <option value="follow">Follow the ball</option>
            <option value="close">Close to the action</option>
            <option value="broadcast">Whole pitch</option>
          </select>
        </label>
        <label>
          Graphics
          <select aria-label="Graphics quality" value={settings.graphics}
            onChange={e => changeSettings({...settingsRef.current, graphics: e.target.value as FootballSettings["graphics"]})}>
            <option value="auto">Automatic</option><option value="performance">Performance</option>
            <option value="balanced">Balanced</option><option value="high">High · shadows</option>
          </select>
        </label>
        <label>
          Opponent
          <select aria-label="Opponent difficulty" value={settings.difficulty} disabled={running}
            onChange={e => changeSettings({...settingsRef.current, difficulty: e.target.value as FootballSettings["difficulty"]})}>
            <option value="casual">Casual</option><option value="club">Club</option><option value="elite">Elite</option>
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
        data-selected={snapshot.selected}
        data-ball-owner={snapshot.ball.owner ?? "loose"}
        data-away-passes={snapshot.passes?.[1] ?? 0}
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
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).tagName === "CANVAS")
            viewport.current?.focus();
        }}
        onBlur={() => {
          keys.current.clear();
          input.current.shootHeld = false;
        }}
      >
        <div ref={host} className={styles.scene} data-testid="3d-scene" />
        <div className={styles.score} aria-label="Live match scoreboard">
          <span title={home}>{home.slice(0, 3).toUpperCase()}</span>
          <strong><span data-testid="3d-home-score">{snapshot.score[0]}</span><i>–</i><span data-testid="3d-away-score">{snapshot.score[1]}</span></strong>
          <span title={away}>{away.slice(0, 3).toUpperCase()}</span>
          <b data-testid="3d-clock">{minute}′ <small>{snapshot.phase === "fulltime" ? "FT" : running ? "LIVE" : "PAUSED"}</small></b>
        </div>
        <div className={styles.broadcastMark}>RWG <span>LIVE</span><small>{training ? "TRAINING" : "EXHIBITION"}</small></div>
        {ready && (
          <svg
            className={styles.minimap}
            viewBox="0 0 110 72"
            role="img"
            aria-label="Live tactical minimap"
          >
            <rect
              x="1"
              y="1"
              width="108"
              height="70"
              rx="3"
              fill="#0b2929dc"
              stroke="#d3eee6"
              strokeWidth="0.5"
            />
            <path
              d="M55 1V71 M1 24H16V48H1 M109 24H94V48H109"
              fill="none"
              stroke="#b7d0c3"
              strokeWidth="0.4"
            />
            <circle
              cx="55"
              cy="36"
              r="9"
              fill="none"
              stroke="#b7d0c3"
              strokeWidth="0.4"
            />
            {snapshot.players.map(
              (player, i) =>
                !player.inactive && (
                  <circle
                    key={i}
                    cx={player.x + 55}
                    cy={player.z + 36}
                    r={i === snapshot.selected ? 2 : 1.4}
                    fill={player.team === 0 ? "#6ae6b9" : "#f1776a"}
                    stroke={i === snapshot.selected ? "#ffe689" : "none"}
                    strokeWidth="0.8"
                  />
                ),
            )}
            <circle
              cx={snapshot.ball.x + 55}
              cy={snapshot.ball.z + 36}
              r="1.1"
              fill="white"
            />
          </svg>
        )}
        {(!running ||
          !ready ||
          snapshot.phase === "goal" ||
          snapshot.phase === "kickoff") && (
          <div className={styles.overlay}>
            {ready && !snapshot.elapsed && <p className={styles.versus}><span>{home}</span><b>V</b><span>{away}</span></p>}
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
                        : "OWN THE PITCH"}
            </strong>
            <span>
              {snapshot.phase === "fulltime"
                ? `${snapshot.score[0]} – ${snapshot.score[1]}`
                : !running
                  ? pauseReason
                  : snapshot.message}
            </span>
            {!running && ready && snapshot.phase !== "fulltime" && (
              <button className={styles.overlayButton} onClick={toggle}>
                {snapshot.elapsed ? "Continue play" : "Kick off"}
              </button>
            )}
            {!running && ready && snapshot.elapsed === 0 && saved && saved.state.elapsed > 0 && (
              <button className={styles.resumeSaved} onClick={() => {
                current.current = saved.state;
                current.current.charge = 0;
                setSnapshot({...current.current});
                setPauseReason("Saved match restored. Continue when you are ready.");
              }}>Resume saved match · {Math.floor(saved.state.elapsed / FOOTBALL_DURATION * 90)}′</button>
            )}
            {ready && (!running || snapshot.phase === "fulltime") && snapshot.elapsed > 0 && (
              <div className={styles.matchStats} aria-label="Exhibition statistics">
                <p><b>{snapshot.shots[0]}</b><span>SHOTS</span><b>{snapshot.shots[1]}</b></p>
                <p><b>{snapshot.passes?.[0] ?? 0}</b><span>PASSES</span><b>{snapshot.passes?.[1] ?? 0}</b></p>
                <p><b>{snapshot.completedPasses?.[0] ?? 0}</b><span>COMPLETED</span><b>{snapshot.completedPasses?.[1] ?? 0}</b></p>
              </div>
            )}
            {snapshot.phase === "fulltime" && <button className={styles.overlayButton} onClick={restart}>Play again</button>}
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
        <span className={styles.commentaryLabel}>TOUCHLINE</span> {snapshot.message}
      </p>
      {saveNotice && <p className={styles.saveNotice} role="status">{saveNotice}</p>}
      <details className={styles.controlGuide}>
        <summary>Controls & match guide</summary>
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
      </details>
      <div className={styles.touch} aria-label="3D touch controls">
        <div className={styles.stickGroup}>
          <button
            className={styles.stick}
            aria-label="360 degree movement stick"
            disabled={!running}
            onPointerDown={(e) => {
              e.preventDefault();
              stickPointer.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              moveStick(e);
            }}
            onPointerMove={(e) => {
              if (stickPointer.current === e.pointerId) moveStick(e);
            }}
            onPointerUp={releaseStick}
            onPointerCancel={releaseStick}
            onLostPointerCapture={releaseStick}
          >
            <span
              style={{
                transform: `translate(${stick.x * 36}px, ${stick.z * 36}px)`,
              }}
            />
          </button>
          <small>Drag in any direction</small>
        </div>
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
        <span className={styles.rotateHint}>Rotate your phone for a wider pitch. </span>
        {controller
          ? "Standard controller detected. Left stick: move · A/Cross: pass · B/Circle: hold/release shot · X/Square: tackle · Y/Triangle: through · LB/L1: switch · RB/R1: sprint · LT/L2: shield · right-stick click: skill."
          : "Optional standard-mapped gamepad support: connect a controller and press a button."}{" "}
        Your saved XI · Three active minutes, plus restarts · Exhibition scores stay separate from the league.
        {saveKey ? " Progress saves on this device; choose Resume saved match when returning." : " Match progress lasts while this view stays open."}
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
