import { formatArabicCount } from 'arabic-count-format';
import { NON_ARABIC_BASIC_REGEX } from '@/constants/arabic';
import {
  QUERY_DISPLAY_TRUNCATE_LENGTH,
  RESULT_TEXT_TRUNCATE_LENGTH,
} from '@/constants/search-limits';
import { type ArabicNounForms, RESULTS_NOUN_FORMS, SEARCH_TEXTS } from '@/constants/search-texts';

export function getBadgeCount(count: number, nounForms: ArabicNounForms): string {
  return formatArabicCount({ count, nounForms });
}

export function getNoResultsText({
  hasText,
  query,
}: {
  readonly hasText: boolean;
  readonly query: string;
}): string {
  if (!hasText) return SEARCH_TEXTS.noFilterResultsText;
  const cleaned = query.replace(NON_ARABIC_BASIC_REGEX, '').slice(0, QUERY_DISPLAY_TRUNCATE_LENGTH);
  return `لم يُعثر على نتيجة لـ "${cleaned}${query.length > QUERY_DISPLAY_TRUNCATE_LENGTH ? '...' : ''}"`;
}

export function getResultText({
  count,
  query,
  searchType,
  matchType,
  hasText,
}: {
  readonly count: number;
  readonly query: string;
  readonly searchType: 'poems' | 'poets';
  readonly matchType: 'all' | 'any' | 'exact';
  readonly hasText: boolean;
}): string {
  const searchTypeText =
    searchType === 'poems' ? SEARCH_TEXTS.poemSingular : SEARCH_TEXTS.poetSingular;
  const resultsText = formatArabicCount({ count, nounForms: RESULTS_NOUN_FORMS });

  if (!hasText) {
    return `عثر على ${resultsText} ${SEARCH_TEXTS.filterOnlyResultLabel} بحثًا عن «${searchTypeText}»`;
  }

  const matchTypeLabels = {
    any: SEARCH_TEXTS.matchTypeAny,
    all: SEARCH_TEXTS.matchTypeAll,
    exact: SEARCH_TEXTS.matchTypeExact,
  } as const satisfies Readonly<Record<'any' | 'all' | 'exact', string>>;
  const matchTypeText = matchTypeLabels[matchType];

  const cleanedInput = query.replace(NON_ARABIC_BASIC_REGEX, '');
  const shortenedInputText =
    cleanedInput.length > RESULT_TEXT_TRUNCATE_LENGTH
      ? `${cleanedInput.slice(0, RESULT_TEXT_TRUNCATE_LENGTH)}...`
      : cleanedInput;

  return `عثر على ${resultsText} لـ "${shortenedInputText}" بحثًا عن «${searchTypeText}» بحثَ (${matchTypeText})`;
}
