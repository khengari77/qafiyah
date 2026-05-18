import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { PoetSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { asPoetSlug } from './brand';
import type { DbClient } from './client';
import { executeAs } from './execute-as';
import { type PoemListRow, parentStatsRowSchema, rawPoemRowSchema } from './row-schemas';
import { poetStats } from './schema';

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
    poets: poets.map((row) => ({ ...row, slug: asPoetSlug(row.slug) })),
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
    parentStatsRowSchema
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

  const poems: readonly PoemListRow[] = rawPoems.map((row) => ({
    title: row.title,
    slug: row.slug,
    poetName: row.poet_name,
    poetSlug: row.poet_slug,
    meterName: row.meter_name,
    meterSlug: row.meter_slug,
  }));

  return {
    parent: { name: parentRows[0].name, slug, poemsCount: total },
    poems,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
