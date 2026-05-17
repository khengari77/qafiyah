import { HTTP_NOT_FOUND, NOT_FOUND_MESSAGE_AR } from '@qafiyah/constants';
import { toArabicDigits } from '@/lib/arabic';

export const NOT_FOUND_CODE = toArabicDigits(HTTP_NOT_FOUND);
export const NOT_FOUND_TITLE = `${NOT_FOUND_CODE} | ${NOT_FOUND_MESSAGE_AR}`;
