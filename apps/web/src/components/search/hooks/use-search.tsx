'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useInfiniteQuery } from './use-infinite-query';
import { useInfiniteScroll } from './use-infinite-scroll';

function validateInput(input: string): string | null {
  const arabicRegex = /^[\u0600-\u06FF\s]+$/;

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

  if (words[0].length < 2) {
    return 'يجب أن تتكون الكلمة الأولى من حرفين على الأقل';
  }

  return null;
}

export function useSearch() {
  const {
    isError,
    isLoading,
    isFetchingNextPage,
    isSuccess,
    hasNextPage,
    searchParams,
    searchType,
    matchType,
    data,
    fetchNextPage,
    setQuery,
    setSearchType,
    setMatchType,
    setEraIds,
    setRhymeIds,
    setMeterIds,
    setThemeIds,
    resetAllParamStates,
  } = useInfiniteQuery({
    initialMatchType: 'exact',
    initialSearchType: 'poems',
    queryKey: 'search',
  });

  const { loadMoreRef } = useInfiniteScroll(fetchNextPage, hasNextPage, isFetchingNextPage);

  // Input state (inlined from useSearchInput)
  const [inputValue, setInputValue] = useState(searchParams.q);

  useEffect(() => {
    if (searchParams.q) {
      setInputValue(searchParams.q);
    }
  }, [searchParams.q]);

  // Validation state (inlined from useInputValidation)
  const [validationError, setValidationError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Filters state (inlined from useSearchFilters)
  const [filtersVisible, setFiltersVisible] = useState(false);

  const selectedEras = Array.isArray(searchParams.era_ids)
    ? searchParams.era_ids.filter((v) => typeof v === 'string' && v.trim() !== '')
    : typeof searchParams.era_ids === 'string'
      ? searchParams.era_ids
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const selectedRhymes = Array.isArray(searchParams.rhyme_ids)
    ? searchParams.rhyme_ids.filter((v) => typeof v === 'string' && v.trim() !== '')
    : typeof searchParams.rhyme_ids === 'string'
      ? searchParams.rhyme_ids
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const selectedMeters = Array.isArray(searchParams.meter_ids)
    ? searchParams.meter_ids.filter((v) => typeof v === 'string' && v.trim() !== '')
    : typeof searchParams.meter_ids === 'string'
      ? searchParams.meter_ids
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const selectedThemes = Array.isArray(searchParams.theme_ids)
    ? searchParams.theme_ids.filter((v) => typeof v === 'string' && v.trim() !== '')
    : typeof searchParams.theme_ids === 'string'
      ? searchParams.theme_ids
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (hasSubmitted) {
      setValidationError(null);
    }
  };

  const handleSearchTypeChange = (value: string) => {
    const newSearchType = value as 'poems' | 'poets';

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
      setMatchType(value as (typeof validMatchTypes)[number]);
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

  const handleErasChange = (value: string | string[]) => {
    setEraIds(
      Array.isArray(value)
        ? value
            .filter(Boolean)
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .join(',')
        : typeof value === 'string'
          ? value.trim()
          : ''
    );
  };

  const handleRhymesChange = (value: string | string[]) => {
    setRhymeIds(
      Array.isArray(value)
        ? value
            .filter(Boolean)
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .join(',')
        : typeof value === 'string'
          ? value.trim()
          : ''
    );
  };

  const handleMetersChange = (value: string | string[]) => {
    setMeterIds(
      Array.isArray(value)
        ? value
            .filter(Boolean)
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .join(',')
        : typeof value === 'string'
          ? value.trim()
          : ''
    );
  };

  const handleThemesChange = (value: string | string[]) => {
    setThemeIds(
      Array.isArray(value)
        ? value
            .filter(Boolean)
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .join(',')
        : typeof value === 'string'
          ? value.trim()
          : ''
    );
  };

  const toggleFilters = () => {
    setFiltersVisible(!filtersVisible);
  };

  const resetAllStates = () => {
    resetAllParamStates();
    setInputValue('');
    setValidationError(null);
    setHasSubmitted(false);
  };

  const hasQuery =
    !isLoading &&
    (Boolean(inputValue.trim()) ||
      selectedEras.length > 0 ||
      selectedRhymes.length > 0 ||
      selectedMeters.length > 0 ||
      selectedThemes.length > 0);

  return {
    isLoading,
    isError,
    isSuccess,
    isFetchingNextPage,
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
