import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import {
  listResponse,
  listResponseWithMeta,
  pageParam,
  pageQueryInput,
  pagination,
  parentMeta,
  poemListItem,
  resourceResponse,
  slugAndPageInput,
  slugInput,
  statRow,
  statRowNoPoetsCount,
  subRef,
} from './_shared';

describe('pageParam', () => {
  it('parses string "1" to integer 1', () => {
    expect(v.parse(pageParam, '1')).toBe(1);
  });

  it('parses string "10" to integer 10', () => {
    expect(v.parse(pageParam, '10')).toBe(10);
  });

  it('rejects page 0', () => {
    expect(() => v.parse(pageParam, '0')).toThrow();
  });

  it('rejects negative page', () => {
    expect(() => v.parse(pageParam, '-1')).toThrow();
  });

  it('rejects non-numeric string', () => {
    expect(() => v.parse(pageParam, 'abc')).toThrow();
  });

  it('rejects fractional page', () => {
    expect(() => v.parse(pageParam, '1.5')).toThrow();
  });
});

describe('slugAndPageInput', () => {
  it('parses valid slug and page', () => {
    const result = v.parse(slugAndPageInput('my-slug'), { slug: 'my-slug', page: '2' });
    expect(result.slug).toBe('my-slug');
    expect(result.page).toBe(2);
  });

  it('defaults page to 1 when omitted', () => {
    const result = v.parse(slugAndPageInput('my-slug'), { slug: 'my-slug' });
    expect(result.page).toBe(1);
  });

  it('rejects missing slug', () => {
    expect(() => v.parse(slugAndPageInput('my-slug'), { page: '1' })).toThrow();
  });

  it('rejects invalid page', () => {
    expect(() => v.parse(slugAndPageInput('my-slug'), { slug: 'my-slug', page: '0' })).toThrow();
  });
});

describe('slugInput', () => {
  it('parses valid slug', () => {
    const result = v.parse(slugInput('mutanabbi'), { slug: 'mutanabbi' });
    expect(result.slug).toBe('mutanabbi');
  });

  it('rejects missing slug', () => {
    expect(() => v.parse(slugInput('mutanabbi'), {})).toThrow();
  });
});

describe('pageQueryInput', () => {
  it('defaults page to 1 when omitted', () => {
    const result = v.parse(pageQueryInput, {});
    expect(result.page).toBe(1);
  });

  it('parses provided page', () => {
    const result = v.parse(pageQueryInput, { page: '3' });
    expect(result.page).toBe(3);
  });
});

describe('subRef', () => {
  it('parses { name, slug } shape', () => {
    const result = v.parse(subRef, { name: 'المتنبي', slug: 'al-mutanabbi' });
    expect(result.name).toBe('المتنبي');
    expect(result.slug).toBe('al-mutanabbi');
  });

  it('rejects missing slug', () => {
    expect(() => v.parse(subRef, { name: 'x' })).toThrow();
  });

  it('rejects missing name', () => {
    expect(() => v.parse(subRef, { slug: 'x' })).toThrow();
  });
});

describe('statRow', () => {
  it('parses valid stat row', () => {
    const result = v.parse(statRow, {
      name: 'عباسي',
      slug: 'abbasid',
      poemsCount: 100,
      poetsCount: 50,
    });
    expect(result.name).toBe('عباسي');
    expect(result.poetsCount).toBe(50);
  });

  it('rejects missing poetsCount', () => {
    expect(() => v.parse(statRow, { name: 'عباسي', slug: 'abbasid', poemsCount: 100 })).toThrow();
  });
});

describe('statRowNoPoetsCount', () => {
  it('parses valid row without poetsCount', () => {
    const result = v.parse(statRowNoPoetsCount, { name: 'الغزل', slug: 'love', poemsCount: 200 });
    expect(result.name).toBe('الغزل');
    expect(result.poemsCount).toBe(200);
  });

  it('drops extra fields on parse', () => {
    const input = { name: 'الغزل', slug: 'love', poemsCount: 200, poetsCount: 10 };
    const result = v.parse(statRowNoPoetsCount, input);
    expect(result).not.toHaveProperty('poetsCount');
  });
});

describe('parentMeta', () => {
  it('parses { name, slug, poemsCount }', () => {
    const result = v.parse(parentMeta, { name: 'عباسي', slug: 'abbasid', poemsCount: 42 });
    expect(result).toEqual({ name: 'عباسي', slug: 'abbasid', poemsCount: 42 });
  });

  it('rejects missing poemsCount', () => {
    expect(() => v.parse(parentMeta, { name: 'x', slug: 'x' })).toThrow();
  });
});

describe('poemListItem', () => {
  it('parses with nested poet and meter refs', () => {
    const input = {
      title: 'قصيدة',
      slug: 'poem-1',
      poet: { name: 'المتنبي', slug: 'al-mutanabbi' },
      meter: { name: 'الطويل', slug: 'taweel' },
    };
    const result = v.parse(poemListItem, input);
    expect(result.poet.name).toBe('المتنبي');
    expect(result.meter.slug).toBe('taweel');
  });

  it('rejects flat poetName/meter strings', () => {
    expect(() =>
      v.parse(poemListItem, {
        title: 'q',
        slug: 's',
        poetName: 'p',
        meter: 'm',
      })
    ).toThrow();
  });
});

describe('pagination', () => {
  it('parses a complete pagination block', () => {
    const result = v.parse(pagination, {
      page: 1,
      pageSize: 30,
      totalPages: 5,
      totalItems: 142,
    });
    expect(result.totalItems).toBe(142);
  });

  it('rejects missing pageSize', () => {
    expect(() => v.parse(pagination, { page: 1, totalPages: 5, totalItems: 142 })).toThrow();
  });
});

describe('listResponse', () => {
  it('wraps items as { data, pagination }', () => {
    const schema = listResponse(subRef);
    const result = v.parse(schema, {
      data: [{ name: 'a', slug: 'a' }],
      pagination: { page: 1, pageSize: 30, totalPages: 1, totalItems: 1 },
    });
    expect(result.data).toHaveLength(1);
    expect(result.pagination.page).toBe(1);
  });

  it('rejects responses missing pagination', () => {
    const schema = listResponse(subRef);
    expect(() => v.parse(schema, { data: [] })).toThrow();
  });
});

describe('listResponseWithMeta', () => {
  it('wraps items as { data, pagination, meta }', () => {
    const schema = listResponseWithMeta(subRef, parentMeta);
    const result = v.parse(schema, {
      data: [],
      pagination: { page: 1, pageSize: 30, totalPages: 1, totalItems: 0 },
      meta: { name: 'x', slug: 'x', poemsCount: 0 },
    });
    expect(result.meta.name).toBe('x');
  });

  it('rejects responses missing meta', () => {
    const schema = listResponseWithMeta(subRef, parentMeta);
    expect(() =>
      v.parse(schema, {
        data: [],
        pagination: { page: 1, pageSize: 30, totalPages: 1, totalItems: 0 },
      })
    ).toThrow();
  });
});

describe('resourceResponse', () => {
  it('wraps a single resource as { data }', () => {
    const schema = resourceResponse(subRef);
    const result = v.parse(schema, { data: { name: 'x', slug: 'x' } });
    expect(result.data.name).toBe('x');
  });

  it('rejects responses missing data', () => {
    const schema = resourceResponse(subRef);
    expect(() => v.parse(schema, {})).toThrow();
  });
});
