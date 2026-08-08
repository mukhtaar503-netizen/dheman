import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';
import { recordQuery } from '@/lib/request-context';

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined;
}

// Query-level timing is dev-only, gated behind NODE_ENV so it never adds overhead in
// production. A query is flagged SLOW past this threshold — that's the level at which a
// single query starts being visible in page-navigation latency, not an arbitrary cutoff.
const SLOW_QUERY_THRESHOLD_MS = 100;

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    // Overrides the schema's `env("DATABASE_URL")` with env.databaseUrl, which has
    // already been normalized to guarantee `pgbouncer=true` — see config/env.ts.
    datasources: { db: { url: env.databaseUrl } },
  });

  if (process.env.NODE_ENV === 'development') {
    // $use (not $extends) deliberately: $extends returns a differently-typed client that
    // breaks every service file typed against plain PrismaClient / Prisma.TransactionClient
    // across the codebase. $use mutates this instance in place and keeps its type exact.
    client.$use(async (params, next) => {
      const start = performance.now();
      const result = await next(params);
      const durationMs = performance.now() - start;
      recordQuery(params.model, params.action, durationMs);
      if (durationMs >= SLOW_QUERY_THRESHOLD_MS) {
        // eslint-disable-next-line no-console
        console.warn(`[prisma] SLOW ${durationMs.toFixed(1)}ms  ${params.model ?? '?'}.${params.action}`);
      }
      return result;
    });
  }

  return client;
}

export const prisma = global.__prisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma__ = prisma;
}
