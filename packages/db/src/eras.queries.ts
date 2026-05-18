import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { EraSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result } from 'neverthrow';
import { asEraSlug } from './brand';
import type { DbClient } from './client';
import { ERAS_SORT_ORDER } from './constants';
import { executeAs } from './execute-as';
import { type PoemListRow, parentStatsRowSchema, rawPoemRowSchema } from './row-schemas';
import { eraStats } from './schema';

const ERAS_SORT_INDEX = new Map<string, number>(ERAS_SORT_ORDER.map((name, i) => [name, i]));

export type EraStatsRow = {
  readonly name: string;
  readonly slug: EraSlug;
  readonly poetsCount: number;
  readonly poemsCount: number;
};

export type ListEraPoemsResult = {
  readonly parent: { readonly name: string; readonly slug: EraSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListEraPoemsError = { readonly kind: 'not_found'; readonly slug: EraSlug };

export async function listEras(db: DbClient): Promise<readonly EraStatsRow[]> {
  const results = await db
    .select({
      name: eraStats.name,
      slug: eraStats.slug,
      poetsCount: eraStats.poetsCount,
      poemsCount: eraStats.poemsCount,
    })
    .from(eraStats);
  const getSortIndex = (name: string): number =>
    ERAS_SORT_INDEX.get(name) ?? Number.MAX_SAFE_INTEGER;
  return results
    .map((row) => ({ ...row, slug: asEraSlug(row.slug) }))
    .sort((a, b) => getSortIndex(a.name) - getSortIndex(b.name));
}

export async function listEraPoems(
  db: DbClient,
  slug: EraSlug,
  page: number
): Promise<Result<ListEraPoemsResult, ListEraPoemsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = await executeAs(
    db,
    sql`SELECT name, poems_count FROM era_stats WHERE slug = ${slug} LIMIT 1`,
    parentStatsRowSchema
  );

  if (parentRows.length === 0 || !parentRows[0]) return err({ kind: 'not_found', slug });

  const total = Number(parentRows[0].poems_count);

  const rawPoems = await executeAs(
    db,
    sql`
      SELECT
        p.title AS title,
        p.slug AS slug,
        pt.name AS poet_name,
        pt.slug AS poet_slug,
        m.name AS meter_name,
        m.slug AS meter_slug
      FROM public.poems p
      JOIN public.poets pt ON p.poet_id = pt.id
      JOIN public.meters m ON p.meter_id = m.id
      JOIN public.eras e ON pt.era_id = e.id
      WHERE e.slug = ${slug}
      ORDER BY p.id
      LIMIT ${limit} OFFSET ${offset}
    `,
    rawPoemRowSchema
  );

  const poems: readonly PoemListRow[] = rawPoems.map((row) => ({
    title: row.title,
    slug: row.slug,
    poetName: row.poet_name,
    poetSlug: row.poet_slug,
    meterName: row.meter_name,
    meterSlug: row.meter_slug,
  }));

  return ok({
    parent: { name: parentRows[0].name, slug, poemsCount: total },
    poems,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
