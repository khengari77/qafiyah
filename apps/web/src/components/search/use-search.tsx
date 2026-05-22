'use client';

import {
  MATCH_TYPE_VALUES,
  MAX_QUERY_LENGTH,
  type MatchType,
  SEARCH_TYPE_VALUES,
  type SearchType,
  WHITESPACE_RUN_REGEX,
} from '@qafiyah/constants';
import { sanitizeArabicInput } from '@qafiyah/contracts';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import { INFINITE_SCROLL_THRESHOLD, SEARCH_RESULTS_STALE_TIME_MS, SEARCH_TEXTS } from '@/constants';
import { orpc } from '@/lib/api/orpc';
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

const SEARCH_TYPE_SET: ReadonlySet<SearchType> = new Set(SEARCH_TYPE_VALUES);
const MATCH_TYPE_SET: ReadonlySet<MatchType> = new Set(MATCH_TYPE_VALUES);

function isMatchType(value: string): value is MatchType {
  return MATCH_TYPE_SET.has(value as MatchType);
}

function isValidSearchType(value: string): value is SearchType {
  return SEARCH_TYPE_SET.has(value as SearchType);
}

function validateText(input: string): string | null {
  if (input.length > MAX_QUERY_LENGTH) {
    return SEARCH_TEXTS.maxLengthErrorTemplate.replace('{n}', String(MAX_QUERY_LENGTH));
  }
  return null;
}

function splitCsvIds(value: string | readonly string[]): readonly string[] {
  if (Array.isArray(value)) return value.filter((entry) => entry.trim() !== '');
  return (value as string)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseTypes(raw: string): SearchType[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = parts.filter(isValidSearchType);
  return valid.length > 0 ? valid : [...SEARCH_TYPE_VALUES];
}

function createCsvFilterSetter(setter: (value: string | null) => void) {
  return (value: string | string[]) => {
    const joined = Array.isArray(value)
      ? value
          .map((entry) => entry.trim())
          .filter(Boolean)
          .join(',')
      : value.trim();
    setter(joined || null);
  };
}

function useInfiniteScroll(
  fetchNextPage: () => void,
  hasNextPage: boolean | undefined,
  isFetchingNextPage: boolean
) {
  const observer = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loadMoreRef.current) {
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: INFINITE_SCROLL_THRESHOLD }
      );

      observer.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return { loadMoreRef };
}

export type SectionViewModel = {
  readonly items: readonly (PoemSearchResult | PoetSearchResult)[];
  readonly total: number;
  readonly status: FetchStatus;
  readonly loadMoreRef: React.RefObject<HTMLDivElement | null>;
};

export function useSearch() {
  const [query, setQuery] = useQueryState('q', { defaultValue: '' });
  const [typesRaw, setTypesRaw] = useQueryState('types', { defaultValue: 'poems,poets' });
  const [matchTypeRaw, setMatchTypeRaw] = useQueryState('match_type', { defaultValue: 'all' });
  const [eraIds, setEraIds] = useQueryState('era_ids', { defaultValue: '' });
  const [meterIds, setMeterIds] = useQueryState('meter_ids', { defaultValue: '' });
  const [rhymeIds, setRhymeIds] = useQueryState('rhyme_ids', { defaultValue: '' });
  const [themeIds, setThemeIds] = useQueryState('theme_ids', { defaultValue: '' });

  const [inputValue, setInputValue] = useState(query);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);

  useEffect(() => {
    if (query) setInputValue(query);
  }, [query]);

  const selectedTypes = parseTypes(typesRaw);
  const matchType: MatchType = isMatchType(matchTypeRaw) ? matchTypeRaw : 'all';

  const wantPoems = selectedTypes.includes('poems');
  const wantPoets = selectedTypes.includes('poets');

  const selectedEras = splitCsvIds(eraIds);
  const selectedRhymes = splitCsvIds(rhymeIds);
  const selectedMeters = splitCsvIds(meterIds);
  const selectedThemes = splitCsvIds(themeIds);

  const hasFilters =
    selectedEras.length > 0 ||
    selectedRhymes.length > 0 ||
    selectedMeters.length > 0 ||
    selectedThemes.length > 0;
  const hasCommittedQuery = query.trim().length > 0;
  const hasInputText = inputValue.trim().length > 0;
  const canSearch = hasCommittedQuery || hasFilters;

  // — poems section query —
  const poemsInfiniteQuery = useInfiniteQuery(
    orpc.search.search.infiniteOptions({
      input: (pageParam: number) => ({
        q: query,
        types: ['poems'] as SearchType[],
        matchType,
        poemsPage: String(pageParam),
        poetsPage: '1',
        eraSlugs: [...splitCsvIds(eraIds)],
        meterSlugs: [...splitCsvIds(meterIds)],
        rhymeSlugs: [...splitCsvIds(rhymeIds)],
        themeSlugs: [...splitCsvIds(themeIds)],
        poetSlugs: [],
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const p = lastPage.poems?.pagination;
        return p && p.page < p.totalPages ? p.page + 1 : undefined;
      },
      enabled: canSearch && wantPoems,
      staleTime: SEARCH_RESULTS_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    })
  );

  // — poets section query —
  const poetsInfiniteQuery = useInfiniteQuery(
    orpc.search.search.infiniteOptions({
      input: (pageParam: number) => ({
        q: query,
        types: ['poets'] as SearchType[],
        matchType,
        poetsPage: String(pageParam),
        poemsPage: '1',
        eraSlugs: [...splitCsvIds(eraIds)],
        meterSlugs: [],
        rhymeSlugs: [],
        themeSlugs: [],
        poetSlugs: [],
      }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const p = lastPage.poets?.pagination;
        return p && p.page < p.totalPages ? p.page + 1 : undefined;
      },
      enabled: canSearch && wantPoets,
      staleTime: SEARCH_RESULTS_STALE_TIME_MS,
      refetchOnWindowFocus: false,
    })
  );

  // — flatten sections —
  const poemItems: readonly PoemSearchResult[] =
    poemsInfiniteQuery.data?.pages.flatMap((p) => p.poems?.data ?? []) ?? [];
  const poemsTotal = poemsInfiniteQuery.data?.pages[0]?.poems?.pagination.totalItems ?? 0;

  const poetItems: readonly PoetSearchResult[] =
    poetsInfiniteQuery.data?.pages.flatMap((p) => p.poets?.data ?? []) ?? [];
  const poetsTotal = poetsInfiniteQuery.data?.pages[0]?.poets?.pagination.totalItems ?? 0;

  // — per-section FetchStatus —
  function buildStatus(
    q: typeof poemsInfiniteQuery,
    items: readonly (PoemSearchResult | PoetSearchResult)[],
    enabled: boolean
  ): FetchStatus {
    return match({
      canSearch: canSearch && enabled,
      isError: q.isError,
      isFetchingNextPage: q.isFetchingNextPage,
      isSuccess: q.isSuccess,
    })
      .with({ canSearch: false }, () => ({ kind: 'idle' as const }))
      .with({ isError: true }, () => ({ kind: 'error' as const }))
      .with({ isFetchingNextPage: true }, () => ({
        kind: 'success-fetching-more' as const,
        data: items,
      }))
      .with({ isSuccess: true }, () => ({ kind: 'success' as const, data: items }))
      .otherwise(() => ({ kind: 'loading' as const }));
  }

  const poemsStatus = buildStatus(poemsInfiniteQuery, poemItems, wantPoems);
  const poetsStatus = buildStatus(poetsInfiniteQuery, poetItems, wantPoets);

  // — per-section infinite scroll —
  const { loadMoreRef: poemsLoadMoreRef } = useInfiniteScroll(
    poemsInfiniteQuery.fetchNextPage,
    poemsInfiniteQuery.hasNextPage,
    poemsInfiniteQuery.isFetchingNextPage
  );

  const { loadMoreRef: poetsLoadMoreRef } = useInfiniteScroll(
    poetsInfiniteQuery.fetchNextPage,
    poetsInfiniteQuery.hasNextPage,
    poetsInfiniteQuery.isFetchingNextPage
  );

  // — filter setters —
  const handleErasChange = createCsvFilterSetter(setEraIds);
  const handleMetersChange = createCsvFilterSetter(setMeterIds);
  const handleRhymesChange = createCsvFilterSetter(setRhymeIds);
  const handleThemesChange = createCsvFilterSetter(setThemeIds);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const sanitized = sanitizeArabicInput(raw);
    setInputValue(sanitized);
    if (raw.replace(WHITESPACE_RUN_REGEX, ' ') !== sanitized) {
      setValidationError(SEARCH_TEXTS.arabicOnlyError);
      return;
    }
    setValidationError(validateText(sanitized));
  };

  const handleTypesChange = (next: string[]) => {
    const valid = next.filter(isValidSearchType);
    const nextPoems = valid.includes('poems');
    if (!nextPoems) {
      setMeterIds('');
      setThemeIds('');
      setRhymeIds('');
    }
    setTypesRaw(valid.length > 0 ? valid.join(',') : SEARCH_TYPE_VALUES.join(','));
    setValidationError(null);
  };

  const handleMatchTypeChange = (value: string) => {
    if (isMatchType(value)) {
      setMatchTypeRaw(value);
    }
  };

  const handleSearch = () => {
    const trimmed = inputValue.trim();
    const error = validateText(trimmed);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    if (filtersVisible) setFiltersVisible(false);
    setQuery(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  };

  const handleToggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };

  const handleReset = () => {
    setTypesRaw(SEARCH_TYPE_VALUES.join(','));
    setMatchTypeRaw('all');
    setQuery('');
    setEraIds('');
    setMeterIds('');
    setRhymeIds('');
    setThemeIds('');
    setInputValue('');
    setValidationError(null);
  };

  const hasQueryToShow =
    poemsStatus.kind !== 'loading' &&
    poetsStatus.kind !== 'loading' &&
    (hasInputText || hasFilters);

  const poems: SectionViewModel = {
    items: poemItems,
    total: poemsTotal,
    status: poemsStatus,
    loadMoreRef: poemsLoadMoreRef,
  };

  const poets: SectionViewModel = {
    items: poetItems,
    total: poetsTotal,
    status: poetsStatus,
    loadMoreRef: poetsLoadMoreRef,
  };

  return {
    input: {
      inputValue,
      validationError,
      query,
      matchType,
      selectedTypes,
    },
    sections: {
      poems,
      poets,
    },
    flags: {
      filtersVisible,
      hasQueryToShow,
      hasCommittedQuery,
      hasInputText,
      hasFilters,
      wantPoems,
      wantPoets,
    },
    selection: {
      eras: selectedEras,
      meters: selectedMeters,
      themes: selectedThemes,
      rhymes: selectedRhymes,
    },
    handlers: {
      onInputChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onSearch: handleSearch,
      onTypesChange: handleTypesChange,
      onMatchTypeChange: handleMatchTypeChange,
      onErasChange: handleErasChange,
      onMetersChange: handleMetersChange,
      onThemesChange: handleThemesChange,
      onRhymesChange: handleRhymesChange,
      onToggleFilters: handleToggleFilters,
      onReset: handleReset,
    },
  };
}
