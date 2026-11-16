import type { HealthCheckResponse } from '@rwog/shared';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001/api/v1';

/** Calls the backend health endpoint; returns null if unreachable */
export async function checkBackendHealth(): Promise<HealthCheckResponse | null> {
  try {
    const healthBase = typeof window === 'undefined' && API_URL.startsWith('/')
      ? process.env.INTERNAL_API_URL ?? 'http://localhost:4001/api/v1'
      : API_URL;
    const res = await fetch(`${healthBase}/health`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Base URL for all API calls (used in Phase 1+) */
export function getApiUrl(): string {
  return API_URL;
}
