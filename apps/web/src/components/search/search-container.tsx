'use client';

import {
  ERAS_NOUN_FORMS,
  METERS_NOUN_FORMS,
  RHYMES_NOUN_FORMS,
  SEARCH_TEXTS,
  THEMES_NOUN_FORMS,
} from '@qafiyah/constants';
import {
  erasOptions,
  matchTypeOptions,
  metersOptions,
  rhymesOptions,
  searchTypeOptions,
  themesOptions,
} from '@/components/search/constants';
import {
  getBadgeCount,
  getNoResultsText,
  getResultText,
} from '@/components/search/constants/texts';
import { useSearch } from '@/components/search/hooks/use-search';
import { Card } from '@/components/ui/card';
import { Filters } from './filters';
import { FilterBadges } from './filters-badges';
import { FiltersButton } from './filters-button';
import { ResultList } from './result-list';
import { SearchInput } from './search-input';

export function SearchContainer() {
  const {
    isLoading,
    isError,
    isSuccess,
    isFetchingNextPage,
    filtersVisible,
    hasQuery,
    hasText,
    hasInputText,
    hasFilters,
    loadMoreRef,
    data,
    totalResults,
    validationError,
    inputValue,
    searchParams,
    searchType,
    matchType,
    selectedMeters,
    selectedThemes,
    selectedEras,
    selectedRhymes,
    handleMatchTypeChange,
    handleRhymesChange,
    handleErasChange,
    handleMetersChange,
    handleThemesChange,
    handleInputChange,
    handleKeyDown,
    toggleFilters,
    handleSearchTypeChange,
    resetAllStates,
  } = useSearch();

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
                  searchType === 'poems'
                    ? SEARCH_TEXTS.poemsSearchPlaceholder
                    : SEARCH_TEXTS.poetsSearchPlaceholder
                }
                searchLabel={SEARCH_TEXTS.search}
                inputValue={inputValue}
                validationError={validationError}
                handleKeyDown={handleKeyDown}
                handleInputChange={handleInputChange}
                resetAllStates={resetAllStates}
                hasQuery={hasQuery}
              />
              <div className="flex items-center justify-between">
                <FiltersButton toggleFilters={toggleFilters} filtersVisible={filtersVisible} />

                <FilterBadges
                  erasCount={getBadgeCount(selectedEras.length || 0, ERAS_NOUN_FORMS)}
                  metersCount={getBadgeCount(selectedMeters.length || 0, METERS_NOUN_FORMS)}
                  themesCount={getBadgeCount(selectedThemes.length || 0, THEMES_NOUN_FORMS)}
                  rhymesCount={getBadgeCount(selectedRhymes.length || 0, RHYMES_NOUN_FORMS)}
                  selectedErasLength={selectedEras.length}
                  selectedMetersLength={selectedMeters.length}
                  selectedRhymesLength={selectedRhymes.length}
                  selectedThemesLength={selectedThemes.length}
                />
              </div>

              {filtersVisible && (
                <Filters
                  filters={{
                    searchType: {
                      value: searchParams.search_type,
                      options: searchTypeOptions,
                      onChange: handleSearchTypeChange,
                    },
                    matchType: {
                      value: searchParams.match_type,
                      options: matchTypeOptions,
                      onChange: handleMatchTypeChange,
                    },
                    eras: {
                      selected: selectedEras,
                      options: erasOptions,
                      onChange: handleErasChange,
                    },
                    meters: {
                      selected: selectedMeters,
                      options: metersOptions,
                      onChange: handleMetersChange,
                    },
                    themes: {
                      selected: selectedThemes,
                      options: themesOptions,
                      onChange: handleThemesChange,
                    },
                    rhymes: {
                      selected: selectedRhymes,
                      options: rhymesOptions,
                      onChange: handleRhymesChange,
                    },
                  }}
                  isPoemsMode={searchType === 'poems'}
                  hasText={hasText}
                  hasInputText={hasInputText}
                />
              )}
            </div>
          </div>
        </Card>

        <ResultList
          data={data}
          loadMoreRef={loadMoreRef}
          isError={isError}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          isSuccess={isSuccess}
          hasText={hasText}
          hasFilters={hasFilters}
          searchType={searchType}
          errorMessage={SEARCH_TEXTS.errorMessage}
          refreshText={SEARCH_TEXTS.refreshThePage}
          noResultsText={getNoResultsText({ hasText, query: searchParams.q || '' })}
          resultText={getResultText({
            count: totalResults,
            query: searchParams.q || '',
            searchType,
            matchType,
            hasText,
          })}
        />
      </div>
    </section>
  );
}
