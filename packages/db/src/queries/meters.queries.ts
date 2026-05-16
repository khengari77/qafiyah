import { FORMAL_METERS, POEMS_PER_PAGE } from '@qafiyah/constants';
import type { MeterSlug } from '@qafiyah/contracts';
import { inArray, sql } from 'drizzle-orm';
import type { DbClient } from '../client';
import { meterStats } from '../schema';
import { asMeterSlug } from '../utils/brand';
import { executeAs } from '../utils/execute-as';
import { parentRowSchema, rawPoemRowSchema } from './_row-schemas';
import type { PoemListRow } from './eras.queries';

export type MeterStatsRow = {
  readonly name: string;
  readonly slug: MeterSlug;
  readonly poemsCount: number;
  readonly poetsCount: number;
};

export type ListMeterPoemsResult = {
  readonly parent: { readonly name: string; readonly slug: MeterSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export async function listMeters(db: DbClient): Promise<readonly MeterStatsRow[]> {
  const results = await db
    .select({
      name: meterStats.name,
      slug: meterStats.slug,
      poemsCount: meterStats.poemsCount,
      poetsCount: meterStats.poetsCount,
    })
    .from(meterStats)
    .where(inArray(meterStats.name, FORMAL_METERS));
  return results
    .map((r) => ({ ...r, slug: asMeterSlug(r.slug) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listMeterPoems(
  db: DbClient,
  slug: MeterSlug,
  page: number
): Promise<ListMeterPoemsResult | null> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = await executeAs(
    db,
    sql`SELECT name, poems_count FROM meter_stats WHERE slug = ${slug} LIMIT 1`,
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
      WHERE m.slug = ${slug}
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
