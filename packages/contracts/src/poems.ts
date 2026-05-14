import { oc } from '@orpc/contract';
import * as v from 'valibot';
import { slugInput } from './_shared';

const listSlugsContract = oc.route({ method: 'GET', path: '/poems/slugs' }).output(
  v.object({
    slugs: v.array(v.string()),
    total: v.number(),
  })
);

const getBySlugContract = oc
  .route({ method: 'GET', path: '/poems/slug/{slug}' })
  .input(slugInput)
  .errors({
    NOT_FOUND: { status: 404, message: 'Poem not found' },
    POEM_PARSE_ERROR: { status: 500, message: 'Poem data could not be parsed' },
  })
  .output(
    v.object({
      metadata: v.object({
        poetName: v.string(),
        poetSlug: v.string(),
        eraName: v.string(),
        eraSlug: v.string(),
        meterName: v.string(),
        themeName: v.string(),
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
          title: v.string(),
          slug: v.string(),
          poetName: v.string(),
          meter: v.string(),
        })
      ),
    })
  );

export const poemsContract = {
  listSlugs: listSlugsContract,
  getBySlug: getBySlugContract,
};
