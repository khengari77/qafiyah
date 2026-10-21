'use client';

import { Check, Link2, Share2, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';

import { PoemSelectionShare } from '@/components/poem-selection-share';
import { IconButton } from '@/components/ui/icon-button';
import { captureEvent } from '@/lib/analytics/capture-event';
import { SITE_URL } from '@/lib/constants/config';
import {
  formatPoemShareBody,
  POEM_SELECTION_SHARE_TEXTS,
  SHARE_BAR_TEXTS,
  SHARE_BUTTON_TEXTS,
} from '@/lib/constants/copy';
import { shareIntent, type ShareNetwork } from '@/lib/urls';
import { cn } from '@/lib/utils';

import type { PoemCopy } from '@/components/poem-copy';

type ShareBarProps = {
  readonly title: string;
  readonly path: string;
  readonly className?: string;
};

type ShareLink = {
  readonly network: ShareNetwork;
  readonly label: string;
  readonly iconPath: string;
};

const SHARE_LINKS: readonly ShareLink[] = [
  {
    network: 'x',
    label: SHARE_BAR_TEXTS.x,
    iconPath:
      'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z',
  },
  {
    network: 'whatsapp',
    label: SHARE_BAR_TEXTS.whatsapp,
    iconPath:
      'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
  },
  {
    network: 'facebook',
    label: SHARE_BAR_TEXTS.facebook,
    iconPath:
      'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  },
  {
    network: 'telegram',
    label: SHARE_BAR_TEXTS.telegram,
    iconPath:
      'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
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
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={ICON}
    >
      <path d={iconPath} />
    </svg>
  );
}

function CopyButton({
  text,
  label,
  copiedLabel,
  icon,
}: {
  readonly text: string;
  readonly label: string;
  readonly copiedLabel: string;
  readonly icon: ReactNode;
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
        text={url}
        label={SHARE_BAR_TEXTS.copyLink}
        copiedLabel={SHARE_BAR_TEXTS.copied}
        icon={<Link2 className={ICON} strokeWidth={ICON_STROKE} />}
      />
    </div>
  );
}

type ShareButtonProps = {
  readonly poetName: string;
  readonly verses: readonly (readonly string[])[];
  readonly poemRef: RefObject<HTMLElement | null>;
  readonly canonicalUrl: string;
  readonly path: string;
};

export function ShareButton({ poetName, verses, path, poemRef, canonicalUrl }: ShareButtonProps) {
  const [selectedPoem, setSelectedPoem] = useState<PoemCopy | null>(null);
  const [hasShareFailed, setHasShareFailed] = useState(false);
  const isSharingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const url = selectedPoem?.url ?? `${SITE_URL}${path}`;
  const body = selectedPoem?.text ?? formatPoemShareBody(verses, poetName);
  const shareText = selectedPoem?.text ?? `${body}\n\n${url}`;
  const handleSelectionShare = async (copy: PoemCopy) => {
    if (isSharingRef.current) return;
    const { text } = copy;
    setSelectedPoem(copy);
    setHasShareFailed(false);
    if (typeof navigator.share === 'function') {
      isSharingRef.current = true;
      try {
        if (typeof navigator.canShare !== 'function' || navigator.canShare({ text })) {
          await navigator.share({ text });
          return;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setHasShareFailed(true);
      } finally {
        isSharingRef.current = false;
      }
    }
    dialogRef.current?.showModal();
  };

  return (
    <>
      <IconButton
        onClick={() => {
          setSelectedPoem(null);
          setHasShareFailed(false);
          dialogRef.current?.showModal();
        }}
        aria-haspopup="dialog"
        aria-label={SHARE_BUTTON_TEXTS.open}
        className={DIMMED}
      >
        <Share2 className={ICON} strokeWidth={ICON_STROKE} />
      </IconButton>
      <PoemSelectionShare
        poemRef={poemRef}
        poetName={poetName}
        canonicalUrl={canonicalUrl}
        dialogRef={dialogRef}
        onShare={(copy) => {
          void handleSelectionShare(copy);
        }}
      />
      <dialog
        ref={dialogRef}
        onPointerDown={(event) => {
          if (
            selectedPoem !== null &&
            event.target instanceof Element &&
            event.target.closest('button, a') !== null
          ) {
            event.preventDefault();
          }
        }}
        aria-labelledby={titleId}
        className="m-auto w-[min(20rem,calc(100vw-2rem))] rounded-md border border-border bg-surface-raised p-4 text-text shadow-xl backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-sm text-text-subtle">
            {selectedPoem === null ? SHARE_BUTTON_TEXTS.label : POEM_SELECTION_SHARE_TEXTS.title}
          </h2>
          <form method="dialog">
            <IconButton type="submit" aria-label={SHARE_BUTTON_TEXTS.close} className="-me-3">
              <X className={ICON} strokeWidth={ICON_STROKE} />
            </IconButton>
          </form>
        </div>
        {hasShareFailed && (
          <p role="alert" className="mt-2 text-sm text-text-muted">
            {POEM_SELECTION_SHARE_TEXTS.shareFailed}
          </p>
        )}
        <div className="mt-2 flex items-start justify-between">
          {SHARE_LINKS.map((link) => (
            <a
              key={link.network}
              href={shareIntent(link.network, { body, url, text: shareText })}
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
            text={url}
            label={SHARE_BUTTON_TEXTS.copyLink}
            copiedLabel={SHARE_BUTTON_TEXTS.copiedLink}
            icon={<Link2 className={ICON} strokeWidth={ICON_STROKE} />}
          />
        </div>
      </dialog>
    </>
  );
}
