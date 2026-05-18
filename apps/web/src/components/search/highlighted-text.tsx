'use client';

import { Fragment } from 'react';
import { cn } from '@/lib/utils';

const MARK_SPLIT_REGEX = /<\/?mark>/;

type Props = {
  readonly text: string;
  readonly className?: string;
};

export function HighlightedText({ text, className = '' }: Props) {
  const parts = text.split(MARK_SPLIT_REGEX);

  const processedParts = parts.map((part, index) => {
    const isHighlighted = index % 2 === 1;

    const segments = part.split('*');

    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: parts come from a stable text split, order is fixed and content can repeat
      <Fragment key={`part-${index}-${part.slice(0, 10)}`}>
        {segments.map((segment, segIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: segment order within a part is fixed by the source string
          <Fragment key={`seg-${index}-${segIndex}-${segment.slice(0, 5)}`}>
            {segIndex > 0 && <span className="mx-1 inline-block py-1 text-zinc-400">{'—'}</span>}
            {isHighlighted ? (
              <span className="py-1 font-medium text-red-400">{segment}</span>
            ) : (
              <span className="py-1">{segment}</span>
            )}
          </Fragment>
        ))}
      </Fragment>
    );
  });

  return (
    <div className={cn(className)} dir="rtl" style={{ userSelect: 'text' }}>
      {processedParts}
    </div>
  );
}
