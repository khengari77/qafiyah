import { ARABIC_DIGITS_MAP } from '@qafiyah/constants';

export function toArabicDigits(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_DIGITS_MAP[d] ?? d);
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
