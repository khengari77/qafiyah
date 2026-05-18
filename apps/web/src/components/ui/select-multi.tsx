'use client';

import { type ArabicNounForms, formatArabicCount } from 'arabic-count-format';
import { Check, ChevronDown, X } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SelectOption } from '@/constants';
import { cn } from '@/lib/utils';

type Props = {
  readonly options: readonly SelectOption[];
  readonly value: string | readonly string[];
  readonly onChange: (value: string | string[]) => void;
  readonly placeholderNounForms: ArabicNounForms;
  readonly placeholder: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly multiple?: boolean;
};

export function SelectMulti({
  options,
  value,
  onChange,
  placeholderNounForms,
  placeholder,
  disabled = false,
  className,
  multiple = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedValues = useMemo(() => (Array.isArray(value) ? value : [value]), [value]);

  const toggleOpen = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  };

  const toggleOption = useCallback(
    (option: SelectOption) => {
      if (multiple) {
        if (selectedValues.includes(option.value)) {
          onChange(selectedValues.filter((v) => v !== option.value));
        } else {
          onChange([...selectedValues, option.value]);
        }
      } else {
        onChange(option.value);
        setIsOpen(false);
      }
    },
    [multiple, onChange, selectedValues]
  );

  const clearSelection = (e?: React.SyntheticEvent) => {
    e?.stopPropagation();
    onChange(multiple ? [] : '');
  };

  const getDisplayValue = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find((o) => o.value === selectedValues[0]);
      return option?.label || placeholder;
    }
    return formatArabicCount({ count: selectedValues.length, nounForms: placeholderNounForms });
  };

  // Click outside to close
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

  // Keyboard navigation
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
          if (options[highlightedIndex] !== undefined) toggleOption(options[highlightedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, options, highlightedIndex, toggleOption]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full min-w-[180px]', className)}
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
      aria-controls={listboxId}
    >
      <div
        role="button"
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
        tabIndex={disabled ? -1 : 0}
        aria-label="Checkbox select input"
      >
        <div className="flex w-full items-center justify-between">
          <span className={cn(selectedValues.length === 0 && 'text-zinc-600')}>
            {getDisplayValue()}
          </span>
          <div className="flex items-center">
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className="mr-1 rounded-full p-1 hover:bg-muted"
                aria-label="Clear selection"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <ul
          id={listboxId}
          className={cn(
            'absolute z-50 w-full overflow-auto rounded-lg bg-white p-2 shadow-xs shadow-zinc-300 ring-1 ring-zinc-300',
            'max-h-60 focus:outline-none'
          )}
          role="listbox"
          aria-multiselectable={multiple}
          aria-activedescendant={`option-${highlightedIndex}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            marginTop: '0.25rem',
            overflowY: 'auto',
          }}
        >
          {[...options]
            .sort((a, b) => a.label.localeCompare(b.label, 'ar'))
            .map((option, index) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <li
                  key={option.value}
                  id={`option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'cursor-pointer rounded-md px-0.5 py-2 text-base',
                    index === highlightedIndex && 'bg-zinc-50 font-medium ring-1 ring-zinc-300/60',
                    isSelected && 'font-medium'
                  )}
                  onClick={() => toggleOption(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        'mr-4 flex h-4 w-4 items-center justify-center rounded border bg-white',
                        multiple ? 'rounded' : 'rounded-full',
                        isSelected ? 'border-zinc-950 bg-zinc-900' : 'border-zinc-300'
                      )}
                    >
                      {isSelected &&
                        (multiple ? (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                        ))}
                    </div>
                    <span>{option.label}</span>
                  </div>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
