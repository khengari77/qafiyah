import { ERAS_SORT_ORDER, POEMS_PER_PAGE } from '@qafiyah/constants';
import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { eraStats } from '../schema';

export type EraStatsRow = {
  name: string;
  slug: string;
  poetsCount: number;
  poemsCount: number;
};

export type PoemListRow = {
  title: string;
  slug: string;
  poetName: string;
  poetSlug: string;
  meterName: string;
  meterSlug: string;
};

export type ListEraPoemsResult = {
  parent: { name: string; slug: string; poemsCount: number };
  poems: PoemListRow[];
  total: number;
  totalPages: number;
};

type ParentRow = { name: string; poems_count: number | string };
type RawPoemRow = {
  title: string;
  slug: string;
  poet_name: string;
  poet_slug: string;
  meter_name: string;
  meter_slug: string;
};

export async function listEras(db: DbClient): Promise<EraStatsRow[]> {
  const results = await db
    .select({
      name: eraStats.name,
      slug: eraStats.slug,
      poetsCount: eraStats.poetsCount,
      poemsCount: eraStats.poemsCount,
    })
    .from(eraStats);
  return results.sort((a, b) => ERAS_SORT_ORDER.indexOf(a.name) - ERAS_SORT_ORDER.indexOf(b.name));
}

export async function listEraPoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListEraPoemsResult | null> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = (await db.execute(
    sql`SELECT name, poems_count FROM era_stats WHERE slug = ${slug} LIMIT 1`
  )) as unknown as ParentRow[];

  if (!parentRows.length || !parentRows[0]) return null;

  const total = Number(parentRows[0].poems_count);

  const rawPoems = (await db.execute(sql`
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
  `)) as unknown as RawPoemRow[];

  const poems: PoemListRow[] = rawPoems.map((r) => ({
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
