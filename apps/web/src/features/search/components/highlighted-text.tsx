'use client';

import { Fragment } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  text: string;
  className?: string;
};

export function HighlightedText({ text, className = '' }: Props) {
  const parts = text.split(/<\/?mark>/);

  const processedParts = parts.map((part, index) => {
    const isHighlighted = index % 2 === 1;

    const segments = part.split('*');

    return (
      <Fragment key={`part-${index}-${part.slice(0, 10)}`}>
        {segments.map((segment, segIndex) => (
          <Fragment key={`part-${index}-seg-${segIndex}-${segment.slice(0, 5)}`}>
            {segIndex > 0 && <span className="inline-block mx-1 py-1 text-zinc-400">{'—'}</span>}
            {isHighlighted ? (
              <span className="text-red-400 font-medium py-1">{segment}</span>
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
