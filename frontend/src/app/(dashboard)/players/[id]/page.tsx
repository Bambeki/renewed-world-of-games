'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getApiUrl } from '@/lib/api';

interface PlayerDetails {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  nationality: string | null;
  position: string;
  pace: number;
  shooting: number;
  passing: number;
  defending: number;
  physical: number;
  overall: number;
  fitness: number;
  morale: number;
  salary: number;
  contractUntil: string | null;
  isStarter: boolean;
  createdAt: string;
}

interface StatItem {
  label: string;
  value: string | number;
}

interface StatGroup {
  title: string;
  items: StatItem[];
}

function formatDate(value: string | null): string {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PlayerDetailsPage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const [player, setPlayer] = useState<PlayerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('rwog_token');

    if (!token) {
      setError('Please log in to view this player.');
      setLoading(false);
      return;
    }

    async function loadPlayer() {
      try {
        const res = await fetch(`${getApiUrl()}/players/${playerId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          setError(
            res.status === 404 ? 'Player not found.' : 'Unable to load player.',
          );
          return;
        }

        const data: PlayerDetails = await res.json();
        setPlayer(data);
      } catch {
        setError('Unable to reach the server. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    void loadPlayer();
  }, [playerId]);

  const statGroups = useMemo(() => {
    if (!player) return [];

    return [
      {
        title: 'Attributes',
        items: [
          { label: 'Pace', value: player.pace },
          { label: 'Shooting', value: player.shooting },
          { label: 'Passing', value: player.passing },
          { label: 'Defending', value: player.defending },
          { label: 'Physical', value: player.physical },
        ],
      },
      {
        title: 'Status',
        items: [
          { label: 'Fitness', value: player.fitness },
          { label: 'Morale', value: player.morale },
          { label: 'Starter', value: player.isStarter ? 'Yes' : 'No' },
        ],
      },
      {
        title: 'Profile',
        items: [
          { label: 'Age', value: player.age },
          { label: 'Nationality', value: player.nationality ?? 'Unknown' },
          { label: 'Salary', value: formatCurrency(player.salary) },
          { label: 'Contract Until', value: formatDate(player.contractUntil) },
          { label: 'Created', value: formatDate(player.createdAt) },
        ],
      },
    ] satisfies StatGroup[];
  }, [player]);

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Loading player...</p>;
  }

  if (error || !player) {
    return (
      <div>
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error ?? 'Unable to load player.'}
        </p>
        <Link
          href="/squad"
          className="text-sm text-[var(--primary)] hover:underline"
        >
          Back to squad
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/squad"
        className="mb-6 inline-block text-sm text-[var(--muted)] hover:underline"
      >
        Back to squad
      </Link>

      <div className="mb-8 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-6">
        <p className="mb-2 text-sm text-[var(--muted)]">{player.position}</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {player.firstName} {player.lastName}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {player.nationality ?? 'Unknown nationality'} | Age {player.age}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--background)] px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Overall
            </p>
            <p className="text-4xl font-bold text-[var(--primary)]">
              {player.overall}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {statGroups.map((group) => (
          <section
            key={group.title}
            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] p-5"
          >
            <h2 className="mb-4 font-semibold">{group.title}</h2>
            <dl className="space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 border-b border-[var(--surface-border)] pb-3 last:border-0 last:pb-0"
                >
                  <dt className="text-sm text-[var(--muted)]">{item.label}</dt>
                  <dd className="text-sm font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}
