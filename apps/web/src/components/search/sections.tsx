'use client';

import { Loader2 } from 'lucide-react';
import type { Ref } from 'react';
import { match } from 'ts-pattern';
import type { PoemSearchResult, PoetSearchResult } from '@/lib/api/rpc';
import { PoemCard, PoetCard } from './result-cards';

type SectionProps = {
  readonly title: string;
  readonly items: readonly (PoemSearchResult | PoetSearchResult)[];
  readonly resultText: string;
  readonly isFetchingMore: boolean;
  readonly loadMoreRef: Ref<HTMLDivElement>;
};

// Renders one result list. Loading, error, and no-results are handled once, for
// the whole search, by the container — so an empty section renders nothing and
// never doubles up a spinner or message with its sibling.
export function SearchSection({
  title,
  items,
  resultText,
  isFetchingMore,
  loadMoreRef,
}: SectionProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex w-full items-center justify-between">
        <h2 className="font-bold text-base text-zinc-800 md:text-lg">{title}</h2>
        <span>
          <p className="font-normal text-sm text-zinc-700 md:text-base">{resultText}</p>
        </span>
      </div>

      {items.map((item) =>
        match(item)
          .with({ type: 'poem' }, (poem) => (
            <PoemCard key={`${poem.slug}-${poem.relevance}`} item={poem} />
          ))
          .with({ type: 'poet' }, (poet) => (
            <PoetCard key={`${poet.slug}-${poet.relevance}`} item={poet} />
          ))
          .exhaustive()
      )}

      <div ref={loadMoreRef} className="flex h-32 items-center justify-center">
        {isFetchingMore && <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />}
      </div>
    </div>
  );
}
