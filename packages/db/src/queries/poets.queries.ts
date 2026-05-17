import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { PoetSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { poetStats } from '../schema';
import { asPoetSlug } from '../utils/brand';
import { executeAs } from '../utils/execute-as';
import { parentRowSchema, rawPoemRowSchema } from './row-schemas';
import type { PoemListRow } from './types';

export type PoetStatsRow = {
  readonly name: string;
  readonly slug: PoetSlug;
  readonly poemsCount: number;
};

export type ListPoetsResult = {
  readonly poets: readonly PoetStatsRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListPoetPoemsResult = {
  readonly parent: { readonly name: string; readonly slug: PoetSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
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

  return {
    poets: poets.map((r) => ({ ...r, slug: asPoetSlug(r.slug) })),
    total,
    totalPages,
  };
}

export async function listPoetPoems(
  db: DbClient,
  slug: PoetSlug,
  page: number
): Promise<ListPoetPoemsResult | null> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = await executeAs(
    db,
    sql`SELECT name, poems_count FROM poet_stats WHERE slug = ${slug} LIMIT 1`,
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
      WHERE pt.slug = ${slug}
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
