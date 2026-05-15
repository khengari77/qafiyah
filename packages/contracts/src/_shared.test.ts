import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import {
  pageParam,
  paginationFields,
  poemListItem,
  poemListItemNoMeter,
  poemListItemNoPoet,
  slugAndPageInput,
  slugInput,
  statRow,
  statRowNoPoetsCount,
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
    const result = v.parse(slugAndPageInput, { slug: 'my-slug', page: '2' });
    expect(result.slug).toBe('my-slug');
    expect(result.page).toBe(2);
  });

  it('rejects missing slug', () => {
    expect(() => v.parse(slugAndPageInput, { page: '1' })).toThrow();
  });

  it('rejects missing page', () => {
    expect(() => v.parse(slugAndPageInput, { slug: 'my-slug' })).toThrow();
  });

  it('rejects invalid page', () => {
    expect(() => v.parse(slugAndPageInput, { slug: 'my-slug', page: '0' })).toThrow();
  });
});

describe('slugInput', () => {
  it('parses valid slug', () => {
    const result = v.parse(slugInput, { slug: 'mutanabbi' });
    expect(result.slug).toBe('mutanabbi');
  });

  it('rejects missing slug', () => {
    expect(() => v.parse(slugInput, {})).toThrow();
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

  it('rejects extra fields when strict', () => {
    const input = { name: 'الغزل', slug: 'love', poemsCount: 200, poetsCount: 10 };
    const result = v.parse(statRowNoPoetsCount, input);
    expect(result).not.toHaveProperty('poetsCount');
  });
});

describe('poemListItem', () => {
  it('parses a complete poem list item', () => {
    const input = { title: 'قصيدة', slug: 'poem-1', poetName: 'المتنبي', meter: 'الطويل' };
    const result = v.parse(poemListItem, input);
    expect(result.meter).toBe('الطويل');
  });

  it('rejects missing meter', () => {
    expect(() => v.parse(poemListItem, { title: 'q', slug: 's', poetName: 'p' })).toThrow();
  });
});

describe('poemListItemNoMeter', () => {
  it('parses without meter field', () => {
    const result = v.parse(poemListItemNoMeter, {
      title: 'قصيدة',
      slug: 'poem-1',
      poetName: 'شاعر',
    });
    expect(result.title).toBe('قصيدة');
    expect(result).not.toHaveProperty('meter');
  });
});

describe('poemListItemNoPoet', () => {
  it('parses without poetName field', () => {
    const result = v.parse(poemListItemNoPoet, { title: 'قصيدة', slug: 'poem-1', meter: 'الكامل' });
    expect(result.meter).toBe('الكامل');
    expect(result).not.toHaveProperty('poetName');
  });
});

describe('paginationFields', () => {
  it('is a plain object with three numeric fields', () => {
    expect(paginationFields).toHaveProperty('page');
    expect(paginationFields).toHaveProperty('totalPages');
    expect(paginationFields).toHaveProperty('total');
  });
});
