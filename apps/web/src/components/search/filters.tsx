import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SelectMulti } from '@/components/ui/select-multi';
import { SelectSingle } from '@/components/ui/select-single';
import {
  ERAS_NOUN_FORMS,
  METERS_NOUN_FORMS,
  RHYMES_NOUN_FORMS,
  SEARCH_TEXTS,
  type SelectOption,
  searchTypeOptions,
  THEMES_NOUN_FORMS,
} from '@/constants';
import { cn } from '@/lib/utils';

type MultiFilter = {
  readonly selected: readonly string[];
  readonly options: readonly SelectOption[];
  readonly onChange: (v: string | string[]) => void;
};

type Props = {
  readonly filters: {
    readonly types: {
      readonly selected: readonly string[];
      readonly onChange: (v: string[]) => void;
    };
    readonly matchType: {
      readonly value: string;
      readonly options: readonly SelectOption[];
      readonly onChange: (v: string) => void;
    };
    readonly eras: MultiFilter;
    readonly meters: MultiFilter;
    readonly themes: MultiFilter;
    readonly rhymes: MultiFilter;
  };
  readonly wantPoems: boolean;
};

function TypesToggle({
  selected,
  onChange,
}: {
  readonly selected: readonly string[];
  readonly onChange: (next: string[]) => void;
}) {
  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    // keep at least one type active
    if (next.length === 0) return;
    onChange([...next]);
  };

  return (
    <div className="flex gap-2">
      {searchTypeOptions.map((option) => {
        const isActive = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              'flex h-10 items-center justify-center rounded-md border-0 px-4 text-base ring-1 transition-colors duration-150 focus:outline-none focus-visible:ring-zinc-800/40',
              isActive
                ? 'bg-zinc-800 text-zinc-50 ring-zinc-800'
                : 'bg-white text-zinc-600 ring-zinc-300/40 hover:bg-zinc-50'
            )}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Filters({ filters, wantPoems }: Props) {
  return (
    <div className="relative flex flex-between flex-col gap-14 rounded-xl border border-zinc-300/40 bg-white px-8 py-10 lg:px-10 lg:py-10">
      <div className="grid h-full w-full flex-1 grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:gap-10">
        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block font-bold text-base text-zinc-700">{SEARCH_TEXTS.searchTypeLabel}</p>
          <TypesToggle selected={filters.types.selected} onChange={filters.types.onChange} />
        </div>

        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block font-bold text-base text-zinc-700">{SEARCH_TEXTS.matchTypeLabel}</p>
          <SelectSingle
            options={filters.matchType.options}
            value={filters.matchType.value}
            onChange={filters.matchType.onChange}
            placeholder={SEARCH_TEXTS.searchTypePlaceholder}
          />
        </div>

        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block font-bold text-base text-zinc-700">{SEARCH_TEXTS.erasLabel}</p>
          <SelectMulti
            options={filters.eras.options}
            value={filters.eras.selected}
            placeholderNounForms={ERAS_NOUN_FORMS}
            onChange={filters.eras.onChange}
            placeholder={SEARCH_TEXTS.erasPlaceholder}
            multiple={true}
          />
        </div>

        {wantPoems && (
          <>
            <div className="flex flex-col items-start justify-start gap-2">
              <p className="block font-bold text-base text-zinc-700">{SEARCH_TEXTS.metersLabel}</p>
              <SelectMulti
                options={filters.meters.options}
                value={filters.meters.selected}
                placeholderNounForms={METERS_NOUN_FORMS}
                onChange={filters.meters.onChange}
                placeholder={SEARCH_TEXTS.metersPlaceholder}
                multiple={true}
              />
            </div>

            <div className="flex flex-col items-start justify-start gap-2">
              <p className="block font-bold text-base text-zinc-700">{SEARCH_TEXTS.themesLabel}</p>
              <SelectMulti
                options={filters.themes.options}
                value={filters.themes.selected}
                placeholderNounForms={THEMES_NOUN_FORMS}
                onChange={filters.themes.onChange}
                placeholder={SEARCH_TEXTS.themesPlaceholder}
                multiple={true}
              />
            </div>

            <div className="flex flex-col items-start justify-start gap-2">
              <p className="block font-bold text-base text-zinc-700">{SEARCH_TEXTS.rhymesLabel}</p>
              <SelectMulti
                options={filters.rhymes.options}
                value={filters.rhymes.selected}
                placeholderNounForms={RHYMES_NOUN_FORMS}
                onChange={filters.rhymes.onChange}
                placeholder={SEARCH_TEXTS.rhymesPlaceholder}
                multiple={true}
              />
            </div>
          </>
        )}
      </div>
      <p className="text-center text-xs text-zinc-600 sm:text-sm">{SEARCH_TEXTS.searchFootnote}</p>
    </div>
  );
}

type FiltersButtonProps = {
  readonly onToggle: () => void;
  readonly filtersVisible: boolean;
};

export function FiltersButton({ onToggle, filtersVisible }: FiltersButtonProps) {
  return (
    <Button
      type="button"
      tabIndex={0}
      variant="default"
      onClick={onToggle}
      className={cn(
        'flex h-12 items-center justify-between gap-6 rounded-xl border-0 px-4 font-normal text-base shadow-none outline-none ring-1 transition-none duration-0',
        filtersVisible
          ? 'bg-white text-zinc-600/80 ring-zinc-300/40 duration-200 hover:bg-white hover:text-zinc-500 focus-visible:ring-zinc-800/40'
          : 'bg-zinc-800 text-zinc-50 ring-zinc-800 hover:bg-zinc-800 hover:text-zinc-50'
      )}
      aria-label={filtersVisible ? 'Collapse filters' : 'Expand filters'}
    >
      <Filter tabIndex={-1} className="h-2 w-2" />
      {filtersVisible ? (
        <ChevronUp tabIndex={-1} className="h-2 w-2" />
      ) : (
        <ChevronDown tabIndex={-1} className="h-2 w-2" />
      )}
    </Button>
  );
}

type FilterBadgesProps = {
  readonly selectedErasLength: number;
  readonly selectedMetersLength: number;
  readonly selectedRhymesLength: number;
  readonly selectedThemesLength: number;
  readonly erasCount: string;
  readonly metersCount: string;
  readonly themesCount: string;
  readonly rhymesCount: string;
};

export function FilterBadges({
  selectedErasLength,
  selectedMetersLength,
  selectedRhymesLength,
  selectedThemesLength,
  erasCount,
  metersCount,
  themesCount,
  rhymesCount,
}: FilterBadgesProps) {
  const badgeClassname = 'text-xs md:text-sm font-normal text-zinc-600 border-zinc-300/50 bg-white';
  return (
    <div tabIndex={-1} className="flex flex-wrap justify-end gap-1">
      {selectedErasLength > 0 && (
        <Badge variant="outline" className={badgeClassname}>
          {erasCount}
        </Badge>
      )}
      {selectedMetersLength > 0 && (
        <Badge variant="outline" className={badgeClassname}>
          {metersCount}
        </Badge>
      )}
      {selectedThemesLength > 0 && (
        <Badge variant="outline" className={badgeClassname}>
          {themesCount}
        </Badge>
      )}
      {selectedRhymesLength > 0 && (
        <Badge variant="outline" className={badgeClassname}>
          {rhymesCount}
        </Badge>
      )}
    </div>
  );
}
