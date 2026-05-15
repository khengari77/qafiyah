import { POEMS_PER_PAGE } from '@qafiyah/constants';
import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { poetStats } from '../schema';
import type { PoemListRow } from './eras.queries';

export type PoetStatsRow = {
  name: string;
  slug: string;
  poemsCount: number;
};

export type ListPoetsResult = {
  poets: PoetStatsRow[];
  total: number;
  totalPages: number;
};

export type ListPoetPoemsResult = {
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

export async function listPoets(db: DbClient, page: number): Promise<ListPoetsResult> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const [poets, total] = await Promise.all([
    db
      .select({
        name: poetStats.name,
        slug: poetStats.slug,
        poemsCount: poetStats.poemsCount,
      })
      .from(poetStats)
      .limit(limit)
      .offset(offset),
    db.$count(poetStats),
  ]);
  const totalPages = Math.ceil(total / limit);

  return { poets, total, totalPages };
}

export async function listPoetPoems(
  db: DbClient,
  slug: string,
  page: number
): Promise<ListPoetPoemsResult | null> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = (await db.execute(
    sql`SELECT name, poems_count FROM poet_stats WHERE slug = ${slug} LIMIT 1`
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
    WHERE pt.slug = ${slug}
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
