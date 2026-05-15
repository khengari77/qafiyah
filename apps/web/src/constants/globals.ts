import {
  DEV_WEB_URL,
  NOT_FOUND_HTTP_CODE,
  NOT_FOUND_MESSAGE_AR,
  PROD_API_URL,
  PROD_DOMAIN,
  SITE_NAME_AR,
} from '@qafiyah/constants';
import { toArabicDigits } from '@/lib/arabic';

export const isDev = import.meta.env.DEV;
export const SITE_NAME = SITE_NAME_AR;
export const API_URL = import.meta.env['PUBLIC_API_URL'] || PROD_API_URL;
export const SITE_URL = isDev ? DEV_WEB_URL : `https://${PROD_DOMAIN}`;
export const NOT_FOUND_CODE = toArabicDigits(NOT_FOUND_HTTP_CODE);
export const NOT_FOUND_MESSAGE = NOT_FOUND_MESSAGE_AR;
export const NOT_FOUND_TITLE = `${NOT_FOUND_CODE} | ${NOT_FOUND_MESSAGE}`;
