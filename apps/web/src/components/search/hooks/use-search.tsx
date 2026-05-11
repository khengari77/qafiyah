'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { parseAsStringEnum, useQueryState } from 'nuqs';
import type React from 'react';
import { useEffect, useState } from 'react';
import { search } from '@/lib/api/client';
import type { PoemsSearchResult, PoetsSearchResult, SearchPagination } from '@/lib/api/types';
import { useInfiniteScroll } from './use-infinite-scroll';

const EMPTY_PAGINATION: SearchPagination = {
  currentPage: 1,
  totalPages: 0,
  totalResults: 0,
  hasNextPage: false,
  hasPrevPage: false,
};

export type SearchType = 'poems' | 'poets';
export type MatchType = 'all' | 'any' | 'exact';

function validateInput(input: string): string | null {
  const arabicRegex = /^[؀-ۿ\s]+$/;

  if (!arabicRegex.test(input)) {
    return 'كلمات عربية فقط';
  }

  if (input.length > 50) {
    return 'يجب ألا يتجاوز النص 50 حرفًا';
  }

  const words = input
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  if (words.length < 1) {
    return 'يرجى إدخال كلمة واحدة على الأقل';
  }

  if ((words[0]?.length ?? 0) < 2) {
    return 'يجب أن تتكون الكلمة الأولى من حرفين على الأقل';
  }

  return null;
}

function parseIds(value: string | string[]): string[] {
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
    parseAsStringEnum<MatchType>(['all', 'any', 'exact']).withDefault('exact')
  );
  const [eraIds, setEraIds] = useQueryState('era_ids', { defaultValue: '' });
  const [meterIds, setMeterIds] = useQueryState('meter_ids', { defaultValue: '' });
  const [rhymeIds, setRhymeIds] = useQueryState('rhyme_ids', { defaultValue: '' });
  const [themeIds, setThemeIds] = useQueryState('theme_ids', { defaultValue: '' });

  const [inputValue, setInputValue] = useState(query);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);

  useEffect(() => {
    if (query) setInputValue(query);
  }, [query]);

  const selectedEras = parseIds(eraIds);
  const selectedRhymes = parseIds(rhymeIds);
  const selectedMeters = parseIds(meterIds);
  const selectedThemes = parseIds(themeIds);

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
      if (!query) return { results: [], pagination: EMPTY_PAGINATION };
      return search({
        q: query,
        searchType,
        page: String(pageParam),
        matchType,
        meterIds: meterIds && meterIds.length > 0 ? meterIds : undefined,
        eraIds: eraIds && eraIds.length > 0 ? eraIds : undefined,
        rhymeIds: rhymeIds && rhymeIds.length > 0 ? rhymeIds : undefined,
        themeIds: themeIds && themeIds.length > 0 ? themeIds : undefined,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const data =
    (iq.data?.pages.flatMap((page) =>
      (page.results || []).map((result) => ({
        type: searchType === 'poems' ? 'poem' : 'poet',
        ...result,
      }))
    ) as (PoemsSearchResult | PoetsSearchResult)[]) || [];

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
    setInputValue(e.target.value);
    if (hasSubmitted) {
      setValidationError(null);
    }
  };

  const handleSearchTypeChange = (value: string) => {
    const newSearchType = value as SearchType;

    if (newSearchType !== searchParams.search_type) {
      setInputValue('');
      if (newSearchType === 'poets') {
        setSearchType(newSearchType);
        setQuery('');
        setMeterIds('');
        setThemeIds('');
        setRhymeIds('');
      } else {
        setQuery('');
        setSearchType(newSearchType);
      }
    } else if (inputValue.trim()) {
      setSearchType(newSearchType);
    }

    setValidationError(null);
    setHasSubmitted(false);
  };

  const handleMatchTypeChange = (value: string) => {
    const validMatchTypes = ['all', 'any', 'exact'] as const;
    if (typeof value === 'string' && validMatchTypes.includes(value as never)) {
      setMatchType(value as MatchType);
    }
  };

  const handleSearch = () => {
    if (inputValue.trim()) {
      setHasSubmitted(true);

      const error = validateInput(inputValue);
      if (error) {
        setValidationError(error);
        return;
      }

      setValidationError(null);
      if (filtersVisible) {
        setFiltersVisible(false);
      }
      setQuery(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const error = validateInput(inputValue);
      if (error) {
        e.preventDefault();
        setHasSubmitted(true);
        setValidationError(error);
        return;
      }
      handleSearch();
    }
  };

  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };

  const resetAllStates = () => {
    setSearchType('poems');
    setMatchType('exact');
    setQuery('');
    setEraIds('');
    setMeterIds('');
    setRhymeIds('');
    setThemeIds('');
    setInputValue('');
    setValidationError(null);
    setHasSubmitted(false);
  };

  const hasQuery =
    !iq.isLoading &&
    (Boolean(inputValue.trim()) ||
      selectedEras.length > 0 ||
      selectedRhymes.length > 0 ||
      selectedMeters.length > 0 ||
      selectedThemes.length > 0);

  return {
    isLoading: iq.isLoading,
    isError: iq.isError,
    isSuccess: iq.isSuccess,
    isFetchingNextPage: iq.isFetchingNextPage,
    hasSubmitted,
    filtersVisible,
    hasQuery,

    loadMoreRef,

    data,
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
    handleSearch,
    handleSearchTypeChange,

    handleRhymesChange,
    handleErasChange,
    handleMetersChange,
    handleThemesChange,
  };
}
