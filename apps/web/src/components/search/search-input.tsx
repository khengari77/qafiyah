'use client';

import { MAX_QUERY_LENGTH } from '@qafiyah/constants';
import { CircleX } from 'lucide-react';
import type { ChangeEventHandler, KeyboardEventHandler } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  readonly inputValue: string;
  readonly validationError: string | null;
  readonly searchLabel: string;
  readonly handleKeyDown: KeyboardEventHandler<HTMLInputElement>;
  readonly handleInputChange: ChangeEventHandler<HTMLInputElement>;
  readonly resetAllStates: () => void;
  readonly hasQuery: boolean;
  readonly placeholder: string;
};

export function SearchInput({
  inputValue,
  validationError,
  searchLabel,
  handleKeyDown,
  handleInputChange,
  resetAllStates,
  placeholder,
  hasQuery,
}: Props) {
  return (
    <div tabIndex={-1} className="w-full">
      <div tabIndex={-1} className={cn('mb-2 flex h-4 items-center justify-between')}>
        {validationError && (
          <p tabIndex={-1} className={cn('text-right text-red-500 text-xs md:text-base')}>
            {validationError}
          </p>
        )}
      </div>
      <div tabIndex={-1} className="relative">
        <Input
          tabIndex={0}
          placeholder={placeholder}
          maxLength={MAX_QUERY_LENGTH}
          value={inputValue}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          autoSave="off"
          spellCheck={false}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label={searchLabel}
          className={cn(
            'h-12 rounded-xl border-0 bg-white pl-10 text-right shadow-none ring-1 ring-zinc-300/40 placeholder:text-zinc-800/50 focus-within:ring focus:border-0 focus:ring-0 focus-visible:ring-zinc-800/40 md:text-lg',
            {
              'ring-1 ring-red-300 focus-within:ring-1 focus-within:ring-red-300 focus-visible:ring-red-300':
                validationError,
            }
          )}
          dir="rtl"
        />
        <div
          tabIndex={-1}
          className="absolute top-1/2 left-3 flex h-full -translate-y-1/2 items-center bg-white pr-2"
        >
          {hasQuery && (
            <button
              type="button"
              aria-hidden={hasQuery}
              tabIndex={hasQuery ? 0 : -1}
              onClick={resetAllStates}
              className="text-zinc-400 hover:text-zinc-700 focus:outline-none focus-visible:text-zinc-800"
              aria-label="Clear search"
            >
              <CircleX aria-hidden={hasQuery} className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
