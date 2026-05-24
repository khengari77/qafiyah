import { POEMS_PER_PAGE } from '@qafiyah/constants';
import type { CollectionSlug } from '@qafiyah/contracts';
import { sql } from 'drizzle-orm';
import { err, ok, type Result, ResultAsync } from 'neverthrow';
import { asCollectionSlug } from './brand';
import type { DbClient } from './client';
import { type ExecuteAsError, executeAs } from './execute-as';
import {
  type PoemListRow,
  parentScopedPoemRowSchema,
  parentStatsRowSchema,
  rawPoemRowSchema,
} from './row-schemas';
import { collectionStats } from './schema';

export type CollectionStatsRow = {
  readonly name: string;
  readonly slug: CollectionSlug;
  readonly poemsCount: number;
};

export type ListCollectionsError = { readonly kind: 'sql_error'; readonly message: string };

export type ListCollectionPoemsResult = {
  readonly parent: {
    readonly name: string;
    readonly slug: CollectionSlug;
    readonly poemsCount: number;
  };
  readonly poems: readonly PoemListRow[];
  readonly total: number;
  readonly totalPages: number;
};

export type ListCollectionPoemsError =
  | { readonly kind: 'not_found'; readonly slug: CollectionSlug }
  | ExecuteAsError;

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

export async function listCollectionPoems(
  db: DbClient,
  slug: CollectionSlug,
  page: number
): Promise<Result<ListCollectionPoemsResult, ListCollectionPoemsError>> {
  const limit = POEMS_PER_PAGE;
  const offset = (page - 1) * limit;

  const parentRowsResult = await executeAs(
    db,
    sql`SELECT name, poems_count FROM collection_stats WHERE slug = ${slug}::UUID LIMIT 1`,
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
      JOIN public.collections c ON p.collection_id = c.id
      WHERE c.slug = ${slug}::UUID
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

export type ListAllCollectionPoemsError = ExecuteAsError;

export async function listAllCollectionPoems(
  db: DbClient
): Promise<Result<ReadonlyMap<CollectionSlug, readonly PoemListRow[]>, ListAllCollectionPoemsError>> {
  const rawPoemsResult = await executeAs(
    db,
    sql`
      SELECT
        c.slug::TEXT AS parent_slug,
        p.title AS title,
        p.slug::TEXT AS slug,
        pt.name AS poet_name,
        pt.slug AS poet_slug,
        m.name AS meter_name,
        m.slug AS meter_slug
      FROM public.poems p
      JOIN public.poets pt ON p.poet_id = pt.id
      JOIN public.meters m ON p.meter_id = m.id
      JOIN public.collections c ON p.collection_id = c.id
      ORDER BY c.slug, p.id
    `,
    parentScopedPoemRowSchema
  );
  if (rawPoemsResult.isErr()) return err(rawPoemsResult.error);

  const grouped = new Map<CollectionSlug, PoemListRow[]>();
  for (const row of rawPoemsResult.value) {
    const collectionSlug = asCollectionSlug(row.parent_slug);
    const list = grouped.get(collectionSlug);
    const entry: PoemListRow = {
      title: row.title,
      slug: row.slug,
      poetName: row.poet_name,
      poetSlug: row.poet_slug,
      meterName: row.meter_name,
      meterSlug: row.meter_slug,
    };
    if (list) list.push(entry);
    else grouped.set(collectionSlug, [entry]);
  }
  return ok(grouped);
}
