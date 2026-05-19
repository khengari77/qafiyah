import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { EraSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import { asEraSlug } from './brand';
import type { DbClient } from './client';
import { ERAS_SORT_ORDER } from './constants';
import { type ExecuteAsError, executeAs } from './execute-as';
import { type PoemListRow, parentScopedPoemRowSchema, parentStatsRowSchema, rawPoemRowSchema } from './row-schemas';
import { eraStats } from './schema';

const ERAS_SORT_INDEX = new Map<string, number>(ERAS_SORT_ORDER.map((name, i) => [name, i]));

export type EraStatsRow = {
  readonly name: string;
  readonly slug: EraSlug;
  readonly poetsCount: number;
  readonly poemsCount: number;
};

export type ListErasError = { readonly kind: 'sql_error'; readonly message: string };

export type ListEraPoemsResult = {
  readonly parent: { readonly name: string; readonly slug: EraSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListEraPoemsError =
  | { readonly kind: 'not_found'; readonly slug: EraSlug }
  | ExecuteAsError;

export async function listEras(
  db: DbClient
): Promise<Result<readonly EraStatsRow[], ListErasError>> {
  const queryResult = await ResultAsync.fromPromise(
    db
      .select({
        name: eraStats.name,
        slug: eraStats.slug,
        poetsCount: eraStats.poetsCount,
        poemsCount: eraStats.poemsCount,
      })
      .from(eraStats),
    (cause): ListErasError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const getSortIndex = (name: string): number =>
    ERAS_SORT_INDEX.get(name) ?? Number.MAX_SAFE_INTEGER;
  return ok(
    queryResult.value
      .map((row) => ({ ...row, slug: asEraSlug(row.slug) }))
      .sort((a, b) => getSortIndex(a.name) - getSortIndex(b.name))
  );
}

export async function listEraPoems(
  db: DbClient,
  slug: EraSlug,
  page: number
): Promise<Result<ListEraPoemsResult, ListEraPoemsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRowsResult = await executeAs(
    db,
    sql`SELECT name, poems_count FROM era_stats WHERE slug = ${slug} LIMIT 1`,
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
      JOIN public.eras e ON pt.era_id = e.id
      WHERE e.slug = ${slug}
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

export type ListAllEraPoemsError = ExecuteAsError;

export async function listAllEraPoems(
  db: DbClient
): Promise<Result<ReadonlyMap<EraSlug, readonly PoemListRow[]>, ListAllEraPoemsError>> {
  const rawPoemsResult = await executeAs(
    db,
    sql`
      SELECT
        e.slug AS parent_slug,
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
      ORDER BY e.slug, p.id
    `,
    parentScopedPoemRowSchema
  );
  if (rawPoemsResult.isErr()) return err(rawPoemsResult.error);

  const grouped = new Map<EraSlug, PoemListRow[]>();
  for (const row of rawPoemsResult.value) {
    const eraSlug = asEraSlug(row.parent_slug);
    const list = grouped.get(eraSlug);
    const entry: PoemListRow = {
      title: row.title,
      slug: row.slug,
      poetName: row.poet_name,
      poetSlug: row.poet_slug,
      meterName: row.meter_name,
      meterSlug: row.meter_slug,
    };
    if (list) list.push(entry);
    else grouped.set(eraSlug, [entry]);
  }
  return ok(grouped);
}
