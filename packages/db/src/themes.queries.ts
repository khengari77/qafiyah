import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { ThemeSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import { asThemeSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import { type PoemListRow, parentScopedPoemRowSchema, parentStatsRowSchema, rawPoemRowSchema } from './row-schemas';
import { themeStats } from './schema';

export type ThemeStatsRow = {
  readonly name: string;
  readonly slug: ThemeSlug;
  readonly poemsCount: number;
};

export type ListThemesError = { readonly kind: 'sql_error'; readonly message: string };

export type ListThemePoemsResult = {
  readonly parent: { readonly name: string; readonly slug: ThemeSlug; readonly poemsCount: number };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListThemePoemsError =
  | { readonly kind: 'not_found'; readonly slug: ThemeSlug }
  | ExecuteAsError;

export async function listThemes(
  db: DbClient
): Promise<Result<readonly ThemeStatsRow[], ListThemesError>> {
  const queryResult = await ResultAsync.fromPromise(
    db
      .select({
        name: themeStats.name,
        slug: themeStats.slug,
        poemsCount: themeStats.poemsCount,
      })
      .from(themeStats),
    (cause): ListThemesError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  return ok(
    queryResult.value
      .map((row) => ({ ...row, slug: asThemeSlug(row.slug) }))
      .sort((a, b) => b.poemsCount - a.poemsCount)
  );
}

export async function listThemePoems(
  db: DbClient,
  slug: ThemeSlug,
  page: number
): Promise<Result<ListThemePoemsResult, ListThemePoemsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRowsResult = await executeAs(
    db,
    sql`SELECT name, poems_count FROM theme_stats WHERE slug = ${slug}::UUID LIMIT 1`,
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
        p.slug::TEXT AS slug,
        pt.name AS poet_name,
        pt.slug AS poet_slug,
        m.name AS meter_name,
        m.slug AS meter_slug
      FROM public.poems p
      JOIN public.poets pt ON p.poet_id = pt.id
      JOIN public.meters m ON p.meter_id = m.id
      JOIN public.themes th ON p.theme_id = th.id
      WHERE th.slug = ${slug}::UUID
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

export type ListAllThemePoemsError = ExecuteAsError;

export async function listAllThemePoems(
  db: DbClient
): Promise<Result<ReadonlyMap<ThemeSlug, readonly PoemListRow[]>, ListAllThemePoemsError>> {
  const rawPoemsResult = await executeAs(
    db,
    sql`
      SELECT
        th.slug::TEXT AS parent_slug,
        p.title AS title,
        p.slug::TEXT AS slug,
        pt.name AS poet_name,
        pt.slug AS poet_slug,
        m.name AS meter_name,
        m.slug AS meter_slug
      FROM public.poems p
      JOIN public.poets pt ON p.poet_id = pt.id
      JOIN public.meters m ON p.meter_id = m.id
      JOIN public.themes th ON p.theme_id = th.id
      ORDER BY th.slug, p.id
    `,
    parentScopedPoemRowSchema
  );
  if (rawPoemsResult.isErr()) return err(rawPoemsResult.error);

  const grouped = new Map<ThemeSlug, PoemListRow[]>();
  for (const row of rawPoemsResult.value) {
    const themeSlug = asThemeSlug(row.parent_slug);
    const list = grouped.get(themeSlug);
    const entry: PoemListRow = {
      title: row.title,
      slug: row.slug,
      poetName: row.poet_name,
      poetSlug: row.poet_slug,
      meterName: row.meter_name,
      meterSlug: row.meter_slug,
    };
    if (list) list.push(entry);
    else grouped.set(themeSlug, [entry]);
  }
  return ok(grouped);
}
