'use client';

import { parseAsStringEnum, useQueryState } from 'nuqs';

export type SearchType = 'poems' | 'poets';
export type MatchType = 'all' | 'any' | 'exact';

export function useSearchQuery() {
  return useQueryState('q', {
    defaultValue: '',
  });
}

export function useSearchType(defaultValue: SearchType = 'poems') {
  return useQueryState(
    'search_type',
    parseAsStringEnum<SearchType>(['poems', 'poets']).withDefault(defaultValue)
  );
}

export function useMatchType(defaultValue: MatchType = 'exact') {
  const [matchType, setMatchType] = useQueryState(
    'match_type',
    parseAsStringEnum<MatchType>(['all', 'any', 'exact']).withDefault(defaultValue)
  );
  
  // Ensure default is always 'exact' when value is null/undefined
  // withDefault should handle this, but we add a fallback to be safe
  return [matchType ?? defaultValue, setMatchType] as const;
}

export function useRhymeIds() {
  return useQueryState('rhyme_ids', {
    defaultValue: '',
  });
}

export function useEraIds() {
  return useQueryState('era_ids', {
    defaultValue: '',
  });
}

export function useMeterIds() {
  return useQueryState('meter_ids', {
    defaultValue: '',
  });
}

export function useThemeIds() {
  return useQueryState('theme_ids', {
    defaultValue: '',
  });
}
