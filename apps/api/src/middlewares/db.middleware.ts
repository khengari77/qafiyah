import { createDb, type DbClient } from '@qafiyah/db';
import { createMiddleware } from 'hono/factory';
import { ResultAsync } from 'neverthrow';
import { HTTP_INTERNAL_SERVER_ERROR, HTTP_SERVICE_UNAVAILABLE } from '@/constants';
import { parseBindings } from '@/env';
import { makeProblem, sendProblem } from '@/lib/problem';
import type { AppContext } from '@/types';

type NextHandlerError = {
  readonly kind: 'next_handler_failed';
  readonly message: string;
  readonly name?: string;
};

// @NOTE: cached at module scope so we don't spin up a fresh postgres pool on
// every request. In Cloudflare Workers each isolate handles many requests; in
// wrangler dev the process is long-lived. The static web build hits this API
// ~50k times — per-request pool creation churns connections and eventually
// wedges wrangler/postgres. DATABASE_URL is constant per isolate, so caching
// by-isolate is correct. Failures aren't cached so a fixed config recovers on
// the next request.
let cachedDb: DbClient | undefined;

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const bindingsResult = parseBindings(c.env);
  if (bindingsResult.isErr()) {
    console.error(
      JSON.stringify({
        source: 'db.middleware',
        stage: 'parse_bindings',
        path: c.req.path,
        method: c.req.method,
        error: bindingsResult.error,
      })
    );
    return sendProblem(
      c,
      makeProblem({
        code: 'INTERNAL_SERVER_ERROR',
        status: HTTP_INTERNAL_SERVER_ERROR,
        detail: 'Server misconfigured',
      })
    );
  }
  let db = cachedDb;
  if (!db) {
    const dbResult = createDb(bindingsResult.value.DATABASE_URL);
    if (dbResult.isErr()) {
      console.error(
        JSON.stringify({
          source: 'db.middleware',
          stage: 'create_db',
          path: c.req.path,
          method: c.req.method,
          error: dbResult.error,
        })
      );
      return sendProblem(
        c,
        makeProblem({
          code: 'INTERNAL_SERVER_ERROR',
          status: HTTP_INTERNAL_SERVER_ERROR,
          detail: 'Server misconfigured',
        })
      );
    }
    db = dbResult.value;
    cachedDb = db;
  }
  c.set('db', db);
  const nextResult = await ResultAsync.fromPromise(
    next(),
    (cause): NextHandlerError => ({
      kind: 'next_handler_failed',
      message: cause instanceof Error ? cause.message : String(cause),
      ...(cause instanceof Error && cause.name ? { name: cause.name } : {}),
    })
  );
  if (nextResult.isErr()) {
    console.error(
      JSON.stringify({
        source: 'db.middleware',
        stage: 'request_handler',
        path: c.req.path,
        method: c.req.method,
        message: nextResult.error.message,
        name: nextResult.error.name,
      })
    );
    return sendProblem(
      c,
      makeProblem({
        code: 'SERVICE_UNAVAILABLE',
        status: HTTP_SERVICE_UNAVAILABLE,
        detail: 'Database unavailable',
      })
    );
  }
  return nextResult.value;
});
