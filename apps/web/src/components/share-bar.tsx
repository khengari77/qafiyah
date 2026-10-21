'use client';

import { Check, Copy, Share2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { IconButton } from '@/components/ui/icon-button';
import { captureEvent } from '@/lib/analytics/capture-event';
import { SITE_URL } from '@/lib/constants/config';
import {
  formatPoemText,
  SHARE_BAR_TEXTS,
  SHARE_BUTTON_TEXTS,
  SHARE_NETWORK_NAMES,
} from '@/lib/constants/copy';
import { shareIntent, type ShareNetwork } from '@/lib/urls';
import { cn } from '@/lib/utils';

type ShareBarProps = {
  readonly title: string;
  readonly path: string;
  readonly className?: string;
};

type ShareLink = {
  readonly network: ShareNetwork;
  readonly label: string;
  readonly name: string;
  readonly iconPath: string;
};

const SHARE_LINKS: readonly ShareLink[] = [
  {
    network: 'telegram',
    label: SHARE_BAR_TEXTS.telegram,
    name: SHARE_NETWORK_NAMES.telegram,
    iconPath: 'M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4',
  },
  {
    network: 'whatsapp',
    label: SHARE_BAR_TEXTS.whatsapp,
    name: SHARE_NETWORK_NAMES.whatsapp,
    iconPath:
      'M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9 M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1',
  },
  {
    network: 'facebook',
    label: SHARE_BAR_TEXTS.facebook,
    name: SHARE_NETWORK_NAMES.facebook,
    iconPath: 'M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3',
  },
  {
    network: 'x',
    label: SHARE_BAR_TEXTS.x,
    name: SHARE_NETWORK_NAMES.x,
    iconPath:
      'M4 4l11.733 16h4.267l-11.733 -16l-4.267 0 M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772',
  },
];

const ICON = 'size-5';
const ICON_STROKE = 1.5;
const DIMMED = 'opacity-75 transition hover:opacity-100';
const LINK_CLASS =
  'inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-subtle transition-colors hover:text-text focus-visible:ring-1 focus-visible:ring-text';

function ShareIcon({ iconPath }: { readonly iconPath: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={ICON}
    >
      <path d={iconPath} />
    </svg>
  );
}

export function CopyButton({
  text,
  label,
  copiedLabel,
  icon,
  className,
}: {
  readonly text: string;
  readonly label: string;
  readonly copiedLabel: string;
  readonly icon: ReactNode;
  readonly className?: string | undefined;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (status !== 'copied') return;
    const timeout = window.setTimeout(() => setStatus('idle'), 2000);
    return () => window.clearTimeout(timeout);
  }, [status]);
  const statusText = { idle: '', copied: copiedLabel, failed: SHARE_BAR_TEXTS.copyFailed }[status];
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
    <div className="flex flex-col items-center">
      <IconButton
        onClick={() => {
          void handleCopy();
        }}
        aria-label={status === 'copied' ? copiedLabel : label}
        className={className}
      >
        {status === 'copied' ? <Check className={ICON} strokeWidth={ICON_STROKE} /> : icon}
      </IconButton>
      <span role="status" className={status === 'failed' ? 'text-xs text-text' : 'sr-only'}>
        {statusText}
      </span>
    </div>
  );
}

export function ShareBar({ title, path, className }: ShareBarProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <div
      role="group"
      aria-label={SHARE_BAR_TEXTS.label}
      className={cn('flex flex-wrap items-center justify-center select-none', className)}
    >
      {SHARE_LINKS.map((link) => (
        <a
          key={link.network}
          href={shareIntent(link.network, { body: title, url })}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className={LINK_CLASS}
          onClick={() => captureEvent('shared', { network: link.network })}
        >
          <ShareIcon iconPath={link.iconPath} />
        </a>
      ))}
      <CopyButton
        text={`${title}\n${url}`}
        label={SHARE_BAR_TEXTS.copy}
        copiedLabel={SHARE_BAR_TEXTS.copied}
        icon={<Copy className={ICON} strokeWidth={ICON_STROKE} />}
      />
    </div>
  );
}

type ShareButtonProps = {
  readonly poetName: string;
  readonly verses: readonly (readonly string[])[];
  readonly path: string;
};

export function ShareButton({ poetName, verses, path }: ShareButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const url = `${SITE_URL}${path}`;
  const body = formatPoemText(verses.slice(0, 1), poetName);

  return (
    <>
      <IconButton
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
        aria-label={SHARE_BUTTON_TEXTS.open}
        className={cn(DIMMED, 'min-w-9 sm:min-w-11')}
      >
        <Share2 className={ICON} strokeWidth={ICON_STROKE} />
      </IconButton>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- a click on the backdrop closes the dialog, because Safari lacks closedby, and Escape already closes it from the keyboard */}
      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        aria-labelledby={titleId}
        className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-3xl bg-surface-raised p-0 text-text shadow-xl backdrop:bg-black/50 motion-safe:transition-[translate,opacity] motion-safe:duration-200 motion-safe:ease-out sm:m-auto sm:w-80 sm:rounded-lg sm:border sm:border-border motion-safe:starting:open:translate-y-full sm:motion-safe:starting:open:translate-y-4 sm:motion-safe:starting:open:opacity-0"
      >
        <div className="pt-2 pb-[env(safe-area-inset-bottom)] sm:pt-0">
          <div
            aria-hidden="true"
            className="mx-auto h-1.5 w-9 rounded-full bg-text-subtle/30 sm:hidden"
          />
          <div className="flex items-center justify-between px-5 py-1 sm:py-2">
            <h2 id={titleId} className="text-text">
              {SHARE_BUTTON_TEXTS.label}
            </h2>
            <form method="dialog">
              <IconButton type="submit" aria-label={SHARE_BUTTON_TEXTS.close} className="-me-3">
                <X className={ICON} strokeWidth={ICON_STROKE} />
              </IconButton>
            </form>
          </div>
          <ul className="flex flex-col px-3 py-2">
            {SHARE_LINKS.map((link) => (
              <li key={link.network}>
                <a
                  href={shareIntent(link.network, { body, url })}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className="flex min-h-12 items-center gap-3 rounded-md px-2 text-text-muted transition-colors hover:bg-surface-sunken hover:text-text focus-visible:ring-1 focus-visible:ring-text"
                  onClick={() => captureEvent('shared', { network: link.network })}
                >
                  <ShareIcon iconPath={link.iconPath} />
                  <span>{link.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
