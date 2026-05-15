import {
  type ArabicNounForms,
  NON_ARABIC_BASIC_REGEX,
  QUERY_DISPLAY_TRUNCATE_LENGTH,
  RESULT_TEXT_TRUNCATE_LENGTH,
  RESULTS_NOUN_FORMS,
  SEARCH_TEXTS,
} from '@qafiyah/constants';
import { formatArabicCount } from 'arabic-count-format';

export function getBadgeCount(count: number, nounForms: ArabicNounForms): string {
  return formatArabicCount({ count, nounForms });
}

export function getNoResultsText({ hasText, query }: { hasText: boolean; query: string }): string {
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
  count: number;
  query: string;
  searchType: 'poems' | 'poets';
  matchType: 'all' | 'any' | 'exact';
  hasText: boolean;
}): string {
  const searchTypeText =
    searchType === 'poems' ? SEARCH_TEXTS.poemSingular : SEARCH_TEXTS.poetSingular;
  const resultsText = formatArabicCount({ count, nounForms: RESULTS_NOUN_FORMS });

  if (!hasText) {
    return `عثر على ${resultsText} ${SEARCH_TEXTS.filterOnlyResultLabel} بحثًا عن «${searchTypeText}»`;
  }

  const matchTypeLabels: Record<'any' | 'all' | 'exact', string> = {
    any: SEARCH_TEXTS.matchTypeAny,
    all: SEARCH_TEXTS.matchTypeAll,
    exact: SEARCH_TEXTS.matchTypeExact,
  };
  const matchTypeText = matchTypeLabels[matchType];

  const cleanedInput = query.replace(NON_ARABIC_BASIC_REGEX, '');
  const shortenedInputText =
    cleanedInput.length > RESULT_TEXT_TRUNCATE_LENGTH
      ? `${cleanedInput.slice(0, RESULT_TEXT_TRUNCATE_LENGTH)}...`
      : cleanedInput;

  return `عثر على ${resultsText} لـ "${shortenedInputText}" بحثًا عن «${searchTypeText}» بحثَ (${matchTypeText})`;
}
