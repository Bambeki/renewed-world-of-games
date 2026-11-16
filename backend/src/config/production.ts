export function jwtAccessSeconds(raw = '15m'): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(raw);
  if (!match) throw new Error('JWT_ACCESS_EXPIRES_IN must use seconds, minutes, hours or days, e.g. 15m.');
  const value = Number(match[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[match[2]]!;
  if (!Number.isSafeInteger(value) || value < 60 || value > 86400) throw new Error('JWT access lifetime must be between 60 seconds and 24 hours.');
  return value;
}
export function validateProductionEnvironment(env: NodeJS.ProcessEnv) {
  jwtAccessSeconds(env.JWT_ACCESS_EXPIRES_IN);
  if (env.NODE_ENV !== 'production') return;
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || /development-secret|change-me|replace-me|replace-with/.test(env.JWT_SECRET))
    throw new Error('Production requires a unique JWT_SECRET of at least 32 characters.');
  if (!env.DATABASE_URL || !/^postgres(?:ql)?:\/\//.test(env.DATABASE_URL))
    throw new Error('Production requires a PostgreSQL DATABASE_URL.');
  let origin: URL;
  try { origin = new URL(env.CORS_ORIGIN || ''); } catch { throw new Error('Production requires CORS_ORIGIN.'); }
  if (origin.protocol !== 'https:' || origin.origin !== env.CORS_ORIGIN)
    throw new Error('Production CORS_ORIGIN must be one HTTPS origin without a path or trailing slash.');
}
