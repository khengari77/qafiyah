import { ARABIC_DIGITS_MAP } from '@qafiyah/constants';

const DIGIT_LOOKUP: Readonly<Record<string, string>> = ARABIC_DIGITS_MAP;

export function toArabicDigits(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => DIGIT_LOOKUP[d] ?? d);
}

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
