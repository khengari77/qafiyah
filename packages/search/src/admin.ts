import { ES_BULK_BATCH_SIZE } from '@qafiyah/constants';
import { err, ok, type Result } from 'neverthrow';
import type { SearchClient } from './client';

export type AdminError = { readonly kind: 'es_error'; readonly message: string };

function toAdminError(cause: unknown): AdminError {
  return { kind: 'es_error', message: cause instanceof Error ? cause.message : String(cause) };
}

export function nextIndexName(prefix: string, existing: readonly string[]): string {
  const versions = existing
    .filter((name) => name.startsWith(prefix))
    .map((name) => Number.parseInt(name.slice(prefix.length), 10))
    .filter(Number.isInteger);
  const next = versions.length === 0 ? 1 : Math.max(...versions) + 1;
  return `${prefix}${next}`;
}

export function toBulkOperations(
  index: string,
  docs: readonly ({ readonly slug: string } & Record<string, unknown>)[]
): unknown[] {
  const ops: unknown[] = [];
  for (const doc of docs) {
    ops.push({ index: { _index: index, _id: doc.slug } });
    ops.push(doc);
  }
  return ops;
}

export function diffKeys(
  pg: ReadonlyMap<string, string>,
  es: ReadonlyMap<string, string>
): { readonly upsert: string[]; readonly delete: string[] } {
  const upsert: string[] = [];
  for (const [slug, hash] of pg) if (es.get(slug) !== hash) upsert.push(slug);
  const del: string[] = [];
  for (const slug of es.keys()) if (!pg.has(slug)) del.push(slug);
  return { upsert, delete: del };
}

export async function ensureIndex(
  client: SearchClient,
  name: string,
  body: object
): Promise<Result<boolean, AdminError>> {
  try {
    const exists = await client.indices.exists({ index: name });
    if (exists) return ok(false);
    await client.indices.create({ index: name, ...body });
    return ok(true);
  } catch (cause) {
    return err(toAdminError(cause));
  }
}

export async function bulkIndex(
  client: SearchClient,
  index: string,
  docs: readonly { readonly slug: string }[]
): Promise<Result<number, AdminError>> {
  try {
    for (let i = 0; i < docs.length; i += ES_BULK_BATCH_SIZE) {
      const batch = docs.slice(i, i + ES_BULK_BATCH_SIZE);
      if (batch.length === 0) continue;
      const res = await client.bulk({ operations: toBulkOperations(index, batch) });
      if (res.errors) {
        const firstError = res.items.find((it) => it.index?.error)?.index?.error?.reason;
        return err({ kind: 'es_error', message: `bulk errors: ${firstError ?? 'unknown'}` });
      }
    }
    await client.indices.refresh({ index });
    return ok(docs.length);
  } catch (cause) {
    return err(toAdminError(cause));
  }
}

// Atomically point an alias at a new index (removing it from any prior version).
export async function swapAlias(
  client: SearchClient,
  alias: string,
  toIndex: string
): Promise<Result<void, AdminError>> {
  try {
    await client.indices.updateAliases({
      actions: [
        { remove: { alias, index: `${alias}_v*`, must_exist: false } },
        { add: { alias, index: toIndex } },
      ],
    });
    return ok(undefined);
  } catch (cause) {
    return err(toAdminError(cause));
  }
}

export async function listIndicesForAlias(
  client: SearchClient,
  prefix: string
): Promise<Result<string[], AdminError>> {
  try {
    const rows = await client.cat.indices({ index: `${prefix}*`, format: 'json' });
    return ok((rows as Array<{ index?: string }>).map((r) => r.index ?? '').filter(Boolean));
  } catch (_cause) {
    // cat.indices throws index_not_found when nothing matches — treat as empty.
    return ok([]);
  }
}

export async function indexHealth(
  client: SearchClient,
  alias: string
): Promise<Result<{ alias: string; count: number }, AdminError>> {
  try {
    const res = await client.count({ index: alias });
    return ok({ alias, count: res.count });
  } catch (cause) {
    return err(toAdminError(cause));
  }
}

export type ReindexConfig<TDoc extends { readonly slug: string; readonly id?: number }> = {
  readonly alias: string;
  readonly prefix: string;
  readonly body: object;
  // Returns the next batch keyed by ascending cursor; return [] when exhausted.
  readonly fetchBatch: (cursor: number) => Promise<readonly TDoc[]>;
  // Advance the cursor from the last doc of a batch (default: last.id).
  readonly cursorOf?: (doc: TDoc) => number;
};

// Build a fresh versioned index, bulk-load it, then atomically point the alias at
// it and drop the previous versions — zero-downtime reindex.
export async function reindexFromSource<
  TDoc extends { readonly slug: string; readonly id?: number },
>(
  client: SearchClient,
  config: ReindexConfig<TDoc>
): Promise<Result<{ readonly index: string; readonly count: number }, AdminError>> {
  const existing = await listIndicesForAlias(client, config.prefix);
  if (existing.isErr()) return err(existing.error);
  const target = nextIndexName(config.prefix, existing.value);

  const created = await ensureIndex(client, target, config.body);
  if (created.isErr()) return err(created.error);

  let cursor = 0;
  let total = 0;
  for (;;) {
    const batch = await config.fetchBatch(cursor);
    if (batch.length === 0) break;
    const bulk = await bulkIndex(client, target, batch);
    if (bulk.isErr()) return err(bulk.error);
    total += batch.length;
    const last = batch[batch.length - 1];
    if (!last) break;
    cursor = config.cursorOf ? config.cursorOf(last) : (last.id ?? cursor + batch.length);
  }

  const swapped = await swapAlias(client, config.alias, target);
  if (swapped.isErr()) return err(swapped.error);

  for (const name of existing.value) {
    if (name !== target) {
      try {
        await client.indices.delete({ index: name, ignore_unavailable: true });
      } catch {
        // best-effort: the alias already points at the new index
      }
    }
  }
  return ok({ index: target, count: total });
}

export type ReconcileConfig<TDoc extends { readonly slug: string }> = {
  readonly alias: string;
  // (slug → hash) for everything currently in the source of truth (Postgres).
  readonly sourceKeys: () => Promise<ReadonlyMap<string, string>>;
  // Fetch full docs for the slugs that need upserting.
  readonly fetchDocs: (slugs: readonly string[]) => Promise<readonly TDoc[]>;
};

// Scroll the whole alias (slug → hash), diff against the source, then upsert
// changed/missing docs and delete orphans. Returns counts for observability.
export async function reconcileFromSource<TDoc extends { readonly slug: string }>(
  client: SearchClient,
  config: ReconcileConfig<TDoc>
): Promise<Result<{ readonly upserted: number; readonly deleted: number }, AdminError>> {
  try {
    const esKeys = new Map<string, string>();
    let response = await client.search({
      index: config.alias,
      scroll: '2m',
      size: 1000,
      _source: ['slug', 'hash'],
      query: { match_all: {} },
    });
    let scrollId = response._scroll_id;
    let hits = response.hits.hits;
    while (hits.length > 0) {
      for (const h of hits) {
        const src = h._source as { slug: string; hash: string };
        esKeys.set(src.slug, src.hash);
      }
      if (!scrollId) break;
      response = await client.scroll({ scroll_id: scrollId, scroll: '2m' });
      scrollId = response._scroll_id;
      hits = response.hits.hits;
    }
    if (scrollId) await client.clearScroll({ scroll_id: scrollId });

    const pgKeys = await config.sourceKeys();
    const { upsert, delete: orphans } = diffKeys(pgKeys, esKeys);

    if (upsert.length > 0) {
      const docs = await config.fetchDocs(upsert);
      const bulk = await bulkIndex(client, config.alias, docs);
      if (bulk.isErr()) return err(bulk.error);
    }
    if (orphans.length > 0) {
      await client.bulk({
        operations: orphans.map((slug) => ({ delete: { _index: config.alias, _id: slug } })),
      });
      await client.indices.refresh({ index: config.alias });
    }
    return ok({ upserted: upsert.length, deleted: orphans.length });
  } catch (cause) {
    return err(toAdminError(cause));
  }
}
