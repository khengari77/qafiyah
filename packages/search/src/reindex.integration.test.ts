import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { indexHealth, listIndicesForAlias, reindexFromSource } from './admin';
import { createSearchClient, type SearchClient } from './client';
import { toPoemDoc } from './documents';
import { POEMS_INDEX_BODY } from './indices';
import { ES_TEST_URL, RUN_ES_INTEGRATION } from './test-utils';

// Use a test-only prefix/alias to avoid colliding with search.integration.test.ts.
const TEST_PREFIX = 'rx_poems_v';
const TEST_ALIAS = 'rx_poems';

function sampleDoc(id: number) {
  return toPoemDoc({
    id,
    slug: `rx-${id}`,
    title: `قصيدة ${id}`,
    content: 'بيت*آخر',
    poetName: 'شاعر',
    poetSlug: 'sp',
    eraName: 'عباسي',
    eraSlug: 'abbasid',
    meterName: 'الطويل',
    meterSlug: 'tawil',
    themeSlug: 'love',
    rhymeSlug: 'meem',
    collectionSlug: '',
  });
}

async function cleanupTestIndices(c: SearchClient) {
  await c.cluster.putSettings({ transient: { 'action.destructive_requires_name': false } });
  await c.indices.delete({ index: `${TEST_PREFIX}*`, ignore_unavailable: true });
  await c.cluster.putSettings({ transient: { 'action.destructive_requires_name': null } });
}

describe.skipIf(!RUN_ES_INTEGRATION)('reindexFromSource (integration)', () => {
  let client: SearchClient;

  beforeAll(async () => {
    client = createSearchClient(ES_TEST_URL)._unsafeUnwrap();
    await cleanupTestIndices(client);
  }, 60_000);

  afterAll(async () => {
    if (client) await cleanupTestIndices(client);
  });

  it('builds a versioned index, bulk-loads, swaps the alias, and is queryable', async () => {
    const docs = [sampleDoc(1), sampleDoc(2)];
    let served = false;
    const result = await reindexFromSource(client, {
      alias: TEST_ALIAS,
      prefix: TEST_PREFIX,
      body: POEMS_INDEX_BODY,
      fetchBatch: async () => {
        if (served) return [];
        served = true;
        return docs;
      },
      cursorOf: (d) => d.id,
    });
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().count).toBe(2);
    const health = (await indexHealth(client, TEST_ALIAS))._unsafeUnwrap();
    expect(health.count).toBe(2);
  });

  it('a second reindex creates a new version and drops the old one', async () => {
    let served = false;
    (
      await reindexFromSource(client, {
        alias: TEST_ALIAS,
        prefix: TEST_PREFIX,
        body: POEMS_INDEX_BODY,
        fetchBatch: async () => {
          if (served) return [];
          served = true;
          return [sampleDoc(1)];
        },
        cursorOf: (d) => d.id,
      })
    )._unsafeUnwrap();
    const indices = (await listIndicesForAlias(client, TEST_PREFIX))._unsafeUnwrap();
    expect(indices.length).toBe(1); // old version dropped
    expect((await indexHealth(client, TEST_ALIAS))._unsafeUnwrap().count).toBe(1);
  });
});
