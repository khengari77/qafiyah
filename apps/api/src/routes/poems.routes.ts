import { type DbClient, poemsQueries } from '@qafiyah/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { err, ok, type Result } from 'neverthrow';
import { match, P } from 'ts-pattern';
import * as v from 'valibot';
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
  NO_STORE_CACHE_CONTROL,
} from '@/constants';
import { makeProblem, sendProblem } from '@/lib/problem';
import type { AppContext } from '@/types';

type RandomPoemFormat = 'slug' | 'lines';

type RandomPoemError =
  | { readonly kind: 'excerpt_error'; readonly cause: poemsQueries.GetRandomPoemExcerptError }
  | { readonly kind: 'slug_error'; readonly cause: poemsQueries.GetRandomPoemSlugError };

async function fetchRandomPoemBody(
  db: DbClient,
  format: RandomPoemFormat
): Promise<Result<string, RandomPoemError>> {
  if (format === 'lines') {
    const result = await poemsQueries.getRandomPoemExcerpt(db);
    if (result.isErr()) return err({ kind: 'excerpt_error', cause: result.error });
    return ok(result.value.excerpt);
  }
  const slugResult = await poemsQueries.getRandomPoemSlug(db);
  if (slugResult.isErr()) return err({ kind: 'slug_error', cause: slugResult.error });
  return ok(slugResult.value);
}

const optionSchema = v.optional(v.picklist(['slug', 'lines'] as const), 'slug');

type ParseOptionError = { readonly kind: 'invalid_option'; readonly raw: string | undefined };

function parseOption(raw: string | undefined): Result<RandomPoemFormat, ParseOptionError> {
  const parsed = v.safeParse(optionSchema, raw);
  return parsed.success ? ok(parsed.output) : err({ kind: 'invalid_option', raw });
}

const app = new Hono<AppContext>()
  .get('/random', async (c) => {
    const optionResult = parseOption(c.req.query('option'));
    if (optionResult.isErr()) {
      return sendProblem(
        c,
        makeProblem({
          code: 'BAD_REQUEST',
          status: HTTP_BAD_REQUEST,
          detail: `Invalid ?option value (expected 'slug' or 'lines')`,
        })
      );
    }

    const bodyResult = await fetchRandomPoemBody(c.get('db'), optionResult.value);
    if (bodyResult.isErr()) {
      console.error(
        JSON.stringify({
          source: 'poems.routes',
          stage: 'fetchRandomPoemBody',
          method: c.req.method,
          path: c.req.path,
          option: optionResult.value,
          error: bodyResult.error,
        })
      );
      return sendProblem(
        c,
        makeProblem({
          code: 'INTERNAL_SERVER_ERROR',
          status: HTTP_INTERNAL_SERVER_ERROR,
          detail: 'Failed to fetch random poem',
        })
      );
    }

    c.header('Cache-Control', NO_STORE_CACHE_CONTROL);
    c.header('Content-Type', 'text/plain; charset=utf-8');
    return c.text(bodyResult.value);
  })
  .onError((error, c) => {
    const { code, status, detail } = match(error)
      .with(P.instanceOf(HTTPException), (e) => ({
        code: e.status === HTTP_NOT_FOUND ? ('NOT_FOUND' as const) : ('BAD_REQUEST' as const),
        status: e.status,
        detail: e.message,
      }))
      .otherwise((e) => {
        console.error(
          JSON.stringify({
            source: 'poems.routes',
            stage: 'onError',
            method: c.req.method,
            path: c.req.path,
            query: c.req.query(),
            message: e instanceof Error ? e.message : String(e),
            name: e instanceof Error ? e.name : undefined,
          })
        );
        return {
          code: 'INTERNAL_SERVER_ERROR' as const,
          status: HTTP_INTERNAL_SERVER_ERROR,
          detail: 'Failed to handle poems route',
        };
      });
    return sendProblem(c, makeProblem({ code, status, detail }));
  });

export default app;
