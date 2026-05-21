import { describe, expect, it } from 'vitest';
import { diffKeys, nextIndexName, toBulkOperations } from './admin';

describe('nextIndexName', () => {
  it('increments the highest version behind a prefix', () => {
    expect(nextIndexName('poems_v', ['poems_v1', 'poems_v3'])).toBe('poems_v4');
    expect(nextIndexName('poems_v', [])).toBe('poems_v1');
  });
});
describe('toBulkOperations', () => {
  it('emits an index action line + source per doc, keyed by slug', () => {
    expect(toBulkOperations('poems_v1', [{ slug: 'a', hash: 'h' }])).toEqual([
      { index: { _index: 'poems_v1', _id: 'a' } },
      { slug: 'a', hash: 'h' },
    ]);
  });
});
describe('diffKeys', () => {
  it('classifies upserts (missing or changed) and deletes (orphaned)', () => {
    const pg = new Map([
      ['a', 'h1'],
      ['b', 'h2'],
      ['c', 'h3'],
    ]);
    const es = new Map([
      ['a', 'h1'],
      ['b', 'OLD'],
      ['x', 'h9'],
    ]);
    const d = diffKeys(pg, es);
    expect(new Set(d.upsert)).toEqual(new Set(['b', 'c']));
    expect(d.delete).toEqual(['x']);
  });
});
