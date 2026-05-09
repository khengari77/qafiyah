/** Builds a short plain-text snippet from verse halves for meta descriptions. */
export function flattenVerses(verses: [string, string][]): string {
  if (!verses?.length) return '';
  const OPTIMAL_LENGTH = 300;
  let result = '';
  const sep = ' * ';
  for (let i = 0; i < verses.length; i++) {
    const verse = verses[i];
    if (!verse) break;
    const nextLen = (verse[0]?.length || 0) + (verse[1]?.length || 0) + 2;
    if (result.length + nextLen > OPTIMAL_LENGTH) break;
    if (i > 0) result += sep;
    if (verse[0]) result += verse[0];
    result += sep;
    if (verse[1]) result += verse[1];
  }
  return result.length > OPTIMAL_LENGTH ? result.substring(0, OPTIMAL_LENGTH) : result;
}
