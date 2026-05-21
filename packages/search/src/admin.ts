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
