import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { pageParam, slugInput } from './_shared';

const optionalPageParam = v.optional(pageParam, 1);

const optionalLimitParam = v.optional(
  v.pipe(v.unknown(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
  1000
);

const listSlugsContract = oc
  .route({ method: 'GET', path: '/poems/slugs' })
  .input(
    v.object({
      page: optionalPageParam,
      limit: optionalLimitParam,
    })
  )
  .output(
    v.object({
      slugs: v.array(v.object({ slug: v.string() })),
      total: v.number(),
      totalPages: v.number(),
    })
  );

const listAllSlugsContract = oc
  .route({ method: 'GET', path: '/poems/slugs/all' })
  .output(v.array(v.string()));

const getBySlugContract = oc
  .route({ method: 'GET', path: '/poems/slug/{slug}' })
  .input(slugInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Poem not found' },
    POEM_ERROR: { status: 400, message: 'Poem data invalid' },
  })
  .output(
    v.object({
      metadata: v.object({
        poet_name: v.string(),
        poet_slug: v.string(),
        era_name: v.string(),
        era_slug: v.string(),
        meter_name: v.string(),
        theme_name: v.string(),
      }),
      clearTitle: v.string(),
      processedContent: v.object({
        verses: v.array(v.tuple([v.string(), v.string()])),
        verseCount: v.number(),
        sample: v.string(),
        keywords: v.string(),
      }),
      relatedPoems: v.array(
        v.object({
          poem_slug: v.string(),
          poet_name: v.string(),
          meter_name: v.string(),
          poem_title: v.string(),
        })
      ),
    })
  );

export const poemsContract = {
  listSlugs: listSlugsContract,
  listAllSlugs: listAllSlugsContract,
  getBySlug: getBySlugContract,
};
