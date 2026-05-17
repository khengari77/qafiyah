import { NOT_FOUND_MESSAGE_AR } from '@/constants/ui';
import { toArabicDigits } from '@/lib/arabic';

export const NOT_FOUND_CODE = toArabicDigits(404);
export const NOT_FOUND_TITLE = `${NOT_FOUND_CODE} | ${NOT_FOUND_MESSAGE_AR}`;
