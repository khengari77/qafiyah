import { API_OPENAPI_DOCS_PATH, API_OPENAPI_SPEC_PATH, API_V1_PREFIX } from '@qafiyah/constants';
import { createMiddleware } from 'hono/factory';
import { type LogEvent, shouldEmit } from '../lib/logger';
import type { AppContext } from '../types';

const LOG_SKIP_PREFIX = `${API_V1_PREFIX}${API_OPENAPI_DOCS_PATH}`;
const LOG_SKIP_EXACT = `${API_V1_PREFIX}${API_OPENAPI_SPEC_PATH}`;

export const loggerMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const path = c.req.path;
  if (path === LOG_SKIP_EXACT || path.startsWith(LOG_SKIP_PREFIX)) {
    return next();
  }

  const startTime = Date.now();
  const event: Partial<LogEvent> = {
    request_id: crypto.randomUUID(),
    method: c.req.method,
    path,
    timestamp: new Date().toISOString(),
    service: {
      name: 'qafiyah-api',
      environment: c.env.ENVIRONMENT ?? 'unknown',
    },
  };

  c.set('logEvent', event);
  await next();

  event.status_code = c.res.status;
  event.duration_ms = Date.now() - startTime;

  if (shouldEmit(event)) {
    // biome-ignore lint/suspicious/noConsole: intentional wide-event structured log emission
    console.log(JSON.stringify(event));
  }
});
