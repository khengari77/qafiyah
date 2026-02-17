import type { ArabicNounForms } from 'arabic-count-format';
import { Loader2, SearchIcon } from 'lucide-react';
import { SelectMulti } from '@/components/ui/select-multi';
import { SelectSingle } from '@/components/ui/select-single';
import { BinaryToggleButton } from '@/components/ui/toggle-button';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

type Props = {
  searchTypeLabel: string;
  searchTypeOptions: [SelectOption, SelectOption];
  searchParamsSearchType: string;
  handleSearchTypeChange: (value: string) => void;
  searchTypePlaceholder: string;
  matchTypeLabel: string;
  matchTypeOptions: SelectOption[];
  searchParamsMatchType: string;
  handleMatchTypeChange: (value: string) => void;
  erasLabel: string;
  erasOptions: SelectOption[];
  selectedEras: string[];
  erasPlaceholderNounForms: ArabicNounForms;
  handleErasChange: (value: string | string[]) => void;
  erasPlaceholder: string;
  searchType: string;
  metersLabel: string;
  metersOptions: SelectOption[];
  selectedMeters: string[];
  metersPlaceholderNounForms: ArabicNounForms;
  handleMetersChange: (value: string | string[]) => void;
  metersPlaceholder: string;
  themesLabel: string;
  themesOptions: SelectOption[];
  selectedThemes: string[];
  themesPlaceholderNounForms: ArabicNounForms;
  handleThemesChange: (value: string | string[]) => void;
  themesPlaceholder: string;
  rhymesLabel: string;
  rhymesOptions: SelectOption[];
  selectedRhymes: string[];
  rhymesPlaceholderNounForms: ArabicNounForms;
  handleRhymesChange: (value: string | string[]) => void;
  rhymesPlaceholder: string;
  handleSearch: () => void;
  inputValue: string;
  isLoading: boolean;
  searchLabel: string;
};

export function Filters({
  searchTypeLabel,
  searchTypeOptions,
  searchParamsSearchType,
  handleSearchTypeChange,
  searchTypePlaceholder,
  matchTypeLabel,
  matchTypeOptions,
  searchParamsMatchType,
  handleMatchTypeChange,
  erasLabel,
  erasOptions,
  selectedEras,
  erasPlaceholderNounForms,
  handleErasChange,
  erasPlaceholder,
  searchType,
  metersLabel,
  metersOptions,
  selectedMeters,
  metersPlaceholderNounForms,
  handleMetersChange,
  metersPlaceholder,
  themesLabel,
  themesOptions,
  selectedThemes,
  themesPlaceholderNounForms,
  handleThemesChange,
  themesPlaceholder,
  rhymesLabel,
  rhymesOptions,
  selectedRhymes,
  rhymesPlaceholderNounForms,
  handleRhymesChange,
  rhymesPlaceholder,
  handleSearch,
  inputValue,
  isLoading,
  searchLabel,
}: Props) {
  return (
    <div className="px-8 py-10 lg:px-10 lg:py-10 gap-14 bg-white rounded-xl border border-zinc-300/40 relative flex flex-between flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 lg:gap-10 w-full h-full flex-1">
        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block text-base font-bold text-zinc-700">{searchTypeLabel}</p>
          <BinaryToggleButton
            currentValue={searchParamsSearchType}
            onToggle={handleSearchTypeChange}
            options={searchTypeOptions}
          />
        </div>

        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block text-base font-bold text-zinc-700">{matchTypeLabel}</p>
          <SelectSingle
            options={matchTypeOptions}
            value={searchParamsMatchType}
            onChange={handleMatchTypeChange}
            placeholder={searchTypePlaceholder}
          />
        </div>

        <div className="flex flex-col items-start justify-start gap-2">
          <p className="block text-base font-bold text-zinc-700">{erasLabel}</p>
          <SelectMulti
            options={erasOptions}
            value={selectedEras}
            placeholderNounForms={erasPlaceholderNounForms}
            onChange={handleErasChange}
            placeholder={erasPlaceholder}
            multiple={true}
          />
        </div>

        {searchType === 'poems' && (
          <>
            <div className="flex flex-col items-start justify-start gap-2">
              <p className="block text-base font-bold text-zinc-700">{metersLabel}</p>
              <SelectMulti
                options={metersOptions}
                value={selectedMeters}
                placeholderNounForms={metersPlaceholderNounForms}
                onChange={handleMetersChange}
                placeholder={metersPlaceholder}
                multiple={true}
              />
            </div>

            <div className="flex flex-col items-start justify-start gap-2">
              <p className="block text-base font-bold text-zinc-700">{themesLabel}</p>
              <SelectMulti
                options={themesOptions}
                value={selectedThemes}
                placeholderNounForms={themesPlaceholderNounForms}
                onChange={handleThemesChange}
                placeholder={themesPlaceholder}
                multiple={true}
              />
            </div>

            <div className="flex flex-col items-start justify-start gap-2">
              <p className="block text-base font-bold text-zinc-700">{rhymesLabel}</p>
              <SelectMulti
                options={rhymesOptions}
                value={selectedRhymes}
                placeholderNounForms={rhymesPlaceholderNounForms}
                onChange={handleRhymesChange}
                placeholder={rhymesPlaceholder}
                multiple={true}
              />
            </div>
          </>
        )}
      </div>
      {/* --------------------------------------- */}
      <div className="pb-6">
        <button
          onClick={handleSearch}
          disabled={isLoading || !inputValue.trim()}
          className={cn(
            'hover:text-white disabled:cursor-not-allowed disabled:pointer-events-none w-full justify-center items-center h-12 rounded-lg flex duration-300',
            isLoading || !inputValue.trim()
              ? 'bg-zinc-100/80 text-zinc-600 ring-1 ring-zinc-300/40'
              : 'bg-zinc-800 text-zinc-50 ring-1 ring-zinc-300/40'
          )}
          aria-label={searchLabel}
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
