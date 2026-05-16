// Mirrors arabic-count-format's `ArabicNounForms`. Declared locally to keep
// @qafiyah/constants free of runtime dependencies.
export type ArabicNounForms = {
  readonly singular: string;
  readonly dual: string;
  readonly plural: string;
};

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
