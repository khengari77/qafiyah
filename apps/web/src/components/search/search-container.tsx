'use client';

import { match } from 'ts-pattern';
import {
  getBadgeCount,
  getNoResultsText,
  getSectionResultText,
} from '@/components/search/search-format';
import { useSearch } from '@/components/search/use-search';
import { Card } from '@/components/ui/card';
import {
  COLLECTIONS_NOUN_FORMS,
  collectionsOptions,
  ERAS_NOUN_FORMS,
  erasOptions,
  METERS_NOUN_FORMS,
  matchTypeOptions,
  metersOptions,
  RHYMES_NOUN_FORMS,
  rhymesOptions,
  SEARCH_TEXTS,
  THEMES_NOUN_FORMS,
  themesOptions,
} from '@/constants';
import { FilterBadges, Filters, FiltersButton } from './filters';
import { SearchInput } from './search-input';
import { ErrorState, LoadingState, NoResultsState } from './search-states';
import { SearchSection } from './sections';

export function SearchContainer() {
  const { input, status, sections, flags, selection, handlers } = useSearch();

  const noResultsText = getNoResultsText({
    hasCommittedQuery: flags.hasCommittedQuery,
    query: input.query,
  });

  const poemsResultText = getSectionResultText({
    count: sections.poems.total,
    query: input.query,
    sectionLabel: SEARCH_TEXTS.poemSingular,
    matchType: input.matchType,
    hasCommittedQuery: flags.hasCommittedQuery,
  });

  const poetsResultText = getSectionResultText({
    count: sections.poets.total,
    query: input.query,
    sectionLabel: SEARCH_TEXTS.poetSingular,
    matchType: input.matchType,
    hasCommittedQuery: flags.hasCommittedQuery,
  });

  const placeholder = flags.wantPoems
    ? SEARCH_TEXTS.poemsSearchPlaceholder
    : SEARCH_TEXTS.poetsSearchPlaceholder;

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
                placeholder={placeholder}
                searchLabel={SEARCH_TEXTS.search}
                inputValue={input.inputValue}
                validationError={input.validationError}
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
                  collectionsCount={getBadgeCount(
                    selection.collections.length || 0,
                    COLLECTIONS_NOUN_FORMS
                  )}
                  selectedErasLength={selection.eras.length}
                  selectedMetersLength={selection.meters.length}
                  selectedRhymesLength={selection.rhymes.length}
                  selectedThemesLength={selection.themes.length}
                  selectedCollectionsLength={selection.collections.length}
                />
              </div>

              {flags.filtersVisible && (
                <Filters
                  filters={{
                    types: {
                      selected: input.selectedTypes,
                      onChange: handlers.onTypesChange,
                    },
                    matchType: {
                      value: input.matchType,
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
                    collections: {
                      selected: selection.collections,
                      options: collectionsOptions,
                      onChange: handlers.onCollectionsChange,
                    },
                  }}
                  wantPoems={flags.wantPoems}
                />
              )}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-10">
          {match(status)
            .with({ kind: 'idle' }, () => null)
            .with({ kind: 'loading' }, () => <LoadingState />)
            .with({ kind: 'error' }, () => <ErrorState />)
            .with({ kind: 'empty' }, () => <NoResultsState noResultsText={noResultsText} />)
            .with({ kind: 'results' }, () => (
              <>
                {flags.wantPoems && (
                  <SearchSection
                    title={SEARCH_TEXTS.poemsSectionTitle}
                    items={sections.poems.items}
                    resultText={poemsResultText}
                    isFetchingMore={sections.poems.isFetchingMore}
                    loadMoreRef={sections.poems.loadMoreRef}
                  />
                )}

                {flags.wantPoets && (
                  <SearchSection
                    title={SEARCH_TEXTS.poetsSectionTitle}
                    items={sections.poets.items}
                    resultText={poetsResultText}
                    isFetchingMore={sections.poets.isFetchingMore}
                    loadMoreRef={sections.poets.loadMoreRef}
                  />
                )}
              </>
            ))
            .exhaustive()}
        </div>
      </div>
    </section>
  );
}
