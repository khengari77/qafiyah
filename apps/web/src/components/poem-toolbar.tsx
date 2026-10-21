'use client';

import {
  Check,
  Copy,
  Eraser,
  ListChevronsDownUp,
  ListChevronsUpDown,
  Minus,
  Plus,
  SunMoon,
  Type,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { IconButton } from '@/components/ui/icon-button';
import { captureEvent } from '@/lib/analytics/capture-event';
import { POEM_TOOLBAR_TEXTS } from '@/lib/constants/copy';
import { POEM_SCALE, stepScale } from '@/lib/poem-scale';
import { cycleFontFamily } from '@/lib/settings/font-actions';
import { toggleTheme } from '@/lib/settings/theme-actions';
import { cn } from '@/lib/utils';

const DIMMED = 'opacity-75 transition hover:opacity-100';
const TOOL = cn(DIMMED, 'min-w-9 sm:min-w-11');
const STEP_BUTTON = cn(TOOL, 'aria-disabled:pointer-events-none aria-disabled:opacity-50');
const ICON = 'size-5';
const ICON_STROKE = 1.5;
const COPY_STATUS_MS = { copied: 2000, failed: 5000 } as const;

type CopyStatus = 'idle' | keyof typeof COPY_STATUS_MS;

function CopyPoemButton({ text }: { readonly text: string }) {
  const [status, setStatus] = useState<CopyStatus>('idle');
  useEffect(() => {
    if (status === 'idle') return;
    const timeout = window.setTimeout(() => setStatus('idle'), COPY_STATUS_MS[status]);
    return () => window.clearTimeout(timeout);
  }, [status]);
  const statusText = {
    idle: '',
    copied: POEM_TOOLBAR_TEXTS.poemCopied,
    failed: POEM_TOOLBAR_TEXTS.copyFailed,
  }[status];
  const handleCopy = async () => {
    setStatus('idle');
    try {
      await navigator.clipboard.writeText(text);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  };
  return (
    <div className="relative">
      <IconButton
        onClick={() => {
          void handleCopy();
        }}
        aria-label={
          status === 'copied' ? POEM_TOOLBAR_TEXTS.poemCopied : POEM_TOOLBAR_TEXTS.copyPoem
        }
        className={TOOL}
      >
        {status === 'copied' ? (
          <Check className={ICON} strokeWidth={ICON_STROKE} />
        ) : (
          <Copy className={ICON} strokeWidth={ICON_STROKE} />
        )}
      </IconButton>
      <span
        role="status"
        className={
          status === 'failed'
            ? 'absolute start-0 top-full z-10 rounded-md bg-surface-raised px-2 py-1 text-xs whitespace-nowrap text-text shadow'
            : 'sr-only'
        }
      >
        {statusText}
      </span>
    </div>
  );
}

type PoemToolbarProps = {
  readonly fontScale: number;
  readonly spacingScale: number;
  readonly spacingMin: number;
  readonly showTashkeel: boolean;
  readonly copyText: string;
  readonly onFontScaleChange: (scale: number) => void;
  readonly onSpacingScaleChange: (scale: number) => void;
  readonly onToggleTashkeel: () => void;
  readonly children?: ReactNode;
};

export function PoemToolbar({
  fontScale,
  spacingScale,
  spacingMin,
  showTashkeel,
  copyText,
  onFontScaleChange,
  onSpacingScaleChange,
  onToggleTashkeel,
  children,
}: PoemToolbarProps) {
  const spacingRange = { ...POEM_SCALE.spacing, min: spacingMin };
  const stepFontScale = (direction: 1 | -1) => {
    const next = stepScale(fontScale, direction, POEM_SCALE.font);
    if (next === fontScale) return;
    onFontScaleChange(next);
    captureEvent('setting_changed', { setting: 'poem_font_scale', value: next });
  };
  const stepSpacingScale = (direction: 1 | -1) => {
    const next = stepScale(spacingScale, direction, spacingRange);
    if (next === spacingScale) return;
    onSpacingScaleChange(next);
    captureEvent('setting_changed', { setting: 'poem_spacing_scale', value: next });
  };
  return (
    <div
      role="group"
      aria-label={POEM_TOOLBAR_TEXTS.label}
      className="flex flex-wrap items-center justify-center select-none"
    >
      <CopyPoemButton text={copyText} />
      {children}
      <IconButton
        onClick={() => stepFontScale(1)}
        aria-disabled={fontScale >= POEM_SCALE.font.max}
        aria-label={POEM_TOOLBAR_TEXTS.fontSizeIncrease}
        className={STEP_BUTTON}
      >
        <Plus className={ICON} strokeWidth={ICON_STROKE} />
      </IconButton>
      <IconButton
        onClick={() => stepFontScale(-1)}
        aria-disabled={fontScale <= POEM_SCALE.font.min}
        aria-label={POEM_TOOLBAR_TEXTS.fontSizeDecrease}
        className={STEP_BUTTON}
      >
        <Minus className={ICON} strokeWidth={ICON_STROKE} />
      </IconButton>
      <IconButton
        onClick={() => stepSpacingScale(-1)}
        aria-disabled={spacingScale <= spacingMin}
        aria-label={POEM_TOOLBAR_TEXTS.spacingDecrease}
        className={STEP_BUTTON}
      >
        <ListChevronsDownUp className={ICON} strokeWidth={ICON_STROKE} />
      </IconButton>
      <IconButton
        onClick={() => stepSpacingScale(1)}
        aria-disabled={spacingScale >= POEM_SCALE.spacing.max}
        aria-label={POEM_TOOLBAR_TEXTS.spacingIncrease}
        className={STEP_BUTTON}
      >
        <ListChevronsUpDown className={ICON} strokeWidth={ICON_STROKE} />
      </IconButton>
      <button
        type="button"
        aria-pressed={!showTashkeel}
        aria-label={POEM_TOOLBAR_TEXTS.hideTashkeel}
        onClick={onToggleTashkeel}
        className={cn(
          'inline-flex min-h-11 min-w-9 items-center justify-center rounded-md focus-ring hover:text-text sm:min-w-11',
          showTashkeel ? cn('text-text-subtle', DIMMED) : 'bg-surface-sunken text-text-muted'
        )}
      >
        <Eraser className={ICON} strokeWidth={ICON_STROKE} />
      </button>
      <IconButton
        onClick={toggleTheme}
        aria-label={POEM_TOOLBAR_TEXTS.toggleTheme}
        className={TOOL}
      >
        <SunMoon className={ICON} strokeWidth={ICON_STROKE} />
      </IconButton>
      <IconButton
        onClick={cycleFontFamily}
        aria-label={POEM_TOOLBAR_TEXTS.cycleFontFamily}
        className={TOOL}
      >
        <Type className={ICON} strokeWidth={ICON_STROKE} />
      </IconButton>
    </div>
  );
}
