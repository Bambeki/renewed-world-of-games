"use client";
import { useEffect, useState } from "react";
import {
  LUDO_COLORS,
  LUDO_FINISH,
  LUDO_SAFE,
  LUDO_TRACK,
  LudoColor,
  LudoCount,
  LudoState,
  ludoMoves,
  ludoPosition,
  moveLudo,
  newLudo,
  parseLudo,
  rollLudo,
} from "@rwog/shared";
import "./ludo.css";
const SAVE_KEY = "rwog_ludo_v1";
const colorNames = {
  red: "Red",
  green: "Green",
  yellow: "Yellow",
  blue: "Blue",
};
const laneColor = (r: number, c: number): LudoColor | null =>
  r === 7 && c >= 1 && c <= 5
    ? "red"
    : c === 7 && r >= 1 && r <= 5
      ? "green"
      : r === 7 && c >= 9 && c <= 13
        ? "yellow"
        : c === 7 && r >= 9 && r <= 13
          ? "blue"
          : null;
function dieRoll() {
  const n = new Uint32Array(1);
  do {
    crypto.getRandomValues(n);
  } while (n[0] >= 4294967292);
  return (n[0] % 6) + 1;
}
export default function LudoPage() {
  const [game, setGame] = useState<LudoState | null>(null),
    [count, setCount] = useState<LudoCount>(2),
    [names, setNames] = useState(["", "", "", ""]),
    [ready, setReady] = useState(false),
    [storageMessage, setStorageMessage] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const saved = parseLudo(raw);
        if (saved) {
          setGame(saved);
          setCount(saved.players.length as LudoCount);
          setNames(
            [...saved.players.map((p) => p.name), "", "", "", ""].slice(0, 4),
          );
        } else
          setStorageMessage(
            "The saved game could not be restored. Start a new game below.",
          );
      }
    } catch {
      setStorageMessage(
        "Browser storage is unavailable. You can still play, but progress may not survive a reload.",
      );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !game) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } catch {
      setStorageMessage(
        "This game could not be saved. Keep this tab open to continue playing.",
      );
    }
  }, [game, ready]);
  const legal = game ? ludoMoves(game) : [];
  const active = game?.players[game.current];
  function changeGame() {
    if (window.confirm("End this local Ludo game and choose new players?")) {
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {}
      setGame(null);
    }
  }
  if (!ready)
    return (
      <div className="game">
        <h1>Ludo</h1>
        <p>Loading your local game…</p>
      </div>
    );
  return (
    <div className="game ludo-page">
      <header className="club-header">
        <div>
          <p className="eyebrow">RENEWED WORLD OF GAMES · GAME NIGHT</p>
          <h1>Ludo</h1>
          <p>Roll, race, capture. Bring everyone home.</p>
        </div>
        <span className="badge">Pass & play · One device</span>
      </header>
      {storageMessage && (
        <p className="alert" role="alert">
          {storageMessage}
        </p>
      )}
      {!game ? (
        <section className="ludo-setup">
          <h2>Who’s playing?</h2>
          <p>
            Two to four people take turns on this device. No account is required.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setGame(newLudo(count, names));
            }}
          >
            <label htmlFor="ludo-count">Players</label>
            <select
              id="ludo-count"
              value={count}
              onChange={(e) => setCount(Number(e.target.value) as LudoCount)}
            >
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} players
                </option>
              ))}
            </select>
            <div className="ludo-names">
              {Array.from({ length: count }, (_, i) => (
                <label key={i}>
                  Player {i + 1} name
                  <input
                    maxLength={24}
                    placeholder={`Player ${i + 1}`}
                    value={names[i]}
                    onChange={(e) =>
                      setNames((old) =>
                        old.map((n, j) => (j === i ? e.target.value : n)),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <button type="submit">Start Ludo</button>
          </form>
        </section>
      ) : (
        <>
          <div className="ludo-game-layout">
            <section className="ludo-board-section">
              <div className="ludo-board-heading">
                <h2>The board</h2>
                <span>★ Safe square</span>
              </div>
              <div className="ludo-board" role="group" aria-label="Ludo board">
                {LUDO_COLORS.map((color, i) => (
                  <div
                    key={color}
                    className={`ludo-yard ludo-${color}`}
                    style={{
                      top: i < 2 ? "0" : "60%",
                      left: i === 0 || i === 3 ? "0" : "60%",
                    }}
                    aria-hidden="true"
                  >
                    <span>{colorNames[color]}</span>
                  </div>
                ))}
                <div className="ludo-centre" aria-hidden="true" />
                {Array.from({ length: 225 }, (_, index) => {
                  const r = Math.floor(index / 15),
                    c = index % 15;
                  const track = LUDO_TRACK.findIndex(
                    ([tr, tc]) => tr === r && tc === c,
                  );
                  const lane = laneColor(r, c);
                  const start =
                    track >= 0 && track % 13 === 0
                      ? LUDO_COLORS[track / 13]
                      : null;
                  const safe = LUDO_SAFE.includes(track);
                  const tokens = game.players.flatMap((p) =>
                    p.tokens.flatMap((step, i) => {
                      const [tr, tc] = ludoPosition(p.color, step, i);
                      return tr === r && tc === c ? [{ p, i, step }] : [];
                    }),
                  );
                  return (
                    <div
                      key={index}
                      className={`ludo-cell ${track >= 0 ? "ludo-track" : ""} ${lane || start ? `ludo-${lane || start}` : ""} ${tokens.length > 1 ? "ludo-stacked" : ""}`}
                      style={{ gridRow: r + 1, gridColumn: c + 1 }}
                    >
                      {safe && (
                        <span className="ludo-safe" aria-hidden="true">
                          ★
                        </span>
                      )}
                      {tokens.map(({ p, i, step }) => (
                        <button
                          type="button"
                          key={`${p.color}-${i}`}
                          className={`ludo-token ludo-${p.color} ${active?.color === p.color && legal.includes(i) ? "ludo-playable" : ""}`}
                          disabled={
                            active?.color !== p.color || !legal.includes(i)
                          }
                          onClick={() =>
                            setGame((old) =>
                              old && ludoMoves(old).includes(i)
                                ? moveLudo(old, i)
                                : old,
                            )
                          }
                          aria-label={`${p.name} ${colorNames[p.color]} token ${i + 1}: ${step === -1 ? "yard" : step === LUDO_FINISH ? "finished" : step >= 51 ? "home lane" : `square ${step + 1}`}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <p className="ludo-board-note">
                Follow your colour around the board, then enter your home lane.
                Token numbers match the move buttons.
              </p>
            </section>
            <div className="ludo-side">
              <section className={`ludo-turn ludo-accent-${active!.color}`}>
                <p className="eyebrow">
                  {game.winner ? "WINNER" : "CURRENT TURN"}
                </p>
                <h2>
                  {active!.name}{" "}
                  <span className="ludo-colour-tag">
                    {colorNames[active!.color]}
                  </span>
                </h2>
                <p role="status" aria-live="polite">
                  {game.message}
                </p>
                <div className="ludo-roll-row">
                  <output className="ludo-die" aria-label="Last roll">
                    {game.lastRoll ?? "—"}
                  </output>
                  <button
                    disabled={game.die !== null || game.winner !== null}
                    onClick={() =>
                      setGame((old) =>
                        old && !old.winner && old.die === null
                          ? rollLudo(old, dieRoll())
                          : old,
                      )
                    }
                  >
                    Roll die
                  </button>
                </div>
                {game.die !== null && (
                  <div
                    className="ludo-move-list"
                    role="group"
                    aria-label="Available moves"
                  >
                    {legal.map((i) => (
                      <button
                        key={i}
                        onClick={() =>
                          setGame((old) =>
                            old && ludoMoves(old).includes(i)
                              ? moveLudo(old, i)
                              : old,
                          )
                        }
                      >
                        Move token {i + 1}
                        {active!.tokens[i] === -1 ? " · enter" : ""}
                      </button>
                    ))}
                  </div>
                )}
                {game.winner && (
                  <button
                    onClick={() => {
                      setGame(
                        newLudo(
                          game.players.length as LudoCount,
                          game.players.map((p) => p.name),
                        ),
                      );
                    }}
                  >
                    Play again
                  </button>
                )}
                <button className="secondary" onClick={changeGame}>
                  New game
                </button>
              </section>
              <section>
                <h2>Race to home</h2>
                <div className="ludo-scoreboard">
                  {game.players.map((p, i) => (
                    <article
                      key={p.color}
                      className={
                        i === game.current ? "ludo-current-player" : ""
                      }
                    >
                      <span
                        className={`ludo-player-dot ludo-${p.color}`}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{p.name}</strong>
                        <small>
                          {colorNames[p.color]} ·{" "}
                          {p.tokens.filter((t) => t === -1).length} in yard
                        </small>
                      </div>
                      <b>
                        {p.tokens.filter((t) => t === LUDO_FINISH).length}/4
                        home
                      </b>
                    </article>
                  ))}
                </div>
              </section>
              <details className="ludo-history">
                <summary>Recent moves</summary>
                {game.history.length ? (
                  game.history.map((h, i) => <p key={i}>{h}</p>)
                ) : (
                  <p>The first roll starts the story.</p>
                )}
              </details>
            </div>
          </div>
        </>
      )}
      <details className="ludo-rules" open={!game}>
        <summary>How to play · RWOG house rules</summary>
        <ol>
          <li>
            Roll a six to bring a token out of the yard. You can instead move a
            token already on the board.
          </li>
          <li>
            Roll, then choose one highlighted token or its move button. A six
            earns another roll, including when no token can move.
          </li>
          <li>
            Landing on an opponent sends their tokens on that square back to the
            yard. Squares marked ★ are safe; tokens sharing those squares cannot
            be captured.
          </li>
          <li>
            Your own tokens may share squares. There are no blockades, capture
            bonuses or three-sixes penalties in this version.
          </li>
          <li>
            Roll the exact number to reach home. Finished tokens cannot move. If
            you have no legal move, the turn passes unless you rolled six.
          </li>
          <li>
            The first player to bring all four tokens home wins. Two-player
            games use opposite colours: red and yellow.
          </li>
        </ol>
        <p>
          Progress is saved only in this browser. Clearing browser data removes
          it. This version has no online rooms, bots or shared account progress.
        </p>
      </details>
    </div>
  );
}
