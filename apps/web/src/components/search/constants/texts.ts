import type { ArabicNounForms } from 'arabic-count-format';
import { formatArabicCount } from 'arabic-count-format';

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

const RESULTS_NOUN_FORMS: ArabicNounForms = {
  singular: 'نتيجة',
  dual: 'نتيجتان',
  plural: 'نتائج',
};

export function getBadgeCount(count: number, nounForms: ArabicNounForms): string {
  return formatArabicCount({ count, nounForms });
}

export function getNoResultsText(query: string): string {
  const cleaned = query.replace(/[^\u0600-\u06FF\s]/g, '').slice(0, 20);
  return `لم يُعثر على نتيجة لـ "${cleaned}${query.length > 20 ? '...' : ''}"`;
}

export function getResultText(
  count: number,
  query: string,
  searchType: 'poems' | 'poets',
  matchType: 'all' | 'any' | 'exact'
): string {
  const searchTypeText = searchType === 'poems' ? 'بيت' : 'شاعر';
  const matchTypeText =
    matchType === 'any'
      ? 'بعض الكلمات'
      : matchType === 'all'
        ? 'كل الكلمات'
        : 'كل الكلمات (متتالية)';

  const cleanedInput = query.replace(/[^\u0600-\u06FF\s]/g, '');
  const shortenedInputText =
    cleanedInput.length > 10 ? `${cleanedInput.slice(0, 10)}...` : cleanedInput;

  const resultsText = formatArabicCount({
    count,
    nounForms: RESULTS_NOUN_FORMS,
  });

  return `عثر على ${resultsText} لـ "${shortenedInputText}" بحثًا عن «${searchTypeText}» بحثَ (${matchTypeText})`;
}
