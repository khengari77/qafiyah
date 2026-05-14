import { DEV_WEB_URL, PROD_API_URL, PROD_DOMAIN, SITE_NAME_AR } from '@qafiyah/constants';
import { toArabicDigits } from '@/lib/arabic';

export {
  DATABASE_DUMPS_URL,
  DEVELOPER_SITE_URL,
  GITHUB_REPO_URL,
  TWITTER_HANDLE,
  TWITTER_ID,
} from '@qafiyah/constants';

export const isDev = import.meta.env.DEV;
export const SITE_NAME = SITE_NAME_AR;
export const API_URL = import.meta.env['PUBLIC_API_URL'] || PROD_API_URL;
export const SITE_URL = isDev ? DEV_WEB_URL : `https://${PROD_DOMAIN}`;
export const responsiveIconSize = 'w-4 h-4 xxs:w-5 xxs:h-5 md:w-8 md:h-8';
export const NOT_FOUND_CODE = toArabicDigits(404);
export const NOT_FOUND_MESSAGE = 'الصفحة غير موجودة';
export const NOT_FOUND_TITLE = `${NOT_FOUND_CODE} | ${NOT_FOUND_MESSAGE}`;
