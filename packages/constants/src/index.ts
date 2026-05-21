export const GITHUB_REPO_URL = 'https://github.com/alwalxed/qafiyah';

export const MAX_TWEET_LENGTH = 280;

export const POEMS_PER_PAGE = 30;
export const SEARCH_POEMS_PER_PAGE = 5;
export const SEARCH_POETS_PER_PAGE = 10;

export const PROD_DOMAIN = 'qafiyah.com';
export const PROD_SITE_URL = `https://${PROD_DOMAIN}`;
export const PROD_API_URL = 'https://api.qafiyah.com';

export const API_V1_PREFIX = '/v1';
export const API_RANDOM_POEM_PATH = `${API_V1_PREFIX}/poems/random`;

export const SEARCH_EMPTY_INPUT_MESSAGE = 'أدخل كلمة بحث أو اختر فلترًا واحدًا على الأقل';

export const DEV_WEB_PORT = 4321;
export const DEV_API_PORT = 8787;

// Allows Arabic letters and whitespace; strips everything else.
// Covers: Basic Arabic (U+0600–U+06FF), Supplement (U+0750–U+077F), Extended-A (U+08A0–U+08FF).
export const NON_ARABIC_AND_SPACE_REGEX = /[^؀-ۿݐ-ݿࢠ-ࣿ\s]/g;

// Narrower variant covering only the Basic Arabic block; for pure display contexts
// where the Supplement and Extended-A blocks are not expected.
export const NON_ARABIC_BASIC_REGEX = /[^؀-ۿ\s]/g;

export const WHITESPACE_RUN_REGEX = /\s+/g;

export const DOUBLE_QUOTE_REGEX = /"/g;

export const MAX_QUERY_LENGTH = 50;

export const SEARCH_TYPE_VALUES = ['poems', 'poets'] as const;
export type SearchType = (typeof SEARCH_TYPE_VALUES)[number];

export const MATCH_TYPE_VALUES = ['all', 'exact', 'any'] as const;
export type MatchType = (typeof MATCH_TYPE_VALUES)[number];

export const DEV_ELASTICSEARCH_PORT = 9200;

// Versioned indices (poems_v1, poets_v1, …) sit behind stable aliases so
// reindexing can swap atomically with zero downtime.
export const POEMS_INDEX_ALIAS = 'poems';
export const POETS_INDEX_ALIAS = 'poets';
export const POEMS_INDEX_PREFIX = 'poems_v';
export const POETS_INDEX_PREFIX = 'poets_v';

// Weekly Postgres↔Elasticsearch reconciliation cadence (ms).
export const RECONCILE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export const WORKER_HEALTH_PORT = 8088;
export const ES_BULK_BATCH_SIZE = 1000;
