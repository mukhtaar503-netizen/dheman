import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Guarantees `pgbouncer=true` on the runtime connection string, regardless of what's
 * actually written in .env. Without it, a transaction-mode pooler (Supabase's pooler,
 * PgBouncer, etc.) recycles the underlying Postgres connection between queries, so
 * Prisma's server-side prepared statements ("s5", "s8"...) vanish out from under it —
 * every query then intermittently fails with `PostgresError 26000: prepared statement
 * "sN" does not exist`, no matter which model/route triggered it. Forcing this flag
 * makes Prisma use the simple query protocol instead, which is unconditionally safe
 * against a direct (non-pooled) Postgres connection too — so normalizing it here
 * removes an entire class of "did you remember the connection string flag" bugs.
 */
function ensurePgBouncerFlag(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  databaseUrl: ensurePgBouncerFlag(required('DATABASE_URL')),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000,
  },
  supabase: {
    url: process.env.SUPABASE_URL ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'sms-uploads',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? '',
  },
};
