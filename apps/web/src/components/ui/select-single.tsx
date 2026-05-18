'use client';

import { Check, ChevronDown } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { SelectOption } from '@/constants';
import { cn } from '@/lib/utils';

type Props = {
  readonly options: readonly SelectOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
};

export function SelectSingle({
  options,
  value,
  onChange,
  placeholder = 'اختر خيار',
  disabled = false,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedOption = options.find((option) => option.value === value);

  const toggleOpen = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const selectOption = useCallback(
    (option: SelectOption) => {
      if (option.value !== value) {
        onChange(option.value);
      }
      setIsOpen(false);
    },
    [onChange, value]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    // Use mousedown instead of click for better responsiveness
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % options.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (options[highlightedIndex] !== undefined) selectOption(options[highlightedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, highlightedIndex, options, selectOption]);

  // Reset highlighted index when opening
  useEffect(() => {
    if (isOpen) {
      const selectedIndex = options.findIndex((o) => o.value === value);
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [isOpen, value, options]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full min-w-[180px]', className)}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-controls={listboxId}
      tabIndex={-1}
    >
      <div
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-lg border-0 px-3 py-2 text-base text-zinc-600 shadow-none ring-1 ring-zinc-300/40 focus:outline-none focus:ring-1 focus:ring-zinc-300',
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
          { 'ring-2 ring-zinc-300': isOpen }
        )}
        onClick={toggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleOpen();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Select an option"
      >
        <span className={cn(!selectedOption && 'text-zinc-600')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          className={cn(
            'absolute z-50 w-full overflow-auto rounded-lg bg-white p-2 shadow-xs shadow-zinc-300 ring-1 ring-zinc-300',
            'max-h-60 focus:outline-none'
          )}
          role="listbox"
          aria-activedescendant={`option-${highlightedIndex}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            maxHeight: '15rem',
            overflowY: 'auto',
          }}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={`option-${index}`}
              className={cn(
                'flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-base',
                index === highlightedIndex && 'bg-zinc-50 font-medium ring-1 ring-zinc-300/60',
                option.value === value && 'font-medium'
              )}
              onClick={() => selectOption(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={option.value === value}
            >
              <span>{option.label}</span>
              {option.value === value && <Check className="h-4 w-4 text-primary" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
