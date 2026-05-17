import { PROD_API_URL, PROD_DOMAIN } from '@qafiyah/constants';
import { env } from '@/env';
import { toArabicDigits } from '@/lib/arabic';

export type SelectOption = {
  readonly value: string;
  readonly label: string;
};

// Same range as NON_ARABIC_AND_SPACE_REGEX but Basic Arabic block only; used in pure display contexts.
export const NON_ARABIC_BASIC_REGEX = /[^؀-ۿ\s]/g;

export const DOUBLE_QUOTE_REGEX = /"/g;
export const CAT_POET_PREFIX_REGEX = /^cat-poet-/;

export const REACT_QUERY_STALE_TIME_MS = 2 * 24 * 60 * 60 * 1000;
export const REACT_QUERY_GC_TIME_MS = 3 * 24 * 60 * 60 * 1000;
export const REACT_QUERY_RETRY_COUNT = 1;

export const ERA_NAMES = new Map([
  ['islamic', 'إسلامي'],
  ['abbasid', 'عباسي'],
  ['umayyad', 'أموي'],
  ['jahili', 'جاهلي'],
  ['mukhadram', 'مخضرم'],
  ['andalusian', 'أندلسي'],
  ['mamluki', 'مملوكي'],
  ['ottoman', 'عثماني'],
  ['ayyubi', 'أيوبي'],
  ['late', 'متأخر'],
]);

export const DATABASE_DUMPS_URL = 'https://github.com/alwalxed/qafiyah/tree/main/dumps';
export const DEVELOPER_SITE_URL = 'https://alwalxed.com';
export const TWITTER_HANDLE = '@qafiyahiyahdotcom';
export const TWITTER_ID = '1570116567538475010';
export const X_HANDLE_URL = 'https://x.com/qafiyahdotcom';

const DEV_WEB_URL = `http://localhost:4321`;

export const isDev = env.DEV;
export const API_URL = env.PUBLIC_API_URL ?? PROD_API_URL;
export const SITE_URL = isDev ? DEV_WEB_URL : `https://${PROD_DOMAIN}`;

export const SITE_NAME_AR = 'قافية';

export const OPEN_GRAPH_URL_PATH = '/open-graph-white.png';
export const TWITTER_SUMMARY_CARD_IMAGE_PATH = '/twitter-summary-card-white.png';
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
  readonly external: boolean;
};

export const NAV_LINKS = [
  { name: 'الرئيسة', href: '/', external: false },
  { name: 'الشعراء', href: '/poets/page/1', external: false },
  { name: 'العصور', href: '/eras', external: false },
  { name: 'البحور', href: '/meters', external: false },
  { name: 'القوافي', href: '/rhymes', external: false },
  { name: 'الأغراض', href: '/themes', external: false },
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
} as const;

// Mirrors arabic-count-format's `ArabicNounForms`. Declared locally to keep
// @qafiyah/constants free of runtime dependencies.
export type ArabicNounForms = {
  readonly singular: string;
  readonly dual: string;
  readonly plural: string;
};

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
  { id: 1, name: 'إسلامي' },
  { id: 2, name: 'عباسي' },
  { id: 3, name: 'متأخر' },
  { id: 4, name: 'أموي' },
  { id: 5, name: 'جاهلي' },
  { id: 6, name: 'مخضرم' },
  { id: 7, name: 'أندلسي' },
  { id: 8, name: 'مملوكي' },
  { id: 9, name: 'عثماني' },
  { id: 10, name: 'أيوبي' },
] as const satisfies readonly SearchOption[];

const METERS_OPTIONS = [
  { id: 1, name: 'أحذ الكامل' },
  { id: 2, name: 'مشطور الرجز' },
  { id: 3, name: 'مخلع البسيط' },
  { id: 4, name: 'موشح' },
  { id: 5, name: 'القوما' },
  { id: 6, name: 'الهزج' },
  { id: 7, name: 'مجزوء الرمل' },
  { id: 8, name: 'مجزوء موشح' },
  { id: 9, name: 'منهوك' },
  { id: 10, name: 'الكامل' },
  { id: 11, name: 'المجتث' },
  { id: 12, name: 'مجزوء الطويل' },
  { id: 13, name: 'مخلع' },
  { id: 14, name: 'الدوبيت' },
  { id: 15, name: 'الوافر' },
  { id: 16, name: 'المواليا' },
  { id: 18, name: 'المديد' },
  { id: 19, name: 'الطويل' },
  { id: 20, name: 'السلسلة' },
  { id: 21, name: 'مشطور' },
  { id: 22, name: 'المقتضب' },
  { id: 23, name: 'مجزوء الوافر' },
  { id: 24, name: 'أحذ' },
  { id: 26, name: 'المضارع' },
  { id: 27, name: 'مجزوء الخفيف' },
  { id: 29, name: 'السريع' },
  { id: 30, name: 'منهوك المنسرح' },
  { id: 31, name: 'المنسرح' },
  { id: 32, name: 'مربع' },
  { id: 33, name: 'مجزوء الرجز' },
  { id: 34, name: 'المتدارك' },
  { id: 35, name: 'عدد' },
  { id: 36, name: 'المتقارب' },
  { id: 37, name: 'الرجز' },
  { id: 38, name: 'مجزوء المتقارب' },
  { id: 39, name: 'الخفيف' },
  { id: 40, name: 'مجزوء الهزج' },
  { id: 41, name: 'الرمل' },
  { id: 42, name: 'مجزوء' },
  { id: 43, name: 'البسيط' },
  { id: 44, name: 'مجزوء الكامل' },
] as const satisfies readonly SearchOption[];

const RHYMES_OPTIONS = [
  { id: 1, name: 'الميم' },
  { id: 2, name: 'الهاء' },
  { id: 3, name: 'الظاء' },
  { id: 4, name: 'الواو' },
  { id: 6, name: 'الشين' },
  { id: 7, name: 'الزاى' },
  { id: 8, name: 'النون' },
  { id: 13, name: 'الدال' },
  { id: 14, name: 'الفاء' },
  { id: 15, name: 'الباء' },
  { id: 16, name: 'الخاء' },
  { id: 17, name: 'الياء' },
  { id: 18, name: 'الضاد' },
  { id: 19, name: 'التاء' },
  { id: 20, name: 'اللام' },
  { id: 24, name: 'الحاء' },
  { id: 26, name: 'السين' },
  { id: 30, name: 'الطاء' },
  { id: 31, name: 'الكاف' },
  { id: 34, name: 'الثاء' },
  { id: 35, name: 'الراء' },
  { id: 36, name: 'الألف' },
  { id: 38, name: 'الغين' },
  { id: 39, name: 'الذال' },
  { id: 41, name: 'الهمزة' },
  { id: 42, name: 'الجيم' },
  { id: 43, name: 'الصاد' },
  { id: 44, name: 'القاف' },
  { id: 45, name: 'العين' },
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

export const searchTypeOptions = [
  { value: 'poems', label: SEARCH_TEXTS.poemsSearchTypeLabel },
  { value: 'poets', label: SEARCH_TEXTS.poetsSearchTypeLabel },
] as const satisfies readonly [SelectOption, SelectOption];

export const matchTypeOptions = [
  { value: 'all', label: SEARCH_TEXTS.matchTypeAll },
  { value: 'exact', label: SEARCH_TEXTS.matchTypeExact },
  { value: 'any', label: SEARCH_TEXTS.matchTypeAny },
] as const satisfies readonly SelectOption[];

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
