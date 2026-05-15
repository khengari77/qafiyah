'use client';

import {
  type MATCH_TYPE_VALUES,
  MAX_QUERY_LENGTH,
  NON_ARABIC_AND_SPACE_REGEX,
  SEARCH_RESULTS_STALE_TIME_MS,
  SEARCH_TEXTS,
  type SEARCH_TYPE_VALUES,
} from '@qafiyah/constants';
import { useInfiniteQuery } from '@tanstack/react-query';
import { parseAsStringEnum, useQueryState } from 'nuqs';
import type React from 'react';
import { useEffect, useState } from 'react';
import { search } from '@/lib/api/client';
import type { PoemSearchResult, PoetSearchResult } from '@/lib/api/types';
import { useInfiniteScroll } from './use-infinite-scroll';

type SearchType = (typeof SEARCH_TYPE_VALUES)[number];
type MatchType = (typeof MATCH_TYPE_VALUES)[number];

function sanitizeArabicInput(raw: string): string {
  return raw.replace(NON_ARABIC_AND_SPACE_REGEX, '').replace(/\s+/g, ' ');
}

function validateText(input: string): string | null {
  if (input.length > MAX_QUERY_LENGTH) {
    return SEARCH_TEXTS.maxLengthErrorTemplate.replace('{n}', String(MAX_QUERY_LENGTH));
  }
  return null;
}

function splitCsvIds(value: string | string[]): string[] {
  if (Array.isArray(value)) return value.filter((v) => v.trim() !== '');
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function makeFilterSetter(setter: (v: string | null) => void) {
  return (value: string | string[]) => {
    const joined = Array.isArray(value)
      ? value
          .map((v) => v.trim())
          .filter(Boolean)
          .join(',')
      : value.trim();
    setter(joined || null);
  };
}

export function useSearch() {
  const [query, setQuery] = useQueryState('q', { defaultValue: '' });
  const [searchType, setSearchType] = useQueryState(
    'search_type',
    parseAsStringEnum<SearchType>(['poems', 'poets']).withDefault('poems')
  );
  const [matchType, setMatchType] = useQueryState(
    'match_type',
    parseAsStringEnum<MatchType>(['all', 'any', 'exact']).withDefault('all')
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
  const hasText = query.trim().length > 0;
  const hasInputText = inputValue.trim().length > 0;
  const canSearch = hasText || hasFilters;

  const searchParams = {
    q: query,
    search_type: searchType,
    match_type: matchType,
    meter_ids: meterIds,
    era_ids: eraIds,
    rhyme_ids: rhymeIds,
    theme_ids: themeIds,
  };

  const iq = useInfiniteQuery({
    queryKey: ['search', query, searchType, matchType, eraIds, meterIds, rhymeIds, themeIds],
    queryFn: async ({ pageParam = 1 }) => {
      return search({
        q: query,
        searchType,
        page: String(pageParam),
        matchType,
        meterSlugs: splitCsvIds(meterIds),
        eraSlugs: splitCsvIds(eraIds),
        rhymeSlugs: splitCsvIds(rhymeIds),
        themeSlugs: splitCsvIds(themeIds),
      });
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

  const data: (PoemSearchResult | PoetSearchResult)[] =
    iq.data?.pages.flatMap((page) => page.data as (PoemSearchResult | PoetSearchResult)[]) ?? [];

  const totalResults = iq.data?.pages[0]?.pagination.totalItems ?? 0;

  const { loadMoreRef } = useInfiniteScroll(
    iq.fetchNextPage,
    iq.hasNextPage,
    iq.isFetchingNextPage
  );

  const handleErasChange = makeFilterSetter(setEraIds);
  const handleMetersChange = makeFilterSetter(setMeterIds);
  const handleRhymesChange = makeFilterSetter(setRhymeIds);
  const handleThemesChange = makeFilterSetter(setThemeIds);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = sanitizeArabicInput(raw);
    setInputValue(sanitized);
    if (raw.replace(/\s+/g, ' ') !== sanitized) {
      setValidationError(SEARCH_TEXTS.arabicOnlyError);
      return;
    }
    setValidationError(validateText(sanitized));
  };

  const handleSearchTypeChange = (value: string) => {
    const newSearchType = value as SearchType;

    if (newSearchType === searchType) return;

    setSearchType(newSearchType);
    if (newSearchType === 'poets') {
      setMeterIds('');
      setThemeIds('');
      setRhymeIds('');
    }
    setValidationError(null);
  };

  const handleMatchTypeChange = (value: string) => {
    const validMatchTypes = ['all', 'any', 'exact'] as const;
    if (typeof value === 'string' && validMatchTypes.includes(value as never)) {
      setMatchType(value as MatchType);
    }
  };

  const commitTextQuery = () => {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTextQuery();
    }
  };

  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };

  const resetAllStates = () => {
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

  const hasQuery = !iq.isLoading && (Boolean(inputValue.trim()) || hasFilters);

  return {
    isLoading: iq.isLoading,
    isError: iq.isError,
    isSuccess: iq.isSuccess,
    isFetchingNextPage: iq.isFetchingNextPage,
    filtersVisible,
    hasQuery,
    hasText,
    hasInputText,
    hasFilters,

    loadMoreRef,

    data,
    totalResults,
    validationError,
    inputValue,
    searchParams,
    searchType,
    matchType,
    selectedMeters,
    selectedThemes,
    selectedEras,
    selectedRhymes,

    toggleFilters,
    resetAllStates,

    handleMatchTypeChange,
    handleInputChange,
    handleKeyDown,
    handleSearch: commitTextQuery,
    handleSearchTypeChange,

    handleRhymesChange,
    handleErasChange,
    handleMetersChange,
    handleThemesChange,
  };
}
