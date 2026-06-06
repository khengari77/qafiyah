import {
  DEV_WEB_PORT,
  GITHUB_REPO_URL,
  MATCH_TYPE_VALUES,
  PROD_API_URL,
  PROD_DOMAIN,
  SEARCH_TYPE_VALUES,
} from '@qafiyah/constants';
import type { ArabicNounForms } from 'arabic-count-format';
import { env } from '@/env';
import { toArabicDigits } from '@/lib/arabic';

export type SelectOption = {
  readonly value: string;
  readonly label: string;
};

export const CAT_POET_PREFIX_REGEX = /^cat-poet-/;

export const REACT_QUERY_STALE_TIME_MS = 2 * 24 * 60 * 60 * 1000;
export const REACT_QUERY_GC_TIME_MS = 3 * 24 * 60 * 60 * 1000;
export const REACT_QUERY_RETRY_COUNT = 1;

export const DATABASE_DUMPS_URL = `${GITHUB_REPO_URL}/tree/main/dumps`;
export const DEVELOPER_SITE_URL = 'https://alwalxed.com';
export const TWITTER_HANDLE = '@qafiyahiyahdotcom';
export const TWITTER_ID = '1570116567538475010';
export const X_HANDLE_URL = 'https://x.com/qafiyahdotcom';

const DEV_WEB_URL = `http://localhost:${DEV_WEB_PORT}`;

export const isDev = env.DEV;
export const API_URL = env.PUBLIC_API_URL ?? PROD_API_URL;
export const SITE_URL = isDev ? DEV_WEB_URL : `https://${PROD_DOMAIN}`;

export const SITE_NAME_AR = 'قافية';

export const OPEN_GRAPH_URL_PATH = '/open-graph-white.png';
export const SITE_LOGO_PATH = '/logo.webp';

export const SITE_TITLE = `${SITE_NAME_AR}: مرجع الشعر العربي`;
export const SITE_DESCRIPTION =
  'نعنى بجمع شعر العرب، فحفظه من حفظ كتاب الله، كما قال ابن عباس: الشعر ديوان العرب، فإذا خفي علينا الحرف من القرآن، رجعنا إلى ديوانهم فالتمسناه فيه';
export const SITE_KEYWORDS = [
  'موقع قافية',
  'شعر',
  'شعر عربي',
  'قصائد',
  'معلقات',
  'شعر جاهلي',
  'شعر حديث',
  'قافية',
  'ديوان العرب',
  'أدب',
  'قصائد مشهورة',
  'شعر نبطي',
] as const;
export const SITE_THEME_COLOR_HEX = '#fafafa';
export const SCHEMA_ORG_CONTEXT = 'https://schema.org';

export type NavLink = {
  readonly name: string;
  readonly href: string;
  readonly isExternal: boolean;
};

export const NAV_LINKS = [
  { name: 'الرئيسة', href: '/', isExternal: false },
  { name: 'الشعراء', href: '/poets', isExternal: false },
  { name: 'البحور', href: '/meters', isExternal: false },
  { name: 'القوافي', href: '/rhymes', isExternal: false },
  { name: 'الأغراض', href: '/themes', isExternal: false },
  { name: 'الدواوين', href: '/collections', isExternal: false },
] as const satisfies readonly NavLink[];

export const SEARCH_RESULTS_STALE_TIME_MS = 5 * 60 * 1000;
export const INFINITE_SCROLL_THRESHOLD = 0.1;
export const QUERY_DISPLAY_TRUNCATE_LENGTH = 20;
export const RESULT_TEXT_TRUNCATE_LENGTH = 10;
export const VERSE_DESCRIPTION_OPTIMAL_LENGTH = 300;
export const VERSE_SEPARATOR_DISPLAY = ' * ';

export const RESPONSIVE_ICON_SIZE = 'w-4 h-4 xxs:w-5 xxs:h-5 md:w-8 md:h-8';

export const FONT_SIZE_MIN = 0.7;
export const FONT_SIZE_MAX = 1.5;
export const FONT_SIZE_INITIAL = 1;
export const FONT_SIZE_STEP = 0.1;
export const FONT_SIZE_BASE_GAP_PX = 16;
export const NOT_FOUND_MESSAGE_AR = 'الصفحة غير موجودة';

export const POEM_DEFAULT_TITLE = 'قصيدة';
export const UNKNOWN_POET_NAME = 'شاعر غير معروف';
export const POEM_KEYWORDS_JOIN_SEPARATOR = ' - ';
export const POEM_LANGUAGE = 'ar';
export const TWITTER_DESCRIPTION_TEMPLATE_AR = 'ديوان «{poet}» على موقع قافية';

export const NOT_FOUND_CODE = toArabicDigits(404);
export const NOT_FOUND_TITLE = `${NOT_FOUND_CODE} | ${NOT_FOUND_MESSAGE_AR}`;

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
  collectionsLabel: 'الدواوين',
  collectionsPlaceholder: 'ديوان أو عدة دواوين',
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
  maxLengthErrorTemplate: 'يجب ألا يتجاوز النص {n} حرفًا',
  poemsSectionTitle: 'القصائد',
  poetsSectionTitle: 'الشعراء',
} as const;

export const ERAS_NOUN_FORMS = {
  singular: 'عصر',
  dual: 'عصران',
  plural: 'عصور',
} as const satisfies ArabicNounForms;

export const METERS_NOUN_FORMS = {
  singular: 'بحر',
  dual: 'بحران',
  plural: 'بحور',
} as const satisfies ArabicNounForms;

export const THEMES_NOUN_FORMS = {
  singular: 'غرض',
  dual: 'غرضان',
  plural: 'أغراض',
} as const satisfies ArabicNounForms;

export const RHYMES_NOUN_FORMS = {
  singular: 'قافية',
  dual: 'قافيتان',
  plural: 'قوافي',
} as const satisfies ArabicNounForms;

export const COLLECTIONS_NOUN_FORMS = {
  singular: 'ديوان',
  dual: 'ديوانان',
  plural: 'دواوين',
} as const satisfies ArabicNounForms;

export const POEMS_NOUN_FORMS = {
  singular: 'قصيدة',
  dual: 'قصيدتان',
  plural: 'قصائد',
} as const satisfies ArabicNounForms;

export const RESULTS_NOUN_FORMS = {
  singular: 'نتيجة',
  dual: 'نتيجتان',
  plural: 'نتائج',
} as const satisfies ArabicNounForms;

type SearchOption = { readonly id: number; readonly name: string };

const ERAS_OPTIONS = [
  { id: 5, name: 'جاهلي' },
  { id: 1, name: 'إسلامي' },
  { id: 4, name: 'أموي' },
  { id: 2, name: 'عباسي' },
  { id: 7, name: 'أندلسي' },
  { id: 11, name: 'متأخر' },
] as const satisfies readonly SearchOption[];

const METERS_OPTIONS = [
  { id: 1, name: 'المضارع' },
  { id: 2, name: 'المقتضب' },
  { id: 3, name: 'غير ذلك' },
  { id: 6, name: 'الهزج' },
  { id: 10, name: 'الكامل' },
  { id: 11, name: 'المجتث' },
  { id: 15, name: 'الوافر' },
  { id: 18, name: 'المديد' },
  { id: 19, name: 'الطويل' },
  { id: 29, name: 'السريع' },
  { id: 31, name: 'المنسرح' },
  { id: 34, name: 'المتدارك' },
  { id: 36, name: 'المتقارب' },
  { id: 37, name: 'الرجز' },
  { id: 39, name: 'الخفيف' },
  { id: 41, name: 'الرمل' },
  { id: 43, name: 'البسيط' },
] as const satisfies readonly SearchOption[];

const RHYMES_OPTIONS = [
  { id: 1, name: 'ألف' },
  { id: 2, name: 'ألف مفتوحة' },
  { id: 3, name: 'ألف مكسورة' },
  { id: 4, name: 'ألف مدودة' },
  { id: 5, name: 'ألف مقصورة' },
  { id: 6, name: 'همزة' },
  { id: 7, name: 'همزة مضمومة' },
  { id: 8, name: 'همزة مكسورة' },
  { id: 9, name: 'تاء مربوطة' },
  { id: 10, name: 'باء' },
  { id: 11, name: 'تاء' },
  { id: 12, name: 'ثاء' },
  { id: 13, name: 'جيم' },
  { id: 14, name: 'حاء' },
  { id: 15, name: 'خاء' },
  { id: 16, name: 'دال' },
  { id: 17, name: 'ذال' },
  { id: 18, name: 'راء' },
  { id: 19, name: 'زاي' },
  { id: 20, name: 'سين' },
  { id: 21, name: 'شين' },
  { id: 22, name: 'صاد' },
  { id: 23, name: 'ضاد' },
  { id: 24, name: 'طاء' },
  { id: 25, name: 'ظاء' },
  { id: 26, name: 'عين' },
  { id: 27, name: 'غين' },
  { id: 28, name: 'فاء' },
  { id: 29, name: 'قاف' },
  { id: 30, name: 'كاف' },
  { id: 31, name: 'لام' },
  { id: 32, name: 'ميم' },
  { id: 33, name: 'نون' },
  { id: 34, name: 'هاء' },
  { id: 35, name: 'واو' },
  { id: 36, name: 'ياء' },
] as const satisfies readonly SearchOption[];

const THEMES_OPTIONS = [
  { id: 1, name: 'دينية' },
  { id: 2, name: 'عتاب' },
  { id: 3, name: 'عدل' },
  { id: 4, name: 'هجاء' },
  { id: 5, name: 'اعتذار' },
  { id: 6, name: 'رومنسية' },
  { id: 7, name: 'ذم' },
  { id: 9, name: 'من' },
  { id: 10, name: 'ابتهال' },
  { id: 11, name: 'شوق' },
  { id: 12, name: 'قصيرة' },
  { id: 13, name: 'فراق' },
  { id: 14, name: 'سياسية' },
  { id: 15, name: 'جود' },
  { id: 16, name: 'معلقة' },
  { id: 17, name: 'غزل' },
  { id: 18, name: 'مدح' },
  { id: 19, name: 'رثاء' },
  { id: 20, name: 'نصيحة' },
  { id: 21, name: 'حزينة' },
  { id: 22, name: 'رحمة' },
  { id: 23, name: 'حكمة' },
  { id: 24, name: 'عامة' },
  { id: 25, name: 'أنشودة' },
  { id: 26, name: 'صبر' },
  { id: 27, name: 'وطن' },
] as const satisfies readonly SearchOption[];

const COLLECTIONS_OPTIONS = [{ id: 1, name: 'المعلقات', slug: 'almuallaqat' }] as const;

const SEARCH_TYPE_LABELS = {
  poems: SEARCH_TEXTS.poemsSearchTypeLabel,
  poets: SEARCH_TEXTS.poetsSearchTypeLabel,
} as const satisfies Record<(typeof SEARCH_TYPE_VALUES)[number], string>;

export const MATCH_TYPE_LABELS = {
  all: SEARCH_TEXTS.matchTypeAll,
  exact: SEARCH_TEXTS.matchTypeExact,
  any: SEARCH_TEXTS.matchTypeAny,
} as const satisfies Record<(typeof MATCH_TYPE_VALUES)[number], string>;

// The search-type toggle requires a 2-tuple, which `.map` does not preserve.
const [SEARCH_TYPE_POEMS, SEARCH_TYPE_POETS] = SEARCH_TYPE_VALUES;
export const searchTypeOptions: readonly [SelectOption, SelectOption] = [
  { value: SEARCH_TYPE_POEMS, label: SEARCH_TYPE_LABELS[SEARCH_TYPE_POEMS] },
  { value: SEARCH_TYPE_POETS, label: SEARCH_TYPE_LABELS[SEARCH_TYPE_POETS] },
];

export const matchTypeOptions: readonly SelectOption[] = MATCH_TYPE_VALUES.map((value) => ({
  value,
  label: MATCH_TYPE_LABELS[value],
}));

export const erasOptions: readonly SelectOption[] = ERAS_OPTIONS.map((era) => ({
  value: era.id.toString(),
  label: era.name,
}));

export const rhymesOptions: readonly SelectOption[] = RHYMES_OPTIONS.map((rhyme) => ({
  value: rhyme.id.toString(),
  label: rhyme.name,
}));

export const metersOptions: readonly SelectOption[] = METERS_OPTIONS.map((meter) => ({
  value: meter.id.toString(),
  label: meter.name,
}));

export const themesOptions: readonly SelectOption[] = THEMES_OPTIONS.map((theme) => ({
  value: theme.id.toString(),
  label: theme.name,
}));

export const collectionsOptions: readonly SelectOption[] = COLLECTIONS_OPTIONS.map((c) => ({
  value: c.slug,
  label: c.name,
}));
