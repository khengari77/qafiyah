import { DOUBLE_QUOTE_REGEX } from '@qafiyah/constants';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: readonly ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripQuotes(text: string): string {
  return text.replace(DOUBLE_QUOTE_REGEX, '');
}
