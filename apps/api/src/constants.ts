import { API_V1_PREFIX, PROD_API_URL } from '@qafiyah/constants';

export const SITE_NAME_EN = 'Qafiyah';
export const PROD_SITE_URL = 'https://qafiyah.com';

// API-specific paths (not shared with other packages)
export const API_DOCS_PATH = '/v1/docs';
export const API_OPENAPI_SPEC_PATH = '/openapi.json';
export const API_OPENAPI_DOCS_PATH = '/docs';
export const FAVICON_PATH = '/favicon.ico';
export const ORPC_BYPASS_PATHS = new Set<string>(['/v1', '/v1/poems/random']);

// HTTP status codes used only by the API
export const REDIRECT_TO_DOCS_STATUS = 302;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_NOT_FOUND = 404;
export const HTTP_INTERNAL_SERVER_ERROR = 500;
export const HTTP_SERVICE_UNAVAILABLE = 503;

// Cache-control header values
export const FAVICON_CACHE_CONTROL = 'public, max-age=2592000, immutable';
export const LLMS_CACHE_CONTROL = 'public, max-age=3600';
export const NO_STORE_CACHE_CONTROL = 'no-store';
export const CORS_MAX_AGE_SECONDS = 600;

// Error type URL base (RFC 9457 `type` field)
export const ERROR_BASE_URL = `${PROD_SITE_URL}/errors`;

// OpenAPI spec metadata
export const API_VERSION = '1.0.0';
export const API_DESCRIPTION = 'Public read-only API for the Qafiyah Arabic poetry catalog.';
export const LICENSE_NAME = 'MIT';

// Service identity
export const API_SERVICE_NAME = 'qafiyah-api';
export const FAVICON_EMOJI = '📜';

// Composed base URL for llms.txt endpoint list
export const PROD_API_V1_BASE = `${PROD_API_URL}${API_V1_PREFIX}`;

// Logger sampling / slow-request threshold
export const LOG_PROD_SAMPLE_RATE = 0.05;
export const LOG_SLOW_REQUEST_MS = 2000;
