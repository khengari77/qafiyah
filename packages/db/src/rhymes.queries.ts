import type { RhymeSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import { asRhymeSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import { rhymeStats } from './schema';

export type RhymeLetterStatsRow = {
  readonly name: string;
  readonly slug: RhymeSlug;
  readonly poemsCount: number;
  readonly poetsCount: number;
};

export type ListRhymesError = { readonly kind: 'sql_error'; readonly message: string };

export async function listRhymes(
  db: DbClient
): Promise<Result<readonly RhymeLetterStatsRow[], ListRhymesError>> {
  const queryResult = await ResultAsync.fromPromise(
    db.select().from(rhymeStats).orderBy(rhymeStats.id),
    (cause): ListRhymesError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  const rows = queryResult.value.map(
    (r): RhymeLetterStatsRow => ({
      name: r.name,
      slug: asRhymeSlug(r.slug),
      poemsCount: r.poemsCount,
      poetsCount: r.poetsCount,
    })
  );
  return ok(rows);
}

const rhymeStatsRowSchema = v.object({
  name: v.string(),
  slug: v.string(),
  poems_count: v.union([v.number(), v.string()]),
  poets_count: v.union([v.number(), v.string()]),
});

export type GetRhymeBySlugError =
  | { readonly kind: 'not_found'; readonly slug: RhymeSlug }
  | ExecuteAsError;

export async function getRhymeBySlug(
  db: DbClient,
  slug: RhymeSlug
): Promise<Result<RhymeLetterStatsRow, GetRhymeBySlugError>> {
  const rowsResult = await executeAs(
    db,
    sql`SELECT name, slug, poems_count, poets_count FROM rhyme_stats WHERE slug = ${slug} LIMIT 1`,
    rhymeStatsRowSchema
  );
  if (rowsResult.isErr()) return err(rowsResult.error);
  const row = rowsResult.value[0];
  if (!row) return err({ kind: 'not_found', slug });
  return ok({
    name: row.name,
    slug: asRhymeSlug(row.slug),
    poemsCount: Number(row.poems_count),
    poetsCount: Number(row.poets_count),
  });
}
