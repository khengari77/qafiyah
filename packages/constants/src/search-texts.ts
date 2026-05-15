// Mirrors arabic-count-format's `ArabicNounForms`. Declared locally to keep
// @qafiyah/constants free of runtime dependencies.
export type ArabicNounForms = {
  singular: string;
  dual: string;
  plural: string;
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

export const ERAS_NOUN_FORMS: ArabicNounForms = {
  singular: 'عصر',
  dual: 'عصران',
  plural: 'عصور',
};

export const METERS_NOUN_FORMS: ArabicNounForms = {
  singular: 'بحر',
  dual: 'بحران',
  plural: 'بحور',
};

export const THEMES_NOUN_FORMS: ArabicNounForms = {
  singular: 'غرض',
  dual: 'غرضان',
  plural: 'أغراض',
};

export const RHYMES_NOUN_FORMS: ArabicNounForms = {
  singular: 'قافية',
  dual: 'قافيتان',
  plural: 'قوافي',
};

export const RESULTS_NOUN_FORMS: ArabicNounForms = {
  singular: 'نتيجة',
  dual: 'نتيجتان',
  plural: 'نتائج',
};
