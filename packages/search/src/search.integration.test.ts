import { POEMS_INDEX_ALIAS, POETS_INDEX_ALIAS } from '@qafiyah/constants';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bulkIndex, ensureIndex, swapAlias } from './admin';
import { createSearchClient, type SearchClient } from './client';
import { toPoemDoc, toPoetDoc } from './documents';
import { POEMS_INDEX_BODY, POETS_INDEX_BODY } from './indices';
import { searchPoems, searchPoets } from './search';
import { ES_TEST_URL, RUN_ES_INTEGRATION } from './test-utils';

// ES 8.x defaults destructive_requires_name=true which blocks wildcard deletes.
// We toggle it off transiently for setup/teardown only.
async function deleteTestIndices(c: SearchClient) {
  await c.cluster.putSettings({
    transient: { 'action.destructive_requires_name': false },
  });
  await c.indices.delete({ index: 'poems_v*', ignore_unavailable: true });
  await c.indices.delete({ index: 'poets_v*', ignore_unavailable: true });
  await c.cluster.putSettings({
    transient: { 'action.destructive_requires_name': null },
  });
}

describe.skipIf(!RUN_ES_INTEGRATION)('elasticsearch search (integration)', () => {
  let client: SearchClient;

  beforeAll(async () => {
    client = createSearchClient(ES_TEST_URL)._unsafeUnwrap();
    await deleteTestIndices(client);
    (await ensureIndex(client, 'poems_v1', POEMS_INDEX_BODY))._unsafeUnwrap();
    (await ensureIndex(client, 'poets_v1', POETS_INDEX_BODY))._unsafeUnwrap();
    (
      await bulkIndex(client, 'poems_v1', [
        toPoemDoc({
          id: 1,
          slug: 'poem-1',
          title: 'قصيدةٌ في الحُبِّ',
          content: 'أحبُّكِ يا ليلى*وأهوى',
          poetName: 'المُتنبّي',
          poetSlug: 'mutanabbi',
          eraName: 'عباسي',
          eraSlug: 'abbasid',
          meterName: 'الطويل',
          meterSlug: 'tawil',
          themeSlug: 'love',
          rhymeSlug: 'meem',
          collectionSlug: '',
        }),
        toPoemDoc({
          id: 2,
          slug: 'poem-2',
          title: 'الحماسة',
          content: 'إلى الحربِ*سِرنا',
          poetName: 'أبو تمام',
          poetSlug: 'abu-tammam',
          eraName: 'عباسي',
          eraSlug: 'abbasid',
          meterName: 'الكامل',
          meterSlug: 'kamil',
          themeSlug: 'war',
          rhymeSlug: 'baa',
          collectionSlug: '',
        }),
      ])
    )._unsafeUnwrap();
    (
      await bulkIndex(client, 'poets_v1', [
        toPoetDoc({
          id: 1,
          slug: 'mutanabbi',
          name: 'المُتنبّي',
          eraName: 'عباسي',
          eraSlug: 'abbasid',
        }),
      ])
    )._unsafeUnwrap();
    (await swapAlias(client, POEMS_INDEX_ALIAS, 'poems_v1'))._unsafeUnwrap();
    (await swapAlias(client, POETS_INDEX_ALIAS, 'poets_v1'))._unsafeUnwrap();
  }, 60_000);

  afterAll(async () => {
    if (client) await deleteTestIndices(client);
  });

  it('matches an Arabic query ignoring diacritics on the input', async () => {
    const page = (
      await searchPoems(client, {
        q: 'الحب',
        matchType: 'all',
        page: 1,
        poetSlugs: [],
        eraSlugs: [],
        meterSlugs: [],
        themeSlugs: [],
        rhymeSlugs: [],
        collectionSlugs: [],
      })
    )._unsafeUnwrap();
    expect(page.total).toBeGreaterThanOrEqual(1);
    expect(page.hits[0]?.slug).toBe('poem-1');
    expect(page.hits[0]?.title).toContain('الحُبِّ');
  });
  it('applies era + meter filters', async () => {
    const page = (
      await searchPoems(client, {
        q: '',
        matchType: 'all',
        page: 1,
        poetSlugs: [],
        eraSlugs: ['abbasid'],
        meterSlugs: ['kamil'],
        themeSlugs: [],
        rhymeSlugs: [],
        collectionSlugs: [],
      })
    )._unsafeUnwrap();
    expect(page.hits.map((h) => h.slug)).toEqual(['poem-2']);
  });
  it('returns a highlighted snippet wrapped in <mark>', async () => {
    const page = (
      await searchPoems(client, {
        q: 'ليلى',
        matchType: 'all',
        page: 1,
        poetSlugs: [],
        eraSlugs: [],
        meterSlugs: [],
        themeSlugs: [],
        rhymeSlugs: [],
        collectionSlugs: [],
      })
    )._unsafeUnwrap();
    expect(page.hits[0]?.snippet).toContain('<mark>');
  });
  it('searches poets by name', async () => {
    const page = (
      await searchPoets(client, {
        q: 'المتنبي',
        matchType: 'all',
        page: 1,
        eraSlugs: [],
      })
    )._unsafeUnwrap();
    expect(page.hits[0]?.slug).toBe('mutanabbi');
  });
});
