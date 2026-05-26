import type { EraSlug } from '@qafiyah/contracts';
import { asc, sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import { asEraSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import { eraStats } from './schema';

export type EraStatsRow = {
  readonly name: string;
  readonly slug: EraSlug;
  readonly poetsCount: number;
  readonly poemsCount: number;
};

export type ListErasError = { readonly kind: 'sql_error'; readonly message: string };

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
      .from(eraStats)
      .orderBy(asc(eraStats.sortOrder)),
    (cause): ListErasError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  return ok(queryResult.value.map((row) => ({ ...row, slug: asEraSlug(row.slug) })));
}

const eraStatsRowSchema = v.object({
  name: v.string(),
  slug: v.string(),
  poems_count: v.union([v.number(), v.string()]),
  poets_count: v.union([v.number(), v.string()]),
});

export type GetEraBySlugError =
  | { readonly kind: 'not_found'; readonly slug: EraSlug }
  | ExecuteAsError;

export async function getEraBySlug(
  db: DbClient,
  slug: EraSlug
): Promise<Result<EraStatsRow, GetEraBySlugError>> {
  const rowsResult = await executeAs(
    db,
    sql`SELECT name, slug, poems_count, poets_count FROM era_stats WHERE slug = ${slug} LIMIT 1`,
    eraStatsRowSchema
  );
  if (rowsResult.isErr()) return err(rowsResult.error);
  const row = rowsResult.value[0];
  if (!row) return err({ kind: 'not_found', slug });
  return ok({
    name: row.name,
    slug: asEraSlug(row.slug),
    poemsCount: Number(row.poems_count),
    poetsCount: Number(row.poets_count),
  });
}
