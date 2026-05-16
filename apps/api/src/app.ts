import { OpenAPIHandler } from '@orpc/openapi/fetch';
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins';
import { experimental_ValibotToJsonSchemaConverter as ValibotToJsonSchemaConverter } from '@orpc/valibot';
import {
  API_OPENAPI_DOCS_PATH,
  API_OPENAPI_SPEC_PATH,
  API_SPEC_DESCRIPTION,
  API_SPEC_LICENSE_NAME,
  API_SPEC_VERSION,
  API_V1_PREFIX,
  CORS_MAX_AGE_SECONDS,
  FAVICON_EMOJI,
  GITHUB_REPO_URL,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  ORPC_BYPASS_PATHS,
  SITE_NAME_EN,
} from '@qafiyah/constants';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { enrichContext } from './lib/logger';
import { makeProblem, sendProblem, transformOrpcResponse } from './lib/problem';
import { dbMiddleware } from './middlewares/db.middleware';
import serveEmojiFavicon from './middlewares/favicon.middleware';
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
    allowMethods: ['GET', 'OPTIONS'],
    exposeHeaders: ['Content-Type'],
    maxAge: CORS_MAX_AGE_SECONDS,
    credentials: false,
  })
);
app.use(serveEmojiFavicon(FAVICON_EMOJI));
app.use(loggerMiddleware);

for (const ns of routerNamespaces) {
  app.use(`${API_V1_PREFIX}/${ns}/*`, dbMiddleware);
}

const orpcHandler = new OpenAPIHandler(router, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ValibotToJsonSchemaConverter()],
      specPath: API_OPENAPI_SPEC_PATH,
      docsPath: API_OPENAPI_DOCS_PATH,
      specGenerateOptions: ({ request }) => ({
        info: {
          title: `${SITE_NAME_EN} API`,
          version: API_SPEC_VERSION,
          description: API_SPEC_DESCRIPTION,
          contact: { name: SITE_NAME_EN, url: GITHUB_REPO_URL },
          license: { name: API_SPEC_LICENSE_NAME },
        },
        servers: [{ url: `${request.url.origin}${API_V1_PREFIX}` }],
      }),
    }),
  ],
});

app.use(`${API_V1_PREFIX}/*`, async (c, next) => {
  if (ORPC_BYPASS_PATHS.has(c.req.path)) return next();
  const result = await orpcHandler.handle(c.req.raw, {
    context: { db: c.get('db'), log: (data) => enrichContext(c, data) },
    prefix: API_V1_PREFIX,
  });
  if (!result.matched) return next();
  return transformOrpcResponse(result.response, c.req.path);
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
    const isHttp = error instanceof HTTPException;
    const status = isHttp ? error.status : HTTP_INTERNAL_SERVER_ERROR;
    let code: string;
    if (!isHttp) {
      code = 'INTERNAL_SERVER_ERROR';
    } else if (status === HTTP_NOT_FOUND) {
      code = 'NOT_FOUND';
    } else {
      code = 'BAD_REQUEST';
    }

    const event = c.var.logEvent;
    if (event) {
      event.error = {
        type: error.constructor.name,
        code,
        message: error.message,
        retriable: status >= 500,
      };
    }

    if (isHttp) {
      return sendProblem(c, makeProblem({ code, status, detail: error.message }));
    }

    return sendProblem(
      c,
      makeProblem({
        code: 'INTERNAL_SERVER_ERROR',
        status: HTTP_INTERNAL_SERVER_ERROR,
        detail: 'Unexpected server error',
      })
    );
  });

export default app;
