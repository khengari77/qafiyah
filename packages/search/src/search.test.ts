import { describe, expect, it } from 'vitest';
import type { SearchClient } from './client';
import { searchPoems } from './search';

// The ES client is the network boundary; stubbing client.search lets us assert the
// _source -> PoemHit mapping in isolation, without a live cluster.
function clientReturning(response: unknown): SearchClient {
  return { search: async () => response } as unknown as SearchClient;
}

describe('searchPoems mapping', () => {
  // Regression: meter.slug was hardcoded to '' in the mapper, which fails the
  // contract's meterSlugSchema (lowercase-letters regex) -> every poem hit 500'd
  // on output validation. It must be read from _source.meterSlug like era/poet.
  it('maps meter.slug from _source instead of emitting an empty string', async () => {
    const client = clientReturning({
      hits: {
        total: { value: 1 },
        hits: [
          {
            _score: 3.2,
            _source: {
              slug: 'aBcd',
              titleDisplay: 'قصيدةٌ',
              content: 'بيتٌ أوّل*بيتٌ ثانٍ*بيتٌ ثالث',
              poetNameDisplay: 'المتنبّي',
              poetSlug: 'mutanabbi',
              eraName: 'عباسي',
              eraSlug: 'abbasid',
              meterName: 'الطويل',
              meterSlug: 'altawil',
            },
            highlight: { content: ['بيتٌ <mark>أوّل</mark>'] },
          },
        ],
      },
    });

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

    expect(page.hits[0]?.meter).toEqual({ name: 'الطويل', slug: 'altawil' });
  });
});
