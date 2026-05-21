import { DEV_ELASTICSEARCH_PORT } from '@qafiyah/constants';
import { createSearchClient, type SearchClient } from '@qafiyah/search';
import { createMiddleware } from 'hono/factory';
import { HTTP_INTERNAL_SERVER_ERROR } from '@/constants';
import { parseBindings } from '@/env';
import { makeProblem, sendProblem } from '@/lib/problem';
import type { AppContext } from '@/types';

// @NOTE: cached at module scope like the db client — the ES URL is constant per
// process, so one client is reused across requests. Defaults to the local dev
// node when ELASTICSEARCH_URL is unset (prod sets it via compose), mirroring how
// the web resolves INTERNAL_API_URL.
let cachedEs: SearchClient | undefined;

export const esMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const bindingsResult = parseBindings(c.env);
  if (bindingsResult.isErr()) {
    console.error(
      JSON.stringify({
        source: 'es.middleware',
        stage: 'parse_bindings',
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
  let es = cachedEs;
  if (!es) {
    const url =
      bindingsResult.value.ELASTICSEARCH_URL ?? `http://localhost:${DEV_ELASTICSEARCH_PORT}`;
    const esResult = createSearchClient(url);
    if (esResult.isErr()) {
      console.error(
        JSON.stringify({ source: 'es.middleware', stage: 'create_client', error: esResult.error })
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
    es = esResult.value;
    cachedEs = es;
  }
  c.set('es', es);
  return await next();
});
