import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { MeterSlug } from '@qafiyah/contracts';
import { inArray, sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import { asMeterSlug } from './brand';
import type { DbClient } from './client';
import { FORMAL_METERS } from './constants';
import { type ExecuteAsError, executeAs } from './execute-as';
import {
  type PoemListRow,
  parentScopedPoemRowSchema,
  parentStatsRowSchema,
  rawPoemRowSchema,
} from './row-schemas';
import { meterStats } from './schema';

export type MeterStatsRow = {
  readonly name: string;
  readonly slug: MeterSlug;
  readonly poemsCount: number;
  readonly poetsCount: number;
};

export type ListMetersError = { readonly kind: 'sql_error'; readonly message: string };

export type ListMeterPoemsResult = {
  readonly parent: { readonly name: string; readonly slug: MeterSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListMeterPoemsError =
  | { readonly kind: 'not_found'; readonly slug: MeterSlug }
  | ExecuteAsError;

export async function listMeters(
  db: DbClient
): Promise<Result<readonly MeterStatsRow[], ListMetersError>> {
  const queryResult = await ResultAsync.fromPromise(
    db
      .select({
        name: meterStats.name,
        slug: meterStats.slug,
        poemsCount: meterStats.poemsCount,
        poetsCount: meterStats.poetsCount,
      })
      .from(meterStats)
      .where(inArray(meterStats.name, FORMAL_METERS)),
    (cause): ListMetersError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  return ok(
    queryResult.value
      .map((row) => ({ ...row, slug: asMeterSlug(row.slug) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  );
}

export async function listMeterPoems(
  db: DbClient,
  slug: MeterSlug,
  page: number
): Promise<Result<ListMeterPoemsResult, ListMeterPoemsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRowsResult = await executeAs(
    db,
    sql`SELECT name, poems_count FROM meter_stats WHERE slug = ${slug} LIMIT 1`,
    parentStatsRowSchema
  );
  if (parentRowsResult.isErr()) return err(parentRowsResult.error);
  const parentRows = parentRowsResult.value;

  if (parentRows.length === 0 || !parentRows[0]) return err({ kind: 'not_found', slug });

  const total = Number(parentRows[0].poems_count);

  const rawPoemsResult = await executeAs(
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
  if (rawPoemsResult.isErr()) return err(rawPoemsResult.error);

  const poems: readonly PoemListRow[] = rawPoemsResult.value.map((row) => ({
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

export type ListAllMeterPoemsError = ExecuteAsError;

export async function listAllMeterPoems(
  db: DbClient
): Promise<Result<ReadonlyMap<MeterSlug, readonly PoemListRow[]>, ListAllMeterPoemsError>> {
  const rawPoemsResult = await executeAs(
    db,
    sql`
      SELECT
        m.slug AS parent_slug,
        p.title AS title,
        p.slug AS slug,
        pt.name AS poet_name,
        pt.slug AS poet_slug,
        m.name AS meter_name,
        m.slug AS meter_slug
      FROM public.poems p
      JOIN public.poets pt ON p.poet_id = pt.id
      JOIN public.meters m ON p.meter_id = m.id
      ORDER BY m.slug, p.id
    `,
    parentScopedPoemRowSchema
  );
  if (rawPoemsResult.isErr()) return err(rawPoemsResult.error);

  const grouped = new Map<MeterSlug, PoemListRow[]>();
  for (const row of rawPoemsResult.value) {
    const meterSlug = asMeterSlug(row.parent_slug);
    const list = grouped.get(meterSlug);
    const entry: PoemListRow = {
      title: row.title,
      slug: row.slug,
      poetName: row.poet_name,
      poetSlug: row.poet_slug,
      meterName: row.meter_name,
      meterSlug: row.meter_slug,
    };
    if (list) list.push(entry);
    else grouped.set(meterSlug, [entry]);
  }
  return ok(grouped);
}
