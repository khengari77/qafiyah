export const MAX_QUERY_LENGTH = 50;
export const SEARCH_RESULTS_STALE_TIME_MS = 5 * 60 * 1000;
export const INFINITE_SCROLL_THRESHOLD = 0.1;
export const QUERY_DISPLAY_TRUNCATE_LENGTH = 20;
export const RESULT_TEXT_TRUNCATE_LENGTH = 10;
export const VERSE_DESCRIPTION_OPTIMAL_LENGTH = 300;
export const VERSE_SEPARATOR_DISPLAY = ' * ';
export const VERSE_SEPARATOR_RAW = '*';

export const SEARCH_TYPE_VALUES = ['poems', 'poets'] as const;
export const MATCH_TYPE_VALUES = ['all', 'any', 'exact'] as const;
