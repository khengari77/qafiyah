import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from '@orpc/valibot';
import { API_V1_PREFIX, GITHUB_REPO_URL } from '@qafiyah/constants';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { match, P } from 'ts-pattern';
import {
  API_DESCRIPTION,
  API_OPENAPI_DOCS_PATH,
  API_OPENAPI_SPEC_PATH,
  API_VERSION,
  CORS_MAX_AGE_SECONDS,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  LICENSE_NAME,
  ORPC_BYPASS_PATHS,
  READ_CACHE_CONTROL,
  SITE_NAME_EN,
} from './constants';
import { withReadCaching } from './lib/http-cache';
import { type DomainFields, enrichContext, recordError } from './lib/logger';
import { PROBLEM_DETAIL_SCHEMA } from './lib/openapi-problem';
import { makeProblem, sendProblem, transformOrpcResponse } from './lib/problem';
import { dbMiddleware } from './middlewares/db.middleware';
import { esMiddleware } from './middlewares/es.middleware';
import { faviconMiddleware } from './middlewares/favicon.middleware';
import { loggerMiddleware } from './middlewares/logger.middleware';
import { router, routerNamespaces } from './router';
import index from './routes/index.routes';
import llms from './routes/llms.routes';
import poems from './routes/poems.routes';
import type { AppContext } from './types';

const app = new Hono<AppContext>();

app.use(
  cors({
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'OPTIONS'],
    exposeHeaders: ['Content-Type', 'ETag'],
    maxAge: CORS_MAX_AGE_SECONDS,
    credentials: false,
  })
);
app.use(faviconMiddleware);
app.use(loggerMiddleware);

for (const ns of routerNamespaces) {
  app.use(`${API_V1_PREFIX}/${ns}/*`, dbMiddleware);
}
app.use(`${API_V1_PREFIX}/*`, esMiddleware);

const orpcHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ValibotToJsonSchemaConverter()],
      specPath: API_OPENAPI_SPEC_PATH,
      docsPath: API_OPENAPI_DOCS_PATH,
      specGenerateOptions: ({ request }) => ({
        info: {
          title: `${SITE_NAME_EN} API`,
          version: API_VERSION,
          description: API_DESCRIPTION,
          contact: { name: SITE_NAME_EN, url: GITHUB_REPO_URL },
          license: { name: LICENSE_NAME },
        },
        servers: [{ url: `${request.url.origin}${API_V1_PREFIX}` }],
        // Document the real RFC 9457 error body (lib/problem.ts) instead of
        // oRPC's native error envelope. Applies to every error response.
        customErrorResponseBodySchema: PROBLEM_DETAIL_SCHEMA,
      }),
    }),
  ],
});

app.use(`${API_V1_PREFIX}/*`, async (c, next) => {
  if (ORPC_BYPASS_PATHS.has(c.req.path)) return next();
  // HEAD parity: run the GET handler, then strip the body *after* the caching
  // wrapper — so a HEAD still carries ETag/Cache-Control and can answer 304.
  const isHead = c.req.method === 'HEAD';
  const forward = isHead
    ? new Request(c.req.raw.url, { method: 'GET', headers: c.req.raw.headers })
    : c.req.raw;
  const result = await orpcHandler.handle(forward, {
    context: {
      db: c.get('db'),
      es: c.get('es'),
      log: (data: DomainFields) => enrichContext(c, data),
    },
    prefix: API_V1_PREFIX,
  });
  if (!result.matched) return next();
  const transformed = await transformOrpcResponse(result.response, c.req.path);
  const out =
    transformed.status < 400
      ? await withReadCaching(c.req.raw, transformed, READ_CACHE_CONTROL)
      : transformed;
  return isHead ? new Response(null, { status: out.status, headers: out.headers }) : out;
});

app
  .route('/', index)
  .route('/', llms)
  .route(API_V1_PREFIX, index)
  .route(`${API_V1_PREFIX}/poems`, poems)
  .notFound((c) =>
    sendProblem(
      c,
      makeProblem({
        code: 'NOT_FOUND',
        status: HTTP_NOT_FOUND,
        detail: `No route matches ${c.req.method} ${c.req.path}`,
      })
    )
  )
  .onError((error, c) => {
    const { code, status, detail } = match(error)
      .with(P.instanceOf(HTTPException), (e) => ({
        code: e.status === HTTP_NOT_FOUND ? ('NOT_FOUND' as const) : ('BAD_REQUEST' as const),
        status: e.status,
        detail: e.message,
      }))
      .otherwise(() => ({
        code: 'INTERNAL_SERVER_ERROR' as const,
        status: HTTP_INTERNAL_SERVER_ERROR,
        detail: 'Unexpected server error',
      }));

    const handle = c.var.logHandle;
    if (handle) {
      recordError(handle, {
        type: error.constructor.name,
        code,
        message: error.message,
        retriable: status >= HTTP_INTERNAL_SERVER_ERROR,
      });
    }

    return sendProblem(c, makeProblem({ code, status, detail }));
  });

export default app;
