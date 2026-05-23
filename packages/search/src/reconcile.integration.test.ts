import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bulkIndex, ensureIndex, indexHealth, reconcileFromSource, swapAlias } from './admin';
import { createSearchClient, type SearchClient } from './client';
import { type PoetDoc, toPoetDoc } from './documents';
import { POETS_INDEX_BODY } from './indices';
import { ES_TEST_URL, RUN_ES_INTEGRATION } from './test-utils';

// Use a test-only prefix/alias to avoid colliding with search.integration.test.ts.
const TEST_INDEX = 'rc_poets_v1';
const TEST_ALIAS = 'rc_poets';

function poet(id: number, name: string): PoetDoc {
  return toPoetDoc({ id, slug: `pt-${id}`, name, eraName: 'عباسي', eraSlug: 'abbasid' });
}

describe.skipIf(!RUN_ES_INTEGRATION)('reconcileFromSource (integration)', () => {
  let client: SearchClient;

  beforeAll(async () => {
    client = createSearchClient(ES_TEST_URL)._unsafeUnwrap();
    // ES 8.x blocks wildcard deletes by default — toggle off transiently for cleanup.
    await client.cluster.putSettings({ transient: { 'action.destructive_requires_name': false } });
    await client.indices.delete({ index: 'rc_poets*', ignore_unavailable: true });
    await client.cluster.putSettings({ transient: { 'action.destructive_requires_name': null } });

    (await ensureIndex(client, TEST_INDEX, POETS_INDEX_BODY))._unsafeUnwrap();
    // ES starts with: pt-1 (current), pt-2 (STALE — old name), pt-9 (ORPHAN).
    (
      await bulkIndex(client, TEST_INDEX, [
        poet(1, 'aaa'),
        { ...poet(2, 'OLD'), hash: 'stale' },
        poet(9, 'orphan'),
      ])
    )._unsafeUnwrap();
    (await swapAlias(client, TEST_ALIAS, TEST_INDEX))._unsafeUnwrap();
  }, 60_000);

  afterAll(async () => {
    if (!client) return;
    await client.cluster.putSettings({ transient: { 'action.destructive_requires_name': false } });
    await client.indices.delete({ index: 'rc_poets*', ignore_unavailable: true });
    await client.cluster.putSettings({ transient: { 'action.destructive_requires_name': null } });
  });

  it('upserts changed+missing and deletes orphans', async () => {
    // Source of truth: pt-1 (same), pt-2 (corrected), pt-3 (new). pt-9 is gone.
    const source = [poet(1, 'aaa'), poet(2, 'bbb'), poet(3, 'ccc')];
    const byHash = new Map(source.map((d) => [d.slug, d.hash]));
    const result = await reconcileFromSource(client, {
      alias: TEST_ALIAS,
      sourceKeys: async () => byHash,
      fetchDocs: async (slugs) => source.filter((d) => slugs.includes(d.slug)),
    });
    expect(result.isOk()).toBe(true);
    const { upserted, deleted } = result._unsafeUnwrap();
    expect(upserted).toBe(2); // pt-2 changed, pt-3 missing
    expect(deleted).toBe(1); // pt-9 orphan
    expect((await indexHealth(client, TEST_ALIAS))._unsafeUnwrap().count).toBe(3);
    const got = await client.get({ index: TEST_ALIAS, id: 'pt-2' });
    expect((got._source as { name: string }).name).toBe('bbb');
  });
});
