import { Loader2 } from 'lucide-react';
import type { Ref } from 'react';
import { match } from 'ts-pattern';
import type { FetchStatus } from './hooks/use-search';
import { PoemCard, PoetCard } from './result-cards';
import { ErrorState } from './state-error';
import { LoadingState } from './state-loading';
import { NoResultsState } from './state-no-results';

type Props = {
  readonly status: FetchStatus;
  readonly loadMoreRef: Ref<HTMLDivElement>;
  readonly hasText: boolean;
  readonly hasFilters: boolean;
  readonly searchType: string;
  readonly errorMessage: string;
  readonly refreshText: string;
  readonly noResultsText: string;
  readonly resultText: string;
};

export function ResultList({
  status,
  loadMoreRef,
  hasText,
  hasFilters,
  errorMessage,
  refreshText,
  noResultsText,
  resultText,
}: Props) {
  return match(status)
    .with({ kind: 'error' }, () => (
      <ErrorState errorMessage={errorMessage} refreshText={refreshText} />
    ))
    .with({ kind: 'idle' }, () => null)
    .with({ kind: 'loading' }, () => <LoadingState />)
    .with({ kind: 'success' }, { kind: 'success-fetching-more' }, (s) => {
      const isQuerying = hasText || hasFilters;
      const isFetchingMore = s.kind === 'success-fetching-more';

      if (isQuerying && s.data.length === 0) {
        return <NoResultsState noResultsText={noResultsText} />;
      }

      return (
        <div className="space-y-3">
          {s.data.length > 0 && (
            <div className="w-full flex justify-start items-start">
              <span className="">
                <p className="text-sm md:text-base font-normal text-zinc-700">{resultText}</p>
              </span>
            </div>
          )}

          {s.data.map((item) =>
            match(item)
              .with({ type: 'poem' }, (poem) => (
                <PoemCard key={`${poem.slug}-${poem.relevance}`} item={poem} />
              ))
              .with({ type: 'poet' }, (poet) => (
                <PoetCard key={`${poet.slug}-${poet.relevance}`} item={poet} />
              ))
              .exhaustive()
          )}

          {s.data.length > 0 && (
            <div ref={loadMoreRef} className="h-32 flex justify-center items-center">
              {isFetchingMore && <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />}
            </div>
          )}
        </div>
      );
    })
    .exhaustive();
}
