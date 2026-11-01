"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
const nav = [
  ["/dashboard", "Overview"],
  ["/ludo", "Ludo"],
  ["/squad", "Squad"],
  ["/lineup", "Starting XI"],
  ["/matches", "Matches"],
  ["/league", "League"],
  ["/transfers", "Transfers"],
  ["/team", "Club settings"],
];
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname(),
    router = useRouter();
  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Link href="/dashboard" className="brand">
          RWOG<span>PLAY & MANAGE</span>
        </Link>
        <nav aria-label="Club navigation">
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <button
          className="secondary"
          onClick={() => {
            localStorage.removeItem("rwog_token");
            router.replace("/login");
          }}
        >
          Log out
        </button>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
