"use client";
import Link from "next/link";
import MatchArcade from "./match-arcade";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formations, Formation, GameView } from "@rwog/shared";
import { getApiUrl } from "@/lib/api";
const money = (n: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
export default function GamePanel({ mode = "overview" }: { mode?: string }) {
  const router = useRouter();
  const [game, setGame] = useState<GameView | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [formation, setFormation] = useState<Formation>("4-4-2");
  const [lineup, setLineup] = useState<string[]>([]);
  const [arcadeOpen, setArcadeOpen] = useState(false);
  const [resultId, setResultId] = useState<number | null>(null);
  async function request(path = "", body?: object, method = "POST") {
    const token = localStorage.getItem("rwog_token");
    if (!token) {
      router.replace("/login");
      throw new Error("Please log in.");
    }
    const res = await fetch(`${getApiUrl()}/game${path}`, {
      method: body ? method : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 401) {
      localStorage.removeItem("rwog_token");
      router.replace("/login");
      throw new Error("Session expired. Please log in again.");
    }
    const data = await res.json();
    if (!res.ok)
      throw new Error(
        Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message || "Unable to update club.",
      );
    return data as GameView;
  }
  function accept(data: GameView) {
    setGame(data);
    setFormation(data.season.formation);
    setLineup(data.season.lineup);
  }
  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("rwog_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    fetch(`${getApiUrl()}/game`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          throw new Error("Please log in again.");
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load club.");
        if (active) accept(data);
      })
      .catch((e) => {
        if (active) setError(e.message || "Unable to reach server.");
      });
    return () => {
      active = false;
    };
  }, [router]);
  async function act(path: string, body: object = {}, method = "POST") {
    if (!game || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await request(
        path,
        { ...body, revision: game.season.revision },
        method,
      );
      accept(data);
      setNotice(
        path === "/play"
          ? "Matchday complete. Results and standings updated."
          : path === "/lineup"
            ? "Starting XI saved."
            : "Transfer completed.",
      );
      if (path === "/play")
        setResultId(
          data.season.fixtures
            .filter(
              (f) =>
                (f.home === data.team.id || f.away === data.team.id) &&
                f.homeGoals !== null,
            )
            .at(-1)?.id ?? null,
        );
    } catch (e) {
      setError((e as Error).message);
      try {
        accept(await request());
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  if (!game)
    return (
      <div className="game">
        <h1>Your club</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
            <Link href="/login">Log in</Link>
          </>
        ) : (
          <p>Loading your club…</p>
        )}
      </div>
    );
  const { team, players, season } = game;
  const club = (id: string) =>
    season.clubs.find((c) => c.id === id)?.name || id;
  const mine = season.fixtures.filter(
    (f) => f.home === team.id || f.away === team.id,
  );
  const next = mine.find((f) => f.homeGoals === null);
  const last = mine.filter((f) => f.homeGoals !== null).at(-1);
  const row = game.standings.find((s) => s.id === team.id)!;
  const result = season.fixtures.find((f) => f.id === resultId);
  const positions = ["GK", "DEF", "MID", "FWD"].flatMap((pos, i) =>
    Array<string>(formations[formation][i]).fill(pos),
  );
  function changeFormation(f: Formation) {
    setFormation(f);
    setNotice("");
    setLineup(
      ["GK", "DEF", "MID", "FWD"].flatMap((pos, i) =>
        players
          .filter((p) => p.position === pos)
          .sort((a, b) => b.overall - a.overall)
          .slice(0, formations[f][i])
          .map((p) => p.id),
      ),
    );
  }
  return (
    <div className="game" aria-busy={busy}>
      <header className="club-header">
        <div>
          <p className="eyebrow">RENEWED WORLD OF GAMES · FOUNDERS LEAGUE</p>
          <h1>{team.name}</h1>
          <p>Your club. Your decisions. Your season.</p>
        </div>
        <span className="badge">Investor MVP · Single manager</span>
      </header>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <div className="stats">
        <article>
          <small>League position</small>
          <strong>
            #{game.standings.findIndex((s) => s.id === team.id) + 1} / 6
          </strong>
        </article>
        <article>
          <small>Points</small>
          <strong>
            {row.points} <small>from {row.played} played</small>
          </strong>
        </article>
        <article>
          <small>Transfer budget</small>
          <strong>{money(team.budget)}</strong>
        </article>
        <article>
          <small>Squad</small>
          <strong>
            {players.length} <small>players · {season.formation}</small>
          </strong>
        </article>
      </div>
      {mode === "matches" && (
        <section>
          <p className="eyebrow">TAKE CONTROL</p>
          <h2>Play football on the pitch</h2>
          <p>
            Move, pass and shoot in a two-minute 2D exhibition against the
            computer. Exhibition scores stay separate from your league season.
          </p>
          <button onClick={() => setArcadeOpen(true)} disabled={arcadeOpen}>
            Play live exhibition
          </button>
        </section>
      )}
      {arcadeOpen && (
        <MatchArcade
          home={team.name}
          away={
            next
              ? club(next.home === team.id ? next.away : next.home)
              : "RWOG Visitors"
          }
          onClose={() => setArcadeOpen(false)}
        />
      )}
      {result && (
        <section className="report" role="region" aria-label="Match report">
          <button className="secondary" onClick={() => setResultId(null)}>
            Close report
          </button>
          <p className="eyebrow">FULL TIME · ROUND {result.round}</p>
          <h2>
            {club(result.home)} {result.homeGoals} – {result.awayGoals}{" "}
            {club(result.away)}
          </h2>
          {result.events.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </section>
      )}
      {mode === "overview" && (
        <>
          <div className="two-col">
            <section>
              <p className="eyebrow">NEXT MATCHDAY</p>
              <h2>
                {next
                  ? `${club(next.home)} vs ${club(next.away)}`
                  : "Season complete"}
              </h2>
              <p>
                {next
                  ? `Round ${next.round} of 10 · All three league fixtures are simulated together.`
                  : "All 10 rounds played. Review your final standings below."}
              </p>
              <Link className="button" href="/lineup">
                Prepare starting XI
              </Link>{" "}
              <Link className="button secondary" href="/matches">
                Go to match centre
              </Link>
            </section>
            <section>
              <p className="eyebrow">CLUB OFFICE</p>
              <h2>Build a winning team</h2>
              <p>
                Inspect your players, choose a formation, and strengthen your
                squad.
              </p>
              <Link href="/squad">View squad →</Link>
              <br />
              <Link href="/transfers">Open transfer market →</Link>
              <br />
              <Link href="/team">Edit club identity →</Link>
            </section>
          </div>
          {last && (
            <section>
              <h2>Latest result</h2>
              <p>
                {club(last.home)}{" "}
                <b>
                  {last.homeGoals} – {last.awayGoals}
                </b>{" "}
                {club(last.away)}
              </p>
              <button
                className="secondary"
                onClick={() => setResultId(last.id)}
              >
                View match report
              </button>
            </section>
          )}
        </>
      )}
      {mode === "lineup" && (
        <section>
          <h2>Starting XI</h2>
          <p>
            Select one goalkeeper and the required players for each position.
            Save before playing.
          </p>
          <label>
            Formation{" "}
            <select
              aria-label="Formation"
              value={formation}
              disabled={busy}
              onChange={(e) => changeFormation(e.target.value as Formation)}
            >
              {Object.keys(formations).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <div className="lineup-grid">
            {positions.map((pos, i) => (
              <label key={i} className="player-slot">
                <span>
                  {pos} · Slot {i + 1}
                </span>
                <select
                  aria-label={`${pos} slot ${i + 1}`}
                  value={lineup[i] || ""}
                  disabled={busy}
                  onChange={(e) =>
                    setLineup((old) =>
                      old.map((id, index) =>
                        index === i ? e.target.value : id,
                      ),
                    )
                  }
                >
                  <option value="">Choose player</option>
                  {players
                    .filter((p) => p.position === pos)
                    .map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={lineup.includes(p.id) && lineup[i] !== p.id}
                      >
                        {p.firstName} {p.lastName} · {p.overall}
                      </option>
                    ))}
                </select>
                {lineup[i] && (
                  <Link href={`/players/${lineup[i]}`}>Player details →</Link>
                )}
              </label>
            ))}
          </div>
          <button
            disabled={
              busy ||
              lineup.length !== 11 ||
              new Set(lineup).size !== 11 ||
              lineup.includes("")
            }
            onClick={() =>
              act("/lineup", { formation, playerIds: lineup }, "PUT")
            }
          >
            {busy ? "Saving…" : "Save starting XI"}
          </button>
          <p className="hint">
            Saved formation: {season.formation}. Unsaved choices do not affect
            match simulation.
          </p>
        </section>
      )}
      {mode === "matches" && (
        <section>
          <h2>League simulation</h2>
          <p>
            Instant league simulation uses the saved starting XI’s average
            rating, opponent strength, home advantage, and random scoring
            chances.
          </p>
          {next ? (
            <>
              <h3>
                Round {next.round}: {club(next.home)} vs {club(next.away)}
              </h3>
              <p>
                Saved formation: {season.formation} · {season.lineup.length}/11
                starters
              </p>
              <button disabled={busy} onClick={() => act("/play")}>
                {busy ? "Simulating…" : `Simulate league matchday ${next.round}`}
              </button>
            </>
          ) : (
            <p className="success">Season complete — all fixtures played.</p>
          )}
          <Link className="inline-link" href="/lineup">
            Edit starting XI →
          </Link>
        </section>
      )}
      {(mode === "league" || mode === "overview") && (
        <section>
          <h2>League standings</h2>
          <p>
            Three points for a win, one for a draw. Ties: goal difference, goals
            scored, club name.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "#",
                    "Club",
                    "P",
                    "W",
                    "D",
                    "L",
                    "GF",
                    "GA",
                    "GD",
                    "Pts",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {game.standings.map((s, i) => (
                  <tr
                    key={s.id}
                    className={s.id === team.id ? "your-club" : ""}
                  >
                    <td>{i + 1}</td>
                    <td>
                      {s.name}
                      {s.id === team.id ? " (you)" : ""}
                    </td>
                    <td>{s.played}</td>
                    <td>{s.won}</td>
                    <td>{s.drawn}</td>
                    <td>{s.lost}</td>
                    <td>{s.gf}</td>
                    <td>{s.ga}</td>
                    <td>{s.gf - s.ga}</td>
                    <td>
                      <b>{s.points}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {(mode === "league" || mode === "matches") && (
        <section>
          <h2>
            {mode === "league"
              ? "All league fixtures"
              : "Your fixtures & results"}
          </h2>
          <div className="fixtures">
            {(mode === "league" ? season.fixtures : mine).map((f) => (
              <article key={f.id}>
                <small>Round {f.round}</small>
                <span>
                  {club(f.home)}{" "}
                  <b>
                    {f.homeGoals === null
                      ? "vs"
                      : `${f.homeGoals} – ${f.awayGoals}`}
                  </b>{" "}
                  {club(f.away)}
                </span>
                {f.homeGoals !== null ? (
                  <button
                    className="secondary"
                    onClick={() => setResultId(f.id)}
                  >
                    Report
                  </button>
                ) : (
                  <small>Scheduled</small>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
      {mode === "transfers" && (
        <>
          <section>
            <h2>Transfer market</h2>
            <p>
              Fixed-price signings are immediate. Maximum squad: 25. No
              negotiations or wages charged in this demo.
            </p>
            <div className="market-grid">
              {season.market.map((p) => (
                <article key={p.id}>
                  <small>
                    {p.position} · Age {p.age}
                  </small>
                  <h3>
                    {p.firstName} {p.lastName}
                  </h3>
                  <p>
                    Overall {p.overall} · {money(p.price)}
                  </p>
                  <button
                    disabled={
                      busy || team.budget < p.price || players.length >= 25
                    }
                    onClick={() => act("/buy", { playerId: p.id })}
                  >
                    Sign {p.lastName}
                  </button>
                </article>
              ))}
            </div>
          </section>
          <section>
            <h2>Sell a squad player</h2>
            <p>
              Sale value is overall × €2,000. Starters cannot be sold.
              Positional minimums preserve playable formations.
            </p>
            <div className="fixtures">
              {players.map((p) => (
                <article key={p.id}>
                  <Link href={`/players/${p.id}`}>
                    {p.firstName} {p.lastName} · {p.position}
                  </Link>
                  <span>{money(p.overall * 2000)}</span>
                  <button
                    className="secondary"
                    disabled={busy || season.lineup.includes(p.id)}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Sell ${p.firstName} ${p.lastName} for ${money(p.overall * 2000)}?`,
                        )
                      )
                        void act("/sell", { playerId: p.id });
                    }}
                  >
                    {season.lineup.includes(p.id)
                      ? "Starting XI"
                      : "Sell player"}
                  </button>
                </article>
              ))}
            </div>
          </section>
          <section>
            <h2>Transfer activity</h2>
            {season.transfers.length ? (
              season.transfers.map((t, i) => <p key={i}>{t}</p>)
            ) : (
              <p>No transfers yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
