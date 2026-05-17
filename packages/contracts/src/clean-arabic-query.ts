import { NON_ARABIC_AND_SPACE_REGEX } from '@qafiyah/constants';
import { WHITESPACE_RUN_REGEX } from './constants';

export function cleanArabicQuery(q: string): string {
  return q.trim().replace(NON_ARABIC_AND_SPACE_REGEX, '').replace(WHITESPACE_RUN_REGEX, ' ').trim();
}
