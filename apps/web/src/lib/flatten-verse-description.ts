/** Builds a short plain-text snippet from verse halves for meta descriptions. */
export function flattenVerses(verses: [string, string][]): string {
  if (!verses?.length) return '';
  const OPTIMAL_LENGTH = 300;
  let result = '';
  const sep = ' * ';
  for (let i = 0; i < verses.length; i++) {
    const nextLen = (verses[i][0]?.length || 0) + (verses[i][1]?.length || 0) + 2;
    if (result.length + nextLen > OPTIMAL_LENGTH) break;
    if (i > 0) result += sep;
    if (verses[i][0]) result += verses[i][0];
    result += sep;
    if (verses[i][1]) result += verses[i][1];
  }
  return result.length > OPTIMAL_LENGTH ? result.substring(0, OPTIMAL_LENGTH) : result;
}
