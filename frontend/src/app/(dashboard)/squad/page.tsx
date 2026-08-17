'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '@/lib/api';

interface SquadPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  overall: number;
  age: number;
  nationality: string | null;
}

function SquadLinkCell({
  href,
  children,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={className}>
      <Link href={href} className="block px-4 py-3">
        {children}
      </Link>
    </td>
  );
}

export default function SquadPage() {
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('rwog_token');

    if (!token) {
      setError('Please log in to view your squad.');
      setLoading(false);
      return;
    }

    async function loadSquad() {
      try {
        const res = await fetch(`${getApiUrl()}/players`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setError('Unable to load squad.');
          return;
        }

        const data: SquadPlayer[] = await res.json();
        setPlayers(data);
      } catch {
        setError('Unable to reach the server. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    void loadSquad();
  }, []);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => b.overall - a.overall),
    [players],
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Squad</h1>
      <p className="mb-8 text-sm text-[var(--muted)]">
        View your authenticated team roster.
      </p>

      <div className="overflow-hidden rounded-xl border border-[var(--surface-border)] bg-[var(--surface)]">
        {loading ? (
          <p className="p-6 text-sm text-[var(--muted)]">Loading squad...</p>
        ) : error ? (
          <p className="p-6 text-sm text-red-400">{error}</p>
        ) : sortedPlayers.length === 0 ? (
          <p className="p-6 text-sm text-[var(--muted)]">No players found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--surface-border)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Player Name</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Overall</th>
                  <th className="px-4 py-3 font-medium">Age</th>
                  <th className="px-4 py-3 font-medium">Nationality</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player) => {
                  const playerHref = `/players/${player.id}`;

                  return (
                    <tr
                      key={player.id}
                      className="border-b border-[var(--surface-border)] transition last:border-0 hover:bg-[var(--background)]"
                    >
                      <SquadLinkCell href={playerHref} className="font-medium">
                        {player.firstName} {player.lastName}
                      </SquadLinkCell>
                      <SquadLinkCell
                        href={playerHref}
                        className="text-[var(--muted)]"
                      >
                        {player.position}
                      </SquadLinkCell>
                      <SquadLinkCell
                        href={playerHref}
                        className="text-[var(--primary)]"
                      >
                        {player.overall}
                      </SquadLinkCell>
                      <SquadLinkCell
                        href={playerHref}
                        className="text-[var(--muted)]"
                      >
                        {player.age}
                      </SquadLinkCell>
                      <SquadLinkCell
                        href={playerHref}
                        className="text-[var(--muted)]"
                      >
                        {player.nationality ?? 'Unknown'}
                      </SquadLinkCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
