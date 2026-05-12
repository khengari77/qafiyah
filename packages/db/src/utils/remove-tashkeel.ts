/**
 * Removes Arabic diacritical marks (tashkeel) from text
 * @param text The text to process
 * @returns Text without tashkeel
 */
export function removeTashkeel(text: string): string {
  const tashkeelRegex = /[ؐ-ًؚ-ٟۖ-ۭ]/g;
  return text.replace(tashkeelRegex, '');
}
