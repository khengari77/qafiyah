import { match } from 'ts-pattern';
import type { PoemSearchResult, PoetSearchResult } from '@/lib/api/rpc';

export type FetchStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'success';
      readonly data: readonly (PoemSearchResult | PoetSearchResult)[];
    }
  | {
      readonly kind: 'success-fetching-more';
      readonly data: readonly (PoemSearchResult | PoetSearchResult)[];
    }
  | { readonly kind: 'error' };

// One status for the whole search, derived from the per-section statuses.
export type SearchStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'error' }
  | { readonly kind: 'empty' }
  | { readonly kind: 'results' };

export function deriveSectionStatus(input: {
  readonly canSearch: boolean;
  readonly isError: boolean;
  readonly isFetchingNextPage: boolean;
  readonly isSuccess: boolean;
  readonly items: readonly (PoemSearchResult | PoetSearchResult)[];
}): FetchStatus {
  return match(input)
    .with({ canSearch: false }, () => ({ kind: 'idle' as const }))
    .with({ isError: true }, () => ({ kind: 'error' as const }))
    .with({ isFetchingNextPage: true }, () => ({
      kind: 'success-fetching-more' as const,
      data: input.items,
    }))
    .with({ isSuccess: true }, () => ({ kind: 'success' as const, data: input.items }))
    .otherwise(() => ({ kind: 'loading' as const }));
}

type ActiveSection = {
  readonly status: FetchStatus;
  readonly total: number;
};

// Collapse the active sections into a single status so the search shows one
// loader, one error, and one no-results — never a copy per section. A section
// that fails is dropped; its surviving sibling's results still show. The
// unified error only wins when every active section failed.
export function deriveSearchStatus(sections: readonly ActiveSection[]): SearchStatus {
  const active = sections.filter((section) => section.status.kind !== 'idle');
  if (active.length === 0) return { kind: 'idle' };
  if (active.some((section) => section.status.kind === 'loading')) return { kind: 'loading' };
  if (active.every((section) => section.status.kind === 'error')) return { kind: 'error' };

  const survivingTotal = active
    .filter((section) => section.status.kind !== 'error')
    .reduce((sum, section) => sum + section.total, 0);

  return survivingTotal === 0 ? { kind: 'empty' } : { kind: 'results' };
}
