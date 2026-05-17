export const GITHUB_REPO_URL = 'https://github.com/alwalxed/qafiyah';

export const MAX_TWEET_LENGTH = 280;

export const POEMS_PER_PAGE = 30;
export const SEARCH_POEMS_PER_PAGE = 5;
export const SEARCH_POETS_PER_PAGE = 10;

export const PROD_DOMAIN = 'qafiyah.com';
export const PROD_API_URL = 'https://api.qafiyah.com';

export const API_V1_PREFIX = '/v1';
export const API_RANDOM_POEM_PATH = '/v1/poems/random';

// Allows Arabic letters and whitespace; strips everything else.
// Covers: Basic Arabic (U+0600–U+06FF), Supplement (U+0750–U+077F), Extended-A (U+08A0–U+08FF).
export const NON_ARABIC_AND_SPACE_REGEX = /[^؀-ۿݐ-ݿࢠ-ࣿ\s]/g;

export const MAX_QUERY_LENGTH = 50;

export const SEARCH_TYPE_VALUES = ['poems', 'poets'] as const;
export const MATCH_TYPE_VALUES = ['all', 'any', 'exact'] as const;
