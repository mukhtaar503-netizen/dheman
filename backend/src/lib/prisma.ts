import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // Overrides the schema's `env("DATABASE_URL")` with env.databaseUrl, which has
    // already been normalized to guarantee `pgbouncer=true` — see config/env.ts.
    datasources: { db: { url: env.databaseUrl } },
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma;
}
