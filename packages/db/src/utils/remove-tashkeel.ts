import { TASHKEEL_REGEX } from '../constants';

/**
 * Removes Arabic diacritical marks (tashkeel) from text
 * @param text The text to process
 * @returns Text without tashkeel
 */
export function removeTashkeel(text: string): string {
  return text.replace(TASHKEEL_REGEX, '');
}
