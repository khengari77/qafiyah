import { ES_BULK_BATCH_SIZE } from '@qafiyah/constants';
import { type DbClient, indexingQueries } from '@qafiyah/db';
import { docHash, type PoemDoc, type PoetDoc, toPoemDoc, toPoetDoc } from '@qafiyah/search';

export function poemDocFetcher(db: DbClient) {
  return async (afterId: number): Promise<readonly PoemDoc[]> => {
    const r = await indexingQueries.streamPoemBatch(db, afterId, ES_BULK_BATCH_SIZE);
    if (r.isErr()) throw new Error(`streamPoemBatch: ${JSON.stringify(r.error)}`);
    return r.value.map(toPoemDoc);
  };
}

export function poetDocFetcher(db: DbClient) {
  return async (afterId: number): Promise<readonly PoetDoc[]> => {
    const r = await indexingQueries.streamPoetBatch(db, afterId, ES_BULK_BATCH_SIZE);
    if (r.isErr()) throw new Error(`streamPoetBatch: ${JSON.stringify(r.error)}`);
    return r.value.map(toPoetDoc);
  };
}

export async function poemSourceKeys(db: DbClient): Promise<ReadonlyMap<string, string>> {
  const keys = new Map<string, string>();
  let afterId = 0;
  for (;;) {
    const r = await indexingQueries.streamPoemBatch(db, afterId, ES_BULK_BATCH_SIZE);
    if (r.isErr()) throw new Error(`poemSourceKeys: ${JSON.stringify(r.error)}`);
    if (r.value.length === 0) break;
    for (const src of r.value) keys.set(src.slug, docHash(toPoemDoc(src)));
    const last = r.value[r.value.length - 1];
    if (!last) break;
    afterId = last.id;
  }
  return keys;
}

export async function poetSourceKeys(db: DbClient): Promise<ReadonlyMap<string, string>> {
  const keys = new Map<string, string>();
  let afterId = 0;
  for (;;) {
    const r = await indexingQueries.streamPoetBatch(db, afterId, ES_BULK_BATCH_SIZE);
    if (r.isErr()) throw new Error(`poetSourceKeys: ${JSON.stringify(r.error)}`);
    if (r.value.length === 0) break;
    for (const src of r.value) keys.set(src.slug, docHash(toPoetDoc(src)));
    const last = r.value[r.value.length - 1];
    if (!last) break;
    afterId = last.id;
  }
  return keys;
}

export async function fetchPoemDocsBySlugs(
  db: DbClient,
  slugs: readonly string[],
): Promise<readonly PoemDoc[]> {
  const r = await indexingQueries.getPoemsBySlugs(db, slugs);
  if (r.isErr()) throw new Error(`getPoemsBySlugs: ${JSON.stringify(r.error)}`);
  return r.value.map(toPoemDoc);
}

export async function fetchPoetDocsBySlugs(
  db: DbClient,
  slugs: readonly string[],
): Promise<readonly PoetDoc[]> {
  const r = await indexingQueries.getPoetsBySlugs(db, slugs);
  if (r.isErr()) throw new Error(`getPoetsBySlugs: ${JSON.stringify(r.error)}`);
  return r.value.map(toPoetDoc);
}
