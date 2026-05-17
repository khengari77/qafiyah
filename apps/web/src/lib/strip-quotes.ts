import { DOUBLE_QUOTE_REGEX } from '@/constants';

export function stripQuotes(text: string): string {
  return text.replace(DOUBLE_QUOTE_REGEX, '');
}
