import Link from 'next/link';
import { checkBackendHealth } from '@/lib/api';

export default async function DashboardPage() {
  const health = await checkBackendHealth();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Dashboard</h1>
      <p className="mb-8 text-[var(--muted)]">
        Blank dashboard shell — game features arrive in later phases.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-6">
          <h2 className="mb-2 font-semibold">System status</h2>
          {health ? (
            <ul className="space-y-1 text-sm text-[var(--muted)]">
              <li>
                API:{' '}
                <span className="text-[var(--primary)]">{health.status}</span>
              </li>
              <li>
                Database:{' '}
                <span className="text-[var(--primary)]">
                  {health.services.database}
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-sm text-red-400">Backend not reachable</p>
          )}
        </div>

        <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-6">
          <h2 className="mb-2 font-semibold">Coming in Phase 1</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-[var(--muted)]">
            <li>User registration &amp; login</li>
            <li>Create your football team</li>
            <li>Auto-generated squad</li>
          </ul>
        </div>
      </div>

      <p className="mt-8 text-sm text-[var(--muted)]">
        <Link href="/" className="hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
