import { AsyncLocalStorage } from 'node:async_hooks';

interface QueryLogEntry {
  model: string | undefined;
  action: string;
  durationMs: number;
  args: unknown;
}

interface RequestContext {
  method: string;
  path: string;
  queries: QueryLogEntry[];
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function createRequestContext(method: string, path: string): RequestContext {
  return { method, path, queries: [] };
}

/** Called from the Prisma query-timing extension to attribute a query to the in-flight request. */
export function recordQuery(model: string | undefined, action: string, durationMs: number, args: unknown) {
  requestContextStorage.getStore()?.queries.push({ model, action, durationMs, args });
}

export function getRequestQueries(): QueryLogEntry[] {
  return requestContextStorage.getStore()?.queries ?? [];
}
