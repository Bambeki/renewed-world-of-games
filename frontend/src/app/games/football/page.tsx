"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import CampaignShell from "@/components/campaigns/campaign-shell";
import styles from "./quick-play.module.css";

const Match3D = dynamic(() => import("@/components/match-3d"), {
  ssr: false,
  loading: () => <p role="status">Opening the pitch…</p>,
});
const roster = ["A. Reed", "M. Silva", "I. Mensah", "L. Berg", "S. Okoro", "N. Vale", "K. Laurent", "D. Costa", "E. Park", "J. Kamara", "R. Stone"]
  .map((name) => ({ name, overall: 68 }));

export default function FootballQuickPlay() {
  const [formation, setFormation] = useState("4-4-2");
  const [mode, setMode] = useState<"match" | "training" | null>(null);
  return (
    <>
      <CampaignShell>
        <div className={styles.hero}>
          <div className={styles.intro}>
            <p className={styles.kicker}>RWG FOOTBALL / QUICK PLAY</p>
            <h1>Straight to<br /><em>the pitch.</em></h1>
            <p>
              Find the space. Play the pass. Finish the move. Take your side
              into a three-minute exhibition against the computer.
            </p>
            <div className={styles.tags} aria-label="Match format">
              <span>11 v 11</span><span>Single player</span><span>No sign-in needed</span>
            </div>
            <div className={styles.formation}>
              <label htmlFor="quick-play-formation">Your formation</label>
              <select id="quick-play-formation" value={formation} onChange={(event) => setFormation(event.target.value)}>
                <option value="4-4-2">4-4-2 · Balanced</option>
                <option value="4-3-3">4-3-3 · Wide attack</option>
                <option value="3-5-2">3-5-2 · Midfield numbers</option>
              </select>
            </div>
            <div className={styles.actions}>
              <button className={styles.play} onClick={() => setMode("match")}>Play quick match <span aria-hidden="true">↗</span></button>
              <button onClick={() => setMode("training")}>Practice finishing</button>
            </div>
            <p className={styles.note}>Progress saves on this device for each formation. This exhibition is separate from your club season.</p>
          </div>
          <div className={styles.matchup}>
            <p>THE MATCHDAY</p>
            <div className={styles.field} aria-hidden="true">
              <i className={styles.half} /><i className={styles.circle} />
              <i className={styles.leftBox} /><i className={styles.rightBox} />
              <span className={styles.homeDot} /><span className={styles.awayDot} /><span className={styles.ball} />
            </div>
            <div className={styles.teams}><strong>Renewed<br />FC</strong><span>VS</span><strong>Founders<br />United</strong></div>
            <p>Original clubs. Your next good move.</p>
          </div>
        </div>
        <div className={styles.guide}>
          <article><span>01 / MOVE</span><h2>Make your angle.</h2><p>WASD or arrows to move. Shift to sprint. On a phone, use the on-screen stick.</p></article>
          <article><span>02 / BUILD</span><h2>Play together.</h2><p>P to pass, L for a through ball, O to lob. Teammates move to offer support.</p></article>
          <article><span>03 / FINISH</span><h2>Pick your moment.</h2><p>Hold Space for power, release to shoot. Practice one-on-one with the keeper first.</p></article>
        </div>
        <p className={styles.footer}>Browser playtest · <Link href="/matches">Play with your club</Link> · <Link href="/games">Explore all games</Link></p>
      </CampaignShell>
      {mode && <div className="game">
        <Match3D home="Renewed FC" away="Founders United" roster={roster} formation={formation}
          squadLabel="Exhibition XI" training={mode === "training"} storageKey={`quickplay:${formation}`}
          onClose={() => setMode(null)} />
      </div>}
    </>
  );
}
