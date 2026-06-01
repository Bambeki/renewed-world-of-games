import Link from 'next/link';
import { checkBackendHealth } from '@/lib/api';

export default async function HomePage() {
  const health = await checkBackendHealth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-8 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[var(--primary)]">
          Phase 0
        </p>
        <h1 className="mb-4 text-3xl font-bold">Renewed World of Games</h1>
        <p className="mb-8 text-[var(--muted)]">
          Multiplayer football management — foundation setup complete.
        </p>

        <div className="mb-8 rounded-lg border border-[var(--surface-border)] bg-[var(--background)] p-4 text-left text-sm">
          <p className="mb-1 font-medium">Backend status</p>
          {health ? (
            <p className="text-[var(--primary)]">
              Connected — database: {health.services.database}
            </p>
          ) : (
            <p className="text-red-400">
              Unreachable — start Docker and the backend server
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-lg bg-[var(--primary)] px-6 py-2.5 font-medium text-black transition hover:bg-[var(--primary-dark)]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-[var(--surface-border)] px-6 py-2.5 font-medium transition hover:border-[var(--primary)]"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
