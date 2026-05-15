import { VERSE_DESCRIPTION_OPTIMAL_LENGTH, VERSE_SEPARATOR_DISPLAY } from '@qafiyah/constants';

/** Builds a short plain-text snippet from verse halves for meta descriptions. */
export function flattenVerses(verses: [string, string][]): string {
  if (!verses || verses.length === 0) return '';
  let result = '';
  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i];
    if (!verse) break;
    const nextLen = (verse[0]?.length || 0) + (verse[1]?.length || 0) + 2;
    if (result.length + nextLen > VERSE_DESCRIPTION_OPTIMAL_LENGTH) break;
    if (i > 0) result += VERSE_SEPARATOR_DISPLAY;
    if (verse[0]) result += verse[0];
    result += VERSE_SEPARATOR_DISPLAY;
    if (verse[1]) result += verse[1];
  }
  return result.length > VERSE_DESCRIPTION_OPTIMAL_LENGTH
    ? result.slice(0, VERSE_DESCRIPTION_OPTIMAL_LENGTH)
    : result;
}
