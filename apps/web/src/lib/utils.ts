import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DOUBLE_QUOTE_REGEX } from '@/constants';

export function cn(...inputs: readonly ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stripQuotes(text: string): string {
  return text.replace(DOUBLE_QUOTE_REGEX, '');
}
