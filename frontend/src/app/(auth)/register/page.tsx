import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-8">
      <h1 className="mb-2 text-2xl font-bold">Create account</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Registration will be implemented in Phase 1.
      </p>

      <form className="space-y-4">
        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            disabled
            placeholder="manager123"
            className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm opacity-60"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            disabled
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm opacity-60"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            disabled
            placeholder="••••••••"
            className="w-full rounded-lg border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-sm opacity-60"
          />
        </div>
        <button
          type="button"
          disabled
          className="w-full rounded-lg bg-[var(--primary)] py-2.5 text-sm font-medium text-black opacity-60"
        >
          Register (Phase 1)
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--muted)]">
        Already have an account?{' '}
        <Link href="/login" className="text-[var(--primary)] hover:underline">
          Log in
        </Link>
      </p>
      <p className="mt-2 text-center text-sm">
        <Link href="/" className="text-[var(--muted)] hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
