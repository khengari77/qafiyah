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
import { Filters } from './filters';
import { FilterBadges } from './filters-badges';
import { FiltersButton } from './filters-button';
import { ResultList } from './result-list';
import { SearchInput } from './search-input';

export function SearchContainer() {
  const { state, flags, selection, handlers, refs } = useSearch();

  return (
    <section className="w-full mx-auto max-w-2xl flex flex-col h-full flex-1 justify-start items pb-24">
      {/*  */}
      <div className="h-[25svh] w-full"></div>

      <div className="w-full flex flex-col gap-10 md:gap-16" dir="rtl">
        <h1 className="font-bold text-center justify-center items-center text-2xl xxs:text-3xl xs:text-4xl md:text-5xl text-zinc-800 flex py-2">
          {SEARCH_TEXTS.currentHeaderTitle}
        </h1>
        <Card className="border-0 shadow-none bg-transparent">
          <div className="p-0 bg">
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
                handleKeyDown={handlers.onKeyDown}
                handleInputChange={handlers.onInputChange}
                resetAllStates={handlers.resetAll}
                hasQuery={flags.hasQuery}
              />
              <div className="flex items-center justify-between">
                <FiltersButton
                  toggleFilters={handlers.toggleFilters}
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
                  hasText={flags.hasText}
                  hasInputText={flags.hasInputText}
                />
              )}
            </div>
          </div>
        </Card>

        <ResultList
          status={state.status}
          loadMoreRef={refs.loadMore}
          hasText={flags.hasText}
          hasFilters={flags.hasFilters}
          errorMessage={SEARCH_TEXTS.errorMessage}
          refreshText={SEARCH_TEXTS.refreshThePage}
          noResultsText={getNoResultsText({
            hasText: flags.hasText,
            query: state.searchParams.q || '',
          })}
          resultText={getResultText({
            count: state.totalResults,
            query: state.searchParams.q || '',
            searchType: state.searchType,
            matchType: state.matchType,
            hasText: flags.hasText,
          })}
        />
      </div>
    </section>
  );
}
