import { describe, expect, it } from 'vitest';
import type { PoemSearchResult } from '@/lib/api/rpc';
import { deriveSearchStatus, deriveSectionStatus, type FetchStatus } from './search-status';

const items = [{ type: 'poem' }] as unknown as readonly PoemSearchResult[];

const idle: FetchStatus = { kind: 'idle' };
const loading: FetchStatus = { kind: 'loading' };
const error: FetchStatus = { kind: 'error' };
const success: FetchStatus = { kind: 'success', data: items };
const fetchingMore: FetchStatus = { kind: 'success-fetching-more', data: items };

describe('deriveSectionStatus', () => {
  it('is idle when the section cannot search, ignoring query flags', () => {
    const status = deriveSectionStatus({
      canSearch: false,
      isError: true,
      isFetchingNextPage: false,
      isSuccess: true,
      items,
    });
    expect(status).toEqual({ kind: 'idle' });
  });

  it('is error when the query errored', () => {
    const status = deriveSectionStatus({
      canSearch: true,
      isError: true,
      isFetchingNextPage: false,
      isSuccess: false,
      items,
    });
    expect(status).toEqual({ kind: 'error' });
  });

  it('is success-fetching-more (carrying current data) while paginating', () => {
    const status = deriveSectionStatus({
      canSearch: true,
      isError: false,
      isFetchingNextPage: true,
      isSuccess: true,
      items,
    });
    expect(status).toEqual({ kind: 'success-fetching-more', data: items });
  });

  it('is success (carrying data) once settled', () => {
    const status = deriveSectionStatus({
      canSearch: true,
      isError: false,
      isFetchingNextPage: false,
      isSuccess: true,
      items,
    });
    expect(status).toEqual({ kind: 'success', data: items });
  });

  it('is loading when searchable but not yet settled', () => {
    const status = deriveSectionStatus({
      canSearch: true,
      isError: false,
      isFetchingNextPage: false,
      isSuccess: false,
      items,
    });
    expect(status).toEqual({ kind: 'loading' });
  });
});

describe('deriveSearchStatus', () => {
  it('is idle when there are no active sections', () => {
    expect(deriveSearchStatus([])).toEqual({ kind: 'idle' });
  });

  it('is idle when every active section is idle', () => {
    expect(
      deriveSearchStatus([
        { status: idle, total: 0 },
        { status: idle, total: 0 },
      ])
    ).toEqual({ kind: 'idle' });
  });

  it('is loading when any active section is still loading', () => {
    expect(
      deriveSearchStatus([
        { status: loading, total: 0 },
        { status: success, total: 5 },
      ])
    ).toEqual({ kind: 'loading' });
  });

  it('prefers loading over a sibling error (waits for the clean reveal)', () => {
    expect(
      deriveSearchStatus([
        { status: loading, total: 0 },
        { status: error, total: 0 },
      ])
    ).toEqual({ kind: 'loading' });
  });

  it('is error only when every active section failed', () => {
    expect(
      deriveSearchStatus([
        { status: error, total: 0 },
        { status: error, total: 0 },
      ])
    ).toEqual({ kind: 'error' });
  });

  it('shows results from the section that succeeded when its sibling errored', () => {
    expect(
      deriveSearchStatus([
        { status: error, total: 0 },
        { status: success, total: 3 },
      ])
    ).toEqual({ kind: 'results' });
  });

  it('is empty when a section errored and the surviving section has no results', () => {
    expect(
      deriveSearchStatus([
        { status: error, total: 0 },
        { status: success, total: 0 },
      ])
    ).toEqual({ kind: 'empty' });
  });

  it('is empty when all sections succeeded with zero combined results', () => {
    expect(
      deriveSearchStatus([
        { status: success, total: 0 },
        { status: success, total: 0 },
      ])
    ).toEqual({ kind: 'empty' });
  });

  it('is results when the combined total is positive', () => {
    expect(
      deriveSearchStatus([
        { status: success, total: 0 },
        { status: success, total: 7 },
      ])
    ).toEqual({ kind: 'results' });
  });

  it('treats a paginating section as settled, not loading', () => {
    expect(
      deriveSearchStatus([
        { status: fetchingMore, total: 12 },
        { status: success, total: 4 },
      ])
    ).toEqual({ kind: 'results' });
  });
});
