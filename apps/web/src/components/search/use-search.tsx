'use client';

import {
  MATCH_TYPE_VALUES,
  MAX_QUERY_LENGTH,
  type MatchType,
  NON_ARABIC_AND_SPACE_REGEX,
  SEARCH_TYPE_VALUES,
  type SearchType,
  WHITESPACE_RUN_REGEX,
} from '@qafiyah/constants';
import { useInfiniteQuery } from '@tanstack/react-query';
import { parseAsStringEnum, useQueryState } from 'nuqs';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { INFINITE_SCROLL_THRESHOLD, SEARCH_RESULTS_STALE_TIME_MS, SEARCH_TEXTS } from '@/constants';
import { search } from '@/lib/api/client';
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

function isSearchType(value: string): value is SearchType {
  return SEARCH_TYPE_SET.has(value as SearchType);
}

function isMatchType(value: string): value is MatchType {
  return MATCH_TYPE_SET.has(value as MatchType);
}

// Like cleanArabicQuery but without the trim, so users can still type intermediate spaces.
function sanitizeArabicInput(raw: string): string {
  return raw.replace(NON_ARABIC_AND_SPACE_REGEX, '').replace(WHITESPACE_RUN_REGEX, ' ');
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

export function useSearch() {
  const [query, setQuery] = useQueryState('q', { defaultValue: '' });
  const [searchType, setSearchType] = useQueryState(
    'search_type',
    parseAsStringEnum<SearchType>([...SEARCH_TYPE_VALUES]).withDefault('poems')
  );
  const [matchType, setMatchType] = useQueryState(
    'match_type',
    parseAsStringEnum<MatchType>([...MATCH_TYPE_VALUES]).withDefault('all')
  );
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

  const searchParams = {
    q: query,
    search_type: searchType,
    match_type: matchType,
    meter_ids: meterIds,
    era_ids: eraIds,
    rhyme_ids: rhymeIds,
    theme_ids: themeIds,
  };

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['search', query, searchType, matchType, eraIds, meterIds, rhymeIds, themeIds],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await search({
        q: query,
        searchType,
        page: String(pageParam),
        matchType,
        meterSlugs: [...splitCsvIds(meterIds)],
        eraSlugs: [...splitCsvIds(eraIds)],
        rhymeSlugs: [...splitCsvIds(rhymeIds)],
        themeSlugs: [...splitCsvIds(themeIds)],
      });
      if (result.isErr()) throw result.error;
      return result.value;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: canSearch,
    staleTime: SEARCH_RESULTS_STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });

  const data: readonly (PoemSearchResult | PoetSearchResult)[] =
    infiniteQuery.data?.pages.flatMap(
      (page) => page.data as (PoemSearchResult | PoetSearchResult)[]
    ) ?? [];

  const totalResults = infiniteQuery.data?.pages[0]?.pagination.totalItems ?? 0;

  const status: FetchStatus = (() => {
    if (!canSearch) return { kind: 'idle' };
    if (infiniteQuery.isError) return { kind: 'error' };
    if (infiniteQuery.isLoading) return { kind: 'loading' };
    if (infiniteQuery.isFetchingNextPage) return { kind: 'success-fetching-more', data };
    if (infiniteQuery.isSuccess) return { kind: 'success', data };
    return { kind: 'loading' };
  })();

  const { loadMoreRef } = useInfiniteScroll(
    infiniteQuery.fetchNextPage,
    infiniteQuery.hasNextPage,
    infiniteQuery.isFetchingNextPage
  );

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

  const handleSearchTypeChange = (value: string) => {
    if (!isSearchType(value)) return;

    if (value === searchType) return;

    setSearchType(value);
    if (value === 'poets') {
      setMeterIds('');
      setThemeIds('');
      setRhymeIds('');
    }
    setValidationError(null);
  };

  const handleMatchTypeChange = (value: string) => {
    if (isMatchType(value)) {
      setMatchType(value);
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
    setSearchType('poems');
    setMatchType('all');
    setQuery('');
    setEraIds('');
    setMeterIds('');
    setRhymeIds('');
    setThemeIds('');
    setInputValue('');
    setValidationError(null);
  };

  const hasQueryToShow = status.kind !== 'loading' && (hasInputText || hasFilters);

  return {
    state: {
      status,
      totalResults,
      validationError,
      inputValue,
      searchParams,
      searchType,
      matchType,
    },
    flags: {
      filtersVisible,
      hasQueryToShow,
      hasCommittedQuery,
      hasInputText,
      hasFilters,
    },
    selection: {
      meters: selectedMeters,
      themes: selectedThemes,
      eras: selectedEras,
      rhymes: selectedRhymes,
    },
    handlers: {
      onMatchTypeChange: handleMatchTypeChange,
      onInputChange: handleInputChange,
      onKeyDown: handleKeyDown,
      onSearch: handleSearch,
      onSearchTypeChange: handleSearchTypeChange,
      onRhymesChange: handleRhymesChange,
      onErasChange: handleErasChange,
      onMetersChange: handleMetersChange,
      onThemesChange: handleThemesChange,
      onToggleFilters: handleToggleFilters,
      onReset: handleReset,
    },
    refs: {
      loadMore: loadMoreRef,
    },
  };
}
