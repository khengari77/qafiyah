import { DEV_WEB_PORT, PROD_API_URL, PROD_DOMAIN } from '@qafiyah/constants';

const DEV_WEB_URL = `http://localhost:${DEV_WEB_PORT}`;

import { env } from '@/env';

export const isDev = env.DEV;
export const API_URL = env.PUBLIC_API_URL ?? PROD_API_URL;
export const SITE_URL = isDev ? DEV_WEB_URL : `https://${PROD_DOMAIN}`;
