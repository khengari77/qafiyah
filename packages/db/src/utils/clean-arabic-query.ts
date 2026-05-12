/**
 * Cleans and sanitizes the input query, allowing only Arabic letters and spaces.
 * Removes any non-Arabic characters and reduces multiple spaces to a single space.
 *
 * @param q - The query string to sanitize
 * @returns The sanitized query string
 */
export function cleanArabicQuery(q: string): string {
  return q
    .trim()
    .replace(/[^؀-ۿݐ-ݿࢠ-ࣿء-ي\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
