import Link from "next/link";
import CampaignShell from "@/components/campaigns/campaign-shell";
import styles from "@/components/campaigns/campaigns.module.css";
const games = [
  {
    title: "RWG Football",
    kind: "11 v 11 · Matchday",
    text: "Your club, on the pitch. Animated players, a TV broadcast camera, passing opponents and a match you can resume on this device.",
    href: "/matches",
    action: "Enter matchday",
  },
  {
    title: "Football laboratory",
    kind: "3D training · Signed-in club",
    text: "Master movement and foot touches against a goalkeeper. Clear start/resume controls and a focused training pitch.",
    href: "/training",
    action: "Open training",
  },
  {
    title: "Founders League",
    kind: "Football management · Playable MVP",
    text: "Build your XI, manage transfers, simulate your season or launch the experimental 3D exhibition.",
    href: "/dashboard",
    action: "Manage your club",
  },
  {
    title: "Jack & Rose: Lost Signals",
    kind: "Original mission adventure · Prototype",
    text: "Two explorers. Three stormbound missions. Switch between strength and engineering to restore signals and bring everyone home.",
    href: "/games/adventure",
    action: "Play Jack & Rose",
  },
  {
    title: "Standards of Rome",
    kind: "Turn-based tactics · Prototype",
    text: "Command legionaries, archers and cavalry through three frontier battles. Defend your fort, manage supplies and secure the crossing.",
    href: "/games/rome",
    action: "Play Standards of Rome",
  },
  {
    title: "Ludo",
    kind: "Local 2–4 players · Playable MVP",
    text: "A shared-device race with captures, safe squares and a saved game you can resume.",
    href: "/ludo",
    action: "Play Ludo",
  },
];
export default function Games() {
  return (
    <CampaignShell>
      <p className={styles.eyebrow}>
        RENEWED WORLD OF GAMES · PLAYTEST COLLECTION
      </p>
      <h1>Choose your next world.</h1>
      <p>
        Football, exploration missions and frontier tactics. This candidate is
        open for playtesting; individual game status is shown below.
      </p>
      <div className={styles.cards}>
        {games.map((g) => (
          <article key={g.href} className={styles.card}>
            <span className={styles.badge}>{g.kind}</span>
            <h2>{g.title}</h2>
            <p>{g.text}</p>
            <Link className={styles.linkButton} href={g.href}>
              {g.action} →
            </Link>
          </article>
        ))}
      </div>
      <p className={styles.small}>
        Adventure and tactics campaigns save to this browser. They are
        single-player games with computer-controlled opponents where applicable.
        No purchases or online multiplayer are included.
      </p>
    </CampaignShell>
  );
}
