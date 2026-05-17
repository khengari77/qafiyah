import { NON_ARABIC_AND_SPACE_REGEX } from '@qafiyah/constants';

const WHITESPACE_RUN_REGEX = /\s+/g;

/**
 * Cleans and sanitizes the input query, allowing only Arabic letters and spaces.
 * Removes any non-Arabic characters and collapses multiple spaces to a single space.
 */
export function cleanArabicQuery(q: string): string {
  return q.trim().replace(NON_ARABIC_AND_SPACE_REGEX, '').replace(WHITESPACE_RUN_REGEX, ' ').trim();
}
