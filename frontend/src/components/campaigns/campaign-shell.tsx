import Link from "next/link";
import styles from "./campaigns.module.css";
export default function CampaignShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className={styles.shell}>
      <nav className={styles.nav} aria-label="Game navigation">
        <Link className={styles.brand} href="/games">
          RWOG
        </Link>
        <Link href="/games">All games</Link>
        <Link href="/dashboard">Football office</Link>
        <Link href="/">Home</Link>
      </nav>
      {children}
    </main>
  );
}
