'use client';

import { getBadgeCount, getNoResultsText, getResultText } from '@/components/search/search-format';
import { useSearch } from '@/components/search/use-search';
import { Card } from '@/components/ui/card';
import {
  ERAS_NOUN_FORMS,
  erasOptions,
  METERS_NOUN_FORMS,
  matchTypeOptions,
  metersOptions,
  RHYMES_NOUN_FORMS,
  rhymesOptions,
  SEARCH_TEXTS,
  searchTypeOptions,
  THEMES_NOUN_FORMS,
  themesOptions,
} from '@/constants';
import { FilterBadges, Filters, FiltersButton } from './filters';
import { ResultList } from './result-list';
import { SearchInput } from './search-input';

export function SearchContainer() {
  const { state, flags, selection, handlers, refs } = useSearch();

  return (
    <section className="items mx-auto flex h-full w-full max-w-2xl flex-1 flex-col justify-start pb-24">
      {/*  */}
      <div className="h-[25svh] w-full"></div>

      <div className="flex w-full flex-col gap-10 md:gap-16" dir="rtl">
        <h1 className="flex items-center justify-center py-2 text-center font-bold text-2xl text-zinc-800 xs:text-4xl xxs:text-3xl md:text-5xl">
          {SEARCH_TEXTS.currentHeaderTitle}
        </h1>
        <Card className="border-0 bg-transparent shadow-none">
          <div className="bg p-0">
            <div className="flex flex-col gap-4">
              <SearchInput
                placeholder={
                  state.searchType === 'poems'
                    ? SEARCH_TEXTS.poemsSearchPlaceholder
                    : SEARCH_TEXTS.poetsSearchPlaceholder
                }
                searchLabel={SEARCH_TEXTS.search}
                inputValue={state.inputValue}
                validationError={state.validationError}
                onKeyDown={handlers.onKeyDown}
                onInputChange={handlers.onInputChange}
                onReset={handlers.onReset}
                hasQueryToShow={flags.hasQueryToShow}
              />
              <div className="flex items-center justify-between">
                <FiltersButton
                  onToggle={handlers.onToggleFilters}
                  filtersVisible={flags.filtersVisible}
                />

                <FilterBadges
                  erasCount={getBadgeCount(selection.eras.length || 0, ERAS_NOUN_FORMS)}
                  metersCount={getBadgeCount(selection.meters.length || 0, METERS_NOUN_FORMS)}
                  themesCount={getBadgeCount(selection.themes.length || 0, THEMES_NOUN_FORMS)}
                  rhymesCount={getBadgeCount(selection.rhymes.length || 0, RHYMES_NOUN_FORMS)}
                  selectedErasLength={selection.eras.length}
                  selectedMetersLength={selection.meters.length}
                  selectedRhymesLength={selection.rhymes.length}
                  selectedThemesLength={selection.themes.length}
                />
              </div>

              {flags.filtersVisible && (
                <Filters
                  filters={{
                    searchType: {
                      value: state.searchParams.search_type,
                      options: searchTypeOptions,
                      onChange: handlers.onSearchTypeChange,
                    },
                    matchType: {
                      value: state.searchParams.match_type,
                      options: matchTypeOptions,
                      onChange: handlers.onMatchTypeChange,
                    },
                    eras: {
                      selected: selection.eras,
                      options: erasOptions,
                      onChange: handlers.onErasChange,
                    },
                    meters: {
                      selected: selection.meters,
                      options: metersOptions,
                      onChange: handlers.onMetersChange,
                    },
                    themes: {
                      selected: selection.themes,
                      options: themesOptions,
                      onChange: handlers.onThemesChange,
                    },
                    rhymes: {
                      selected: selection.rhymes,
                      options: rhymesOptions,
                      onChange: handlers.onRhymesChange,
                    },
                  }}
                  isPoemsMode={state.searchType === 'poems'}
                />
              )}
            </div>
          </div>
        </Card>

        <ResultList
          status={state.status}
          loadMoreRef={refs.loadMore}
          hasCommittedQuery={flags.hasCommittedQuery}
          hasFilters={flags.hasFilters}
          errorMessage={SEARCH_TEXTS.errorMessage}
          refreshText={SEARCH_TEXTS.refreshThePage}
          noResultsText={getNoResultsText({
            hasCommittedQuery: flags.hasCommittedQuery,
            query: state.searchParams.q || '',
          })}
          resultText={getResultText({
            count: state.totalResults,
            query: state.searchParams.q || '',
            searchType: state.searchType,
            matchType: state.matchType,
            hasCommittedQuery: flags.hasCommittedQuery,
          })}
        />
      </div>
    </section>
  );
}
