import { HTTP_NOT_FOUND } from '@qafiyah/constants';
import { NOT_FOUND_MESSAGE_AR } from '@/constants/ui';
import { toArabicDigits } from '@/lib/arabic';

export const NOT_FOUND_CODE = toArabicDigits(HTTP_NOT_FOUND);
export const NOT_FOUND_TITLE = `${NOT_FOUND_CODE} | ${NOT_FOUND_MESSAGE_AR}`;
