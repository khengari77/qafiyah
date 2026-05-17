export const SITE_NAME_EN = 'Qafiyah';
export const SITE_NAME_AR = 'قافية';

export const GITHUB_REPO_URL = 'https://github.com/alwalxed/qafiyah';

export const MAX_TWEET_LENGTH = 280;

export const POEMS_PER_PAGE = 30;
export const SEARCH_POEMS_PER_PAGE = 5;
export const SEARCH_POETS_PER_PAGE = 10;

export const DEV_API_PORT = 8787;
export const DEV_WEB_PORT = 4321;

export const PROD_DOMAIN = 'qafiyah.com';
export const PROD_API_URL = 'https://api.qafiyah.com';
export const PROD_SITE_URL = 'https://qafiyah.com';

export const API_V1_PREFIX = '/v1';
export const API_RANDOM_POEM_PATH = '/v1/poems/random';

export const HTTP_NOT_FOUND = 404;

// Allows Arabic letters and whitespace; strips everything else.
// Covers: Basic Arabic (U+0600–U+06FF), Supplement (U+0750–U+077F), Extended-A (U+08A0–U+08FF).
export const NON_ARABIC_AND_SPACE_REGEX = /[^؀-ۿݐ-ݿࢠ-ࣿ\s]/g;

export const MAX_QUERY_LENGTH = 50;

export const SEARCH_TYPE_VALUES = ['poems', 'poets'] as const;
export const MATCH_TYPE_VALUES = ['all', 'any', 'exact'] as const;

export const SEARCH_TEXTS = {
  refreshThePage: 'حدث الصفحة',
  currentHeaderTitle: 'مرجع الشعر العربي',
  search: 'ابحث',
  erasLabel: 'العصور',
  erasPlaceholder: 'عصر أو عدة عصور',
  metersLabel: 'البحور',
  metersPlaceholder: 'بحر أو عدة بحور',
  themesLabel: 'الأغراض',
  themesPlaceholder: 'غرض أو عدة أغراض',
  rhymesLabel: 'القوافي',
  rhymesPlaceholder: 'قافية أو عدة قوافي',
  searchTypeLabel: 'المجال',
  searchTypePlaceholder: 'اختر نوع البحث',
  matchTypeLabel: 'الطريقة',
  matchTypePlaceholder: 'اختر طريقة البحث',
  errorMessage: 'عذرًا، وقع خلل غير متوقّع. إن استمر، فتواصل معنا تويتر',
  searchFootnote: 'فرق بين القطع والوصل والتاء المربوطة والهاء',
  filterOnlyResultLabel: 'بهذه الفلاتر',
  noFilterResultsText: 'لم يُعثر على نتائج بهذه الفلاتر',
  arabicOnlyError: 'البحث بالعربية فقط',
  poemsSearchPlaceholder: 'ابحث في مليون بيت',
  poetsSearchPlaceholder: 'ابحث عن ديوان شاعر',
  poemsSearchTypeLabel: 'بيـت',
  poetsSearchTypeLabel: 'شاعر',
  poemSingular: 'بيت',
  poetSingular: 'شاعر',
  matchTypeAll: 'كل الكلمات',
  matchTypeExact: 'كل الكلمات (متتالية)',
  matchTypeAny: 'بعض الكلمات',
  missingQueryOrFilterError: 'أدخل كلمة بحث أو اختر فلترًا واحدًا على الأقل',
  maxLengthErrorTemplate: 'يجب ألا يتجاوز النص {n} حرفًا',
} as const;
