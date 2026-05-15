import {
  DEV_WEB_URL,
  HTTP_NOT_FOUND,
  NOT_FOUND_MESSAGE_AR,
  PROD_API_URL,
  PROD_DOMAIN,
} from '@qafiyah/constants';
import { env } from '@/env';
import { toArabicDigits } from '@/lib/arabic';

export const isDev = env.DEV;
export const API_URL = env.PUBLIC_API_URL ?? PROD_API_URL;
export const SITE_URL = isDev ? DEV_WEB_URL : `https://${PROD_DOMAIN}`;
export const NOT_FOUND_CODE = toArabicDigits(HTTP_NOT_FOUND);
export const NOT_FOUND_TITLE = `${NOT_FOUND_CODE} | ${NOT_FOUND_MESSAGE_AR}`;
