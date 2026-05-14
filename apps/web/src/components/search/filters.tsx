import { Loader2, SearchIcon } from 'lucide-react';
import {
  ERAS_NOUN_FORMS,
  METERS_NOUN_FORMS,
  RHYMES_NOUN_FORMS,
  SEARCH_TEXTS,
  THEMES_NOUN_FORMS,
} from '@/components/search/constants/texts';
import { SelectMulti } from '@/components/ui/select-multi';
import { SelectSingle } from '@/components/ui/select-single';
import { BinaryToggleButton } from '@/components/ui/toggle-button';
import { cn } from '@/lib/utils';

type FilterOption = { value: string; label: string };

type Props = {
  filters: {
    searchType: {
      value: string;
      options: [FilterOption, FilterOption];
      onChange: (v: string) => void;
    };
    matchType: { value: string; options: FilterOption[]; onChange: (v: string) => void };
    eras: { selected: string[]; options: FilterOption[]; onChange: (v: string | string[]) => void };
    meters: {
      selected: string[];
      options: FilterOption[];
      onChange: (v: string | string[]) => void;
    };
    themes: {
      selected: string[];
      options: FilterOption[];
      onChange: (v: string | string[]) => void;
    };
    rhymes: {
      selected: string[];
      options: FilterOption[];
      onChange: (v: string | string[]) => void;
    };
  };
  isPoemsMode: boolean;
  onSearch: () => void;
  searchDisabled: boolean;
  isLoading: boolean;
};

export function Filters({ filters, isPoemsMode, onSearch, searchDisabled, isLoading }: Props) {
  return (
    <div className="px-8 py-10 lg:px-10 lg:py-10 gap-14 bg-white rounded-xl border border-zinc-300/40 relative flex flex-between flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 lg:gap-10 w-full h-full flex-1">
        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block text-base font-bold text-zinc-700">{SEARCH_TEXTS.searchTypeLabel}</p>
          <BinaryToggleButton
            currentValue={filters.searchType.value}
            onToggle={filters.searchType.onChange}
            options={filters.searchType.options}
          />
        </div>

        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block text-base font-bold text-zinc-700">{SEARCH_TEXTS.matchTypeLabel}</p>
          <SelectSingle
            options={filters.matchType.options}
            value={filters.matchType.value}
            onChange={filters.matchType.onChange}
            placeholder={SEARCH_TEXTS.searchTypePlaceholder}
          />
        </div>

        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block text-base font-bold text-zinc-700">{SEARCH_TEXTS.erasLabel}</p>
          <SelectMulti
            options={filters.eras.options}
            value={filters.eras.selected}
            placeholderNounForms={ERAS_NOUN_FORMS}
            onChange={filters.eras.onChange}
            placeholder={SEARCH_TEXTS.erasPlaceholder}
            multiple={true}
          />
        </div>

        {isPoemsMode && (
          <>
            <div className="flex flex-col items-start justify-start gap-2">
              <p className="block text-base font-bold text-zinc-700">{SEARCH_TEXTS.metersLabel}</p>
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
              <p className="block text-base font-bold text-zinc-700">{SEARCH_TEXTS.themesLabel}</p>
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
              <p className="block text-base font-bold text-zinc-700">{SEARCH_TEXTS.rhymesLabel}</p>
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
      {/* --------------------------------------- */}
      <div className="pb-6">
        <button
          type="button"
          onClick={onSearch}
          disabled={isLoading || searchDisabled}
          className={cn(
            'hover:text-white disabled:cursor-not-allowed disabled:pointer-events-none w-full justify-center items-center h-12 rounded-lg flex duration-300',
            isLoading || searchDisabled
              ? 'bg-zinc-100/80 text-zinc-600 ring-1 ring-zinc-300/40'
              : 'bg-zinc-800 text-zinc-50 ring-1 ring-zinc-300/40'
          )}
          aria-label={SEARCH_TEXTS.search}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SearchIcon className="h-4 w-4" />
          )}
        </button>
        <div className="absolute bottom-0 left-0 w-full justify-center px-8 items-center flex text-xs sm:text-sm py-4 text-zinc-600">
          {'فرق بين القطع والوصل والتاء المربوطة والهاء'}
        </div>
      </div>
    </div>
  );
}
