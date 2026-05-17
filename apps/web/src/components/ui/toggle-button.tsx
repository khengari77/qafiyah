'use client';

import type { SelectOption } from '@/constants';
import { cn } from '@/lib/utils';

type Props = {
  readonly options: readonly [SelectOption, SelectOption];
  readonly currentValue: string;
  readonly onToggle: (value: string) => void;
  readonly className?: string;
};

export function BinaryToggleButton({ options, currentValue, onToggle, className }: Props) {
  const [option1, option2] = options;

  const handleToggle = () => {
    const nextOption = options.find((option) => option.value !== currentValue) || option1;
    onToggle(nextOption.value);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'relative w-full flex justify-evenly items-center min-w-[180px] h-12 text-base rounded-md border-0 ring-1 ring-zinc-300/40 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-300/50 overflow-hidden',
        className
      )}
      aria-pressed={currentValue === option2.value}
    >
      {options.map((option) => (
        <ToggleItem
          key={option.value}
          label={option.label}
          isActive={currentValue === option.value}
        />
      ))}
    </button>
  );
}

function ToggleItem({ label, isActive }: { readonly label: string; readonly isActive: boolean }) {
  return (
    <span
      className={cn(
        'flex items-center justify-center w-full h-full text-zinc-600',
        isActive ? 'text-zinc-50 bg-zinc-800' : 'text-zinc-600'
      )}
    >
      {label}
    </span>
  );
}
