import { describe, expect, it, vi } from 'vitest';

// The builders are pure; we only mock the client so importing the accessor
// modules doesn't boot the env layer.
vi.mock('./server/client', () => ({ apiServer: {} }));

import {
  buildTaxonomyIndexView,
  buildTaxonomyTermView,
  type TaxonomyTermLoad,
} from './taxonomy-pages';

const poems = [
  {
    title: 'البردة',
    slug: 'p1',
    poet: { name: 'المتنبي', slug: 'mutanabbi' },
    meter: { name: 'الكامل', slug: 'alkamil' },
  },
] as unknown as TaxonomyTermLoad['poems'];

describe('buildTaxonomyTermView', () => {
  it('renders the meters term page strings, with the poet as the card subtitle', () => {
    const { layout, body } = buildTaxonomyTermView('meters', {
      term: { name: 'الطويل', slug: 'altaweel', poemsCount: 12 },
      poems,
      pagination: { page: 1, totalPages: 3 },
    });

    expect(layout.title).toBe('قافية | قصائد بحر الطويل');
    expect(layout.description).toBe('قصائد على بحر الطويل على قافية — الصفحة ١ من ٣، ١٢ قصيدة.');
    expect(layout.canonical).toBe('/meters/altaweel');
    expect((layout.jsonLd[0] as { name: string }).name).toBe('قصائد بحر الطويل');
    expect(body.heading).toBe('قصائد بحر الطويل (١٢ قصيدة)');
    expect(body.items[0]?.subtitle).toBe('المتنبي');
    expect(body.pagination.hasPrevPage).toBe(false);
    expect(body.pagination.hasNextPage).toBe(true);
  });

  it('renders the rhymes heading without a prefix and uses the meter as the card subtitle', () => {
    const { body, layout } = buildTaxonomyTermView('rhymes', {
      term: { name: 'الراء', slug: 'r', poemsCount: 5 },
      poems,
      pagination: { page: 2, totalPages: 4 },
    });

    expect(body.heading).toBe('الراء (٥ قصيدة)');
    expect(body.items[0]?.subtitle).toBe('الكامل');
    expect(layout.canonical).toBe('/rhymes/r?page=2');
  });
});

describe('buildTaxonomyIndexView', () => {
  it('keeps the meters subtitle spacing (space after و)', () => {
    const { body } = buildTaxonomyIndexView('meters', [
      { name: 'الطويل', slug: 'altaweel', poemsCount: 12, poetsCount: 3 },
    ]);
    expect(body.heading).toBe('جميع البحور (١ بحر)');
    expect(body.items[0]?.subtitle).toBe('٣ شاعر و ١٢ قصيدة');
    expect(body.emptyVariant).toBe('error');
  });

  it('keeps the rhymes subtitle spacing (no space after و)', () => {
    const { body } = buildTaxonomyIndexView('rhymes', [
      { name: 'الراء', slug: 'r', poemsCount: 5, poetsCount: 2 },
    ]);
    expect(body.items[0]?.subtitle).toBe('٢ شاعر و٥ قصيدة');
  });
});
