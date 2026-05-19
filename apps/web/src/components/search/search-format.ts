import { type MatchType, NON_ARABIC_BASIC_REGEX, type SearchType } from '@qafiyah/constants';
import { type ArabicNounForms, formatArabicCount } from 'arabic-count-format';
import {
  MATCH_TYPE_LABELS,
  QUERY_DISPLAY_TRUNCATE_LENGTH,
  RESULT_TEXT_TRUNCATE_LENGTH,
  RESULTS_NOUN_FORMS,
  SEARCH_TEXTS,
} from '@/constants';

export function getBadgeCount(count: number, nounForms: ArabicNounForms): string {
  return formatArabicCount({ count, nounForms });
}

export function getNoResultsText({
  hasCommittedQuery,
  query,
}: {
  readonly hasCommittedQuery: boolean;
  readonly query: string;
}): string {
  if (!hasCommittedQuery) return SEARCH_TEXTS.noFilterResultsText;
  const cleaned = query.replace(NON_ARABIC_BASIC_REGEX, '').slice(0, QUERY_DISPLAY_TRUNCATE_LENGTH);
  return `لم يُعثر على نتيجة لـ "${cleaned}${query.length > QUERY_DISPLAY_TRUNCATE_LENGTH ? '...' : ''}"`;
}

export function getResultText({
  count,
  query,
  searchType,
  matchType,
  hasCommittedQuery,
}: {
  readonly count: number;
  readonly query: string;
  readonly searchType: SearchType;
  readonly matchType: MatchType;
  readonly hasCommittedQuery: boolean;
}): string {
  const searchTypeText =
    searchType === 'poems' ? SEARCH_TEXTS.poemSingular : SEARCH_TEXTS.poetSingular;
  const resultsText = formatArabicCount({ count, nounForms: RESULTS_NOUN_FORMS });

  if (!hasCommittedQuery) {
    return `عثر على ${resultsText} ${SEARCH_TEXTS.filterOnlyResultLabel} بحثًا عن «${searchTypeText}»`;
  }

  const matchTypeText = MATCH_TYPE_LABELS[matchType];

  const cleanedInput = query.replace(NON_ARABIC_BASIC_REGEX, '');
  const shortenedInputText =
    cleanedInput.length > RESULT_TEXT_TRUNCATE_LENGTH
      ? `${cleanedInput.slice(0, RESULT_TEXT_TRUNCATE_LENGTH)}...`
      : cleanedInput;

  return `عثر على ${resultsText} لـ "${shortenedInputText}" بحثًا عن «${searchTypeText}» بحثَ (${matchTypeText})`;
}
