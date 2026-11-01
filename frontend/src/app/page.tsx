import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 sm:p-14">
        <p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-[var(--primary)]">
          Renewed World of Games
        </p>
        <h1 className="mb-6 text-4xl font-extrabold leading-tight sm:text-6xl">
          Build your club.
          <br />
          Write your season.
        </h1>
        <p className="mb-8 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
          Take charge of a football team. Select your starting XI, compete in
          the Founders League, and find the next player who can make the
          difference.
        </p>
        <div className="mb-9 grid gap-4 text-sm sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--surface-border)] p-4">
            <strong className="text-[var(--primary)]">Your squad</strong>
            <p className="mt-2 text-[var(--muted)]">
              18 players. Three formations. Your selection.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-4">
            <strong className="text-[var(--primary)]">Your league</strong>
            <p className="mt-2 text-[var(--muted)]">
              Six clubs. Ten matchdays. One final table.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] p-4">
            <strong className="text-[var(--primary)]">Your decisions</strong>
            <p className="mt-2 text-[var(--muted)]">
              Manage your budget and strengthen your team.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-[var(--primary)] px-7 py-3 font-semibold text-black hover:bg-[var(--primary-dark)]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-[var(--surface-border)] px-7 py-3 font-semibold hover:border-[var(--primary)]"
          >
            Create your club
          </Link>
        </div>
        <Link
          href="/ludo"
          className="mt-6 inline-block font-semibold text-[var(--primary)]"
        >
          Play Ludo with friends →
        </Link>
        <p className="mt-7 text-xs text-[var(--muted)]">
          Playable MVP · Single-manager seasons against fictional clubs
        </p>
      </div>
    </main>
  );
}
