import { API_V1_PREFIX } from '@qafiyah/constants';
import { createMiddleware } from 'hono/factory';
import { API_OPENAPI_DOCS_PATH, API_OPENAPI_SPEC_PATH, API_SERVICE_NAME } from '@/constants';
import { createLogHandle, recordResponse, shouldEmit, toLogEvent } from '@/lib/logger';
import type { AppContext } from '@/types';

const LOG_SKIP_PREFIX = `${API_V1_PREFIX}${API_OPENAPI_DOCS_PATH}`;
const LOG_SKIP_EXACT = `${API_V1_PREFIX}${API_OPENAPI_SPEC_PATH}`;

export const loggerMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const path = c.req.path;
  if (path === LOG_SKIP_EXACT || path.startsWith(LOG_SKIP_PREFIX)) {
    return next();
  }

  const startTime = Date.now();
  const handle = createLogHandle({
    request_id: crypto.randomUUID(),
    method: c.req.method,
    path,
    timestamp: new Date().toISOString(),
    service: {
      name: API_SERVICE_NAME,
      environment: c.env.ENVIRONMENT ?? 'unknown',
    },
  });

  c.set('logEvent', handle);
  await next();

  recordResponse(handle, c.res.status, Date.now() - startTime);

  if (shouldEmit(handle)) {
    const emitted = toLogEvent(handle);
    if (emitted) {
      // biome-ignore lint/suspicious/noConsole: intentional wide-event structured log emission
      console.log(JSON.stringify(emitted));
    }
  }
});
