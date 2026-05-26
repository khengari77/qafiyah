import type { CollectionSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import * as v from 'valibot';
import { asCollectionSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import { collectionStats } from './schema';

export type CollectionStatsRow = {
  readonly name: string;
  readonly slug: CollectionSlug;
  readonly poemsCount: number;
};

export type ListCollectionsError = { readonly kind: 'sql_error'; readonly message: string };

export async function listCollections(
  db: DbClient
): Promise<Result<readonly CollectionStatsRow[], ListCollectionsError>> {
  const queryResult = await ResultAsync.fromPromise(
    db
      .select({
        name: collectionStats.name,
        slug: collectionStats.slug,
        poemsCount: collectionStats.poemsCount,
      })
      .from(collectionStats),
    (cause): ListCollectionsError => ({
      kind: 'sql_error',
      message: cause instanceof Error ? cause.message : String(cause),
    })
  );
  if (queryResult.isErr()) return err(queryResult.error);
  return ok(
    queryResult.value
      .map((row) => ({ ...row, slug: asCollectionSlug(row.slug) }))
      .sort((a, b) => b.poemsCount - a.poemsCount)
  );
}

const collectionStatsRowSchema = v.object({
  name: v.string(),
  slug: v.string(),
  poems_count: v.union([v.number(), v.string()]),
});

export type GetCollectionBySlugError =
  | { readonly kind: 'not_found'; readonly slug: CollectionSlug }
  | ExecuteAsError;

export async function getCollectionBySlug(
  db: DbClient,
  slug: CollectionSlug
): Promise<Result<CollectionStatsRow, GetCollectionBySlugError>> {
  const rowsResult = await executeAs(
    db,
    sql`SELECT name, slug, poems_count FROM collection_stats WHERE slug = ${slug} LIMIT 1`,
    collectionStatsRowSchema
  );
  if (rowsResult.isErr()) return err(rowsResult.error);
  const row = rowsResult.value[0];
  if (!row) return err({ kind: 'not_found', slug });
  return ok({
    name: row.name,
    slug: asCollectionSlug(row.slug),
    poemsCount: Number(row.poems_count),
  });
}
