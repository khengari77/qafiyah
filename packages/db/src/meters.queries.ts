import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { MeterSlug } from '@qafiyah/contracts';
import { inArray, sql } from 'drizzle-orm';
import { err, ok, type Result } from 'neverthrow';
import { asMeterSlug } from './brand';
import type { DbClient } from './client';
import { FORMAL_METERS } from './constants';
import { executeAs } from './execute-as';
import { type PoemListRow, parentStatsRowSchema, rawPoemRowSchema } from './row-schemas';
import { meterStats } from './schema';

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

export type ListMeterPoemsError = { readonly kind: 'not_found'; readonly slug: MeterSlug };

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
    .map((row) => ({ ...row, slug: asMeterSlug(row.slug) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function listMeterPoems(
  db: DbClient,
  slug: MeterSlug,
  page: number
): Promise<Result<ListMeterPoemsResult, ListMeterPoemsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRows = await executeAs(
    db,
    sql`SELECT name, poems_count FROM meter_stats WHERE slug = ${slug} LIMIT 1`,
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
      WHERE m.slug = ${slug}
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
