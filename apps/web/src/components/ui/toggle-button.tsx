'use client';

import type { SelectOption } from '@/constants';
import { cn } from '@/lib/utils';

type Props = {
  readonly options: readonly [SelectOption, SelectOption];
  readonly value: string;
  readonly onToggle: (value: string) => void;
  readonly className?: string;
};

export function BinaryToggleButton({ options, value, onToggle, className }: Props) {
  const [option1, option2] = options;

  const handleToggle = () => {
    const nextOption = options.find((option) => option.value !== value) || option1;
    onToggle(nextOption.value);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        'relative flex h-12 w-full min-w-[180px] items-center justify-evenly overflow-hidden rounded-md border-0 bg-white text-base ring-1 ring-zinc-300/40 focus:outline-none focus:ring-1 focus:ring-zinc-300/50',
        className
      )}
      aria-pressed={value === option2.value}
    >
      {options.map((option) => (
        <ToggleItem key={option.value} label={option.label} isActive={value === option.value} />
      ))}
    </button>
  );
}

function ToggleItem({ label, isActive }: { readonly label: string; readonly isActive: boolean }) {
  return (
    <span
      className={cn(
        'flex h-full w-full items-center justify-center text-zinc-600',
        isActive ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-600'
      )}
    >
      {label}
    </span>
  );
}
