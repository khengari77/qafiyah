'use client';

import { CircleX } from 'lucide-react';
import type { ChangeEventHandler, KeyboardEventHandler } from 'react';
import { Input } from '@/components/shadcn/input';
import { cn } from '@/lib/utils';

type Props = {
  hasSubmitted: boolean;
  inputValue: string;
  validationError: string | null;
  searchLabel: string;
  handleKeyDown: KeyboardEventHandler<HTMLInputElement>;
  handleInputChange: ChangeEventHandler<HTMLInputElement>;
  resetAllStates: () => void;
  hasQuery: boolean;
  placeholder: string;
};

export function SearchInput({
  hasSubmitted,
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
      <div tabIndex={-1} className={cn('mb-2 h-4 flex justify-between items-center')}>
        {validationError && hasSubmitted && (
          <p tabIndex={-1} className={cn('text-red-500 text-xs md:text-base text-right')}>
            {validationError}
          </p>
        )}
      </div>
      <div tabIndex={-1} className="relative">
        <Input
          tabIndex={0}
          placeholder={placeholder}
          maxLength={50}
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
            'pl-10 text-right h-12 border-0 ring-1 ring-zinc-300/40 shadow-none focus:border-0 focus:ring-0 focus-visible:ring-zinc-800/40 focus-within:ring md:text-lg placeholder:text-zinc-800/50 bg-white rounded-xl',
            {
              'ring-red-300 ring-1 focus-within:ring-red-300 focus-within:ring-1 focus-visible:ring-red-300':
                validationError && hasSubmitted,
            }
          )}
          dir="rtl"
        />
        <div
          tabIndex={-1}
          className="bg-white pr-2 absolute left-3 top-1/2 -translate-y-1/2 flex items-center h-full"
        >
          {hasQuery && (
            <button
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
