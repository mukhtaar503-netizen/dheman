import { Request, Response, NextFunction } from 'express';
import { requestContextStorage, createRequestContext } from '@/lib/request-context';

const SLOW_REQUEST_THRESHOLD_MS = 300;

/**
 * Dev-only: wraps each request in an AsyncLocalStorage context so the Prisma query-timing
 * extension (see lib/prisma.ts) can attribute queries back to the request that issued them,
 * then logs a one-line summary — total time, query count, and time spent in the DB — once
 * the response finishes. This is what surfaces N+1s and duplicate queries in the dev logs
 * without needing an APM: a route logging "14 queries" for a list page is the N+1 itself.
 */
export function perfLogging(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== 'development') return next();

  const context = createRequestContext(req.method, req.originalUrl);
  const start = performance.now();

  res.on('finish', () => {
    const totalMs = performance.now() - start;
    const queries = context.queries;
    const dbMs = queries.reduce((sum, q) => sum + q.durationMs, 0);
    const label = totalMs >= SLOW_REQUEST_THRESHOLD_MS ? 'SLOW' : 'perf';
    const dupes = findDuplicates(queries);
    // eslint-disable-next-line no-console
    console.log(
      `[${label}] ${req.method} ${req.originalUrl} — ${totalMs.toFixed(1)}ms total, ` +
        `${queries.length} quer${queries.length === 1 ? 'y' : 'ies'} (${dbMs.toFixed(1)}ms in DB)` +
        (dupes.length ? `, DUPLICATES: ${dupes.join(', ')}` : ''),
    );
  });

  requestContextStorage.run(context, next);
}

/** Sorts object keys recursively so two calls built with the same shape but different
 *  property-insertion order still fingerprint identically. */
function stableStringify(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * Flags queries that are genuinely wasted work — same model, same action, AND the same
 * arguments (where/select/by/etc), fired more than once in a single request. Fingerprinting
 * on model+action alone (the previous behavior) produced false positives for things like
 * `Customer.groupBy({by:['status']})` and `Customer.groupBy({by:['type']})` in the same
 * Promise.all: two different queries that happen to share a model and action name, not
 * duplicated work.
 */
function findDuplicates(queries: { model: string | undefined; action: string; args: unknown }[]): string[] {
  const counts = new Map<string, number>();
  for (const q of queries) {
    const key = `${q.model ?? '?'}.${q.action}::${stableStringify(q.args)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([key, n]) => `${key.split('::')[0]} x${n}`);
}
