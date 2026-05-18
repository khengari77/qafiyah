import { createDb, type DbClient } from '@qafiyah/db';
import { createMiddleware } from 'hono/factory';
import { HTTP_INTERNAL_SERVER_ERROR, HTTP_SERVICE_UNAVAILABLE } from '@/constants';
import { parseBindings } from '@/env';
import { makeProblem, sendProblem } from '@/lib/problem';
import type { AppContext } from '@/types';

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
  const db: DbClient = dbResult.value;
  try {
    c.set('db', db);
    return await next();
  } catch (error) {
    console.error(
      JSON.stringify({
        source: 'db.middleware',
        stage: 'request_handler',
        path: c.req.path,
        method: c.req.method,
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : undefined,
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
});
