import { NON_ARABIC_AND_SPACE_REGEX } from '@qafiyah/constants';

/**
 * Cleans and sanitizes the input query, allowing only Arabic letters and spaces.
 * Removes any non-Arabic characters and reduces multiple spaces to a single space.
 *
 * @param q - The query string to sanitize
 * @returns The sanitized query string
 */
export function cleanArabicQuery(q: string): string {
  return q.trim().replace(NON_ARABIC_AND_SPACE_REGEX, '').replace(/\s+/g, ' ').trim();
}
