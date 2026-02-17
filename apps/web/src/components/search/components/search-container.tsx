'use client';

import { Card } from '@/components/base/card';
import {
  erasOptions,
  matchTypeOptions,
  metersOptions,
  rhymesOptions,
  searchTypeOptions,
  themesOptions,
} from '../constants';
import {
  ERAS_NOUN_FORMS,
  getBadgeCount,
  getNoResultsText,
  getResultText,
  METERS_NOUN_FORMS,
  RHYMES_NOUN_FORMS,
  SEARCH_TEXTS,
  THEMES_NOUN_FORMS,
} from '../constants/texts';
import { useSearch } from '../hooks/use-search';
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
    hasSubmitted,
    filtersVisible,
    hasQuery,
    loadMoreRef,
    data,
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
    handleSearch,
    toggleFilters,
    handleSearchTypeChange,
    resetAllStates,
  } = useSearch();

  const totalCount = data?.[0]?.total_count ?? 0;

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
                placeholder={searchType === 'poems' ? 'ابحث في مليون بيت' : 'ابحث عن ديوان شاعر'}
                hasSubmitted={hasSubmitted}
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
                  handleSearch={handleSearch}
                  inputValue={inputValue}
                  isLoading={isLoading}
                  searchLabel={SEARCH_TEXTS.search}
                  searchType={searchType}
                  searchTypeLabel={SEARCH_TEXTS.searchTypeLabel}
                  searchTypeOptions={searchTypeOptions}
                  searchParamsSearchType={searchParams.search_type}
                  handleSearchTypeChange={handleSearchTypeChange}
                  searchTypePlaceholder={SEARCH_TEXTS.searchTypePlaceholder}
                  matchTypeLabel={SEARCH_TEXTS.matchTypeLabel}
                  matchTypeOptions={matchTypeOptions}
                  searchParamsMatchType={searchParams.match_type}
                  handleMatchTypeChange={handleMatchTypeChange}
                  erasLabel={SEARCH_TEXTS.erasLabel}
                  erasOptions={erasOptions}
                  selectedEras={selectedEras}
                  erasPlaceholderNounForms={ERAS_NOUN_FORMS}
                  handleErasChange={handleErasChange}
                  erasPlaceholder={SEARCH_TEXTS.erasPlaceholder}
                  metersLabel={SEARCH_TEXTS.metersLabel}
                  metersOptions={metersOptions}
                  selectedMeters={selectedMeters}
                  metersPlaceholderNounForms={METERS_NOUN_FORMS}
                  handleMetersChange={handleMetersChange}
                  metersPlaceholder={SEARCH_TEXTS.metersPlaceholder}
                  themesLabel={SEARCH_TEXTS.themesLabel}
                  themesOptions={themesOptions}
                  selectedThemes={selectedThemes}
                  themesPlaceholderNounForms={THEMES_NOUN_FORMS}
                  handleThemesChange={handleThemesChange}
                  themesPlaceholder={SEARCH_TEXTS.themesPlaceholder}
                  rhymesLabel={SEARCH_TEXTS.rhymesLabel}
                  rhymesOptions={rhymesOptions}
                  selectedRhymes={selectedRhymes}
                  rhymesPlaceholderNounForms={RHYMES_NOUN_FORMS}
                  handleRhymesChange={handleRhymesChange}
                  rhymesPlaceholder={SEARCH_TEXTS.rhymesPlaceholder}
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
          inputValue={inputValue}
          searchType={searchType}
          errorMessage={SEARCH_TEXTS.errorMessage}
          refreshText={SEARCH_TEXTS.refreshThePage}
          noResultsText={getNoResultsText(searchParams.q || '')}
          resultText={getResultText(totalCount, searchParams.q || '', searchType, matchType)}
        />
      </div>
    </section>
  );
}
