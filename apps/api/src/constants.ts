// API-specific paths (not shared with other packages)
export const API_DOCS_PATH = '/v1/docs';
export const API_OPENAPI_SPEC_PATH = '/openapi.json';
export const API_OPENAPI_DOCS_PATH = '/docs';
export const FAVICON_PATH = '/favicon.ico';
export const ORPC_BYPASS_PATHS = new Set<string>(['/v1', '/v1/poems/random']);

// HTTP status codes used only by the API
export const REDIRECT_TO_DOCS_STATUS = 302;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_INTERNAL_SERVER_ERROR = 500;
export const HTTP_SERVICE_UNAVAILABLE = 503;

// Cache-control header values
export const FAVICON_CACHE_CONTROL = 'public, max-age=2592000, immutable';
export const LLMS_CACHE_CONTROL = 'public, max-age=3600';
export const NO_STORE_CACHE_CONTROL = 'no-store';
export const CORS_MAX_AGE_SECONDS = 600;

// Brand
export const SITE_NAME_EN = 'Qafiyah';

// URLs
export const PROD_SITE_URL = 'https://qafiyah.com';
