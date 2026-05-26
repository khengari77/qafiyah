import type { ThemeSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import { asThemeSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import { themeStats } from './schema';

export type ThemeStatsRow = {
  readonly name: string;
  readonly slug: ThemeSlug;
  readonly poemsCount: number;
};

export type ListThemesError = { readonly kind: 'sql_error'; readonly message: string };

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

const themeStatsRowSchema = v.object({
  name: v.string(),
  slug: v.string(),
  poems_count: v.union([v.number(), v.string()]),
});

export type GetThemeBySlugError =
  | { readonly kind: 'not_found'; readonly slug: ThemeSlug }
  | ExecuteAsError;

export async function getThemeBySlug(
  db: DbClient,
  slug: ThemeSlug
): Promise<Result<ThemeStatsRow, GetThemeBySlugError>> {
  const rowsResult = await executeAs(
    db,
    sql`SELECT name, slug, poems_count FROM theme_stats WHERE slug = ${slug} LIMIT 1`,
    themeStatsRowSchema
  );
  if (rowsResult.isErr()) return err(rowsResult.error);
  const row = rowsResult.value[0];
  if (!row) return err({ kind: 'not_found', slug });
  return ok({
    name: row.name,
    slug: asThemeSlug(row.slug),
    poemsCount: Number(row.poems_count),
  });
}
