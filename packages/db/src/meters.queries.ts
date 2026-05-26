import type { MeterSlug } from '@qafiyah/contracts';
import { asc, sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import { asMeterSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import { meterStats } from './schema';

export type MeterStatsRow = {
  readonly name: string;
  readonly slug: MeterSlug;
  readonly poemsCount: number;
  readonly poetsCount: number;
};

export type ListMetersError = { readonly kind: 'sql_error'; readonly message: string };

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
      .orderBy(asc(meterStats.name)),
    (cause): ListMetersError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  return ok(queryResult.value.map((row) => ({ ...row, slug: asMeterSlug(row.slug) })));
}

const meterStatsRowSchema = v.object({
  name: v.string(),
  slug: v.string(),
  poems_count: v.union([v.number(), v.string()]),
  poets_count: v.union([v.number(), v.string()]),
});

export type GetMeterBySlugError =
  | { readonly kind: 'not_found'; readonly slug: MeterSlug }
  | ExecuteAsError;

export async function getMeterBySlug(
  db: DbClient,
  slug: MeterSlug
): Promise<Result<MeterStatsRow, GetMeterBySlugError>> {
  const rowsResult = await executeAs(
    db,
    sql`SELECT name, slug, poems_count, poets_count FROM meter_stats WHERE slug = ${slug} LIMIT 1`,
    meterStatsRowSchema
  );
  if (rowsResult.isErr()) return err(rowsResult.error);
  const row = rowsResult.value[0];
  if (!row) return err({ kind: 'not_found', slug });
  return ok({
    name: row.name,
    slug: asMeterSlug(row.slug),
    poemsCount: Number(row.poems_count),
    poetsCount: Number(row.poets_count),
  });
}
