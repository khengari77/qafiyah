import { describe, expect, it } from 'vitest';
import { createSearchClient } from './client';

describe('createSearchClient', () => {
  it('errors on an invalid url', () => {
    expect(createSearchClient('not a url').isErr()).toBe(true);
  });
  it('returns a client for a valid url', () => {
    expect(createSearchClient('http://localhost:9200').isOk()).toBe(true);
  });
});
