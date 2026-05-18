import { createDb } from '@qafiyah/db';
import { createMiddleware } from 'hono/factory';
import { HTTP_INTERNAL_SERVER_ERROR, HTTP_SERVICE_UNAVAILABLE } from '@/constants';
import { parseBindings } from '@/env';
import { makeProblem, sendProblem } from '@/lib/problem';
import type { AppContext } from '@/types';

export const dbMiddleware = createMiddleware<AppContext>(async (c, next) => {
  let db: ReturnType<typeof createDb>;
  try {
    const { DATABASE_URL } = parseBindings(c.env);
    db = createDb(DATABASE_URL);
  } catch (error) {
    console.error('DB middleware: invalid configuration:', error);
    return sendProblem(
      c,
      makeProblem({
        code: 'INTERNAL_SERVER_ERROR',
        status: HTTP_INTERNAL_SERVER_ERROR,
        detail: 'Server misconfigured',
      })
    );
  }
  try {
    c.set('db', db);
    return await next();
  } catch (error) {
    console.error('DB middleware: connection error:', error);
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
