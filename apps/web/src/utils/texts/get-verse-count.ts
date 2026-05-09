import { toArabicDigits } from '@/utils/texts/arabic-digits';

/**
 * Format verse count in Arabic with proper pluralization
 */
export function formatVerseCount(count: number): string {
  const arabic = toArabicDigits(count);
  if (count === 1) {
    return 'بيت';
  }
  if (count === 2) {
    return 'بيتان';
  }
  if (count >= 3 && count <= 10) {
    return `${arabic} أبيات`;
  }
  return `${arabic} بيت`;
}
