import { ERAS_SORT_ORDER, POEMS_PER_PAGE } from '@qafiyah/constants';
import type { EraSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { eraStats } from '../schema';
import { asEraSlug } from '../utils/brand';
import { executeAs } from '../utils/execute-as';
import { parentRowSchema, rawPoemRowSchema } from './row-schemas';
import type { PoemListRow } from './types';

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

export async function listEras(db: DbClient): Promise<readonly EraStatsRow[]> {
  const results = await db
    .select({
      name: eraStats.name,
      slug: eraStats.slug,
      poetsCount: eraStats.poetsCount,
      poemsCount: eraStats.poemsCount,
    })
    .from(eraStats);
  const sortIndex = (name: string): number => ERAS_SORT_INDEX.get(name) ?? Number.MAX_SAFE_INTEGER;
  return results
    .map((r) => ({ ...r, slug: asEraSlug(r.slug) }))
    .sort((a, b) => sortIndex(a.name) - sortIndex(b.name));
}

export async function listEraPoems(
  db: DbClient,
  slug: EraSlug,
  page: number
): Promise<ListEraPoemsResult | null> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = await executeAs(
    db,
    sql`SELECT name, poems_count FROM era_stats WHERE slug = ${slug} LIMIT 1`,
    parentRowSchema
  );

  if (parentRows.length === 0 || !parentRows[0]) return null;

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

  const poems: readonly PoemListRow[] = rawPoems.map((r) => ({
    title: r.title,
    slug: r.slug,
    poetName: r.poet_name,
    poetSlug: r.poet_slug,
    meterName: r.meter_name,
    meterSlug: r.meter_slug,
  }));

  return {
    parent: { name: parentRows[0].name, slug, poemsCount: total },
    poems,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
