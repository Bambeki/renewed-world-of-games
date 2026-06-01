import Link from 'next/link';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/team', label: 'Team', disabled: true },
  { href: '/dashboard/players', label: 'Players', disabled: true },
  { href: '/dashboard/matches', label: 'Matches', disabled: true },
  { href: '/dashboard/league', label: 'League', disabled: true },
  { href: '/dashboard/transfers', label: 'Transfers', disabled: true },
  { href: '/dashboard/chat', label: 'Chat', disabled: true },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <Link href="/" className="mb-6 block text-sm font-bold text-[var(--primary)]">
          RWOG
        </Link>
        <nav className="space-y-1">
          {navItems.map((item) =>
            item.disabled ? (
              <span
                key={item.href}
                className="block rounded-lg px-3 py-2 text-sm text-[var(--muted)] opacity-50"
              >
                {item.label}
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--background)]"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
