import { Loader2 } from 'lucide-react';
import type { Ref } from 'react';
import type { PoemSearchResult, PoetSearchResult } from '@/lib/api/types';
import { PoemCard, PoetCard } from './result-cards';
import { ErrorState } from './state-error';
import { LoadingState } from './state-loading';
import { NoResultsState } from './state-no-results';

type Props = {
  data: (PoemSearchResult | PoetSearchResult)[];
  loadMoreRef: Ref<HTMLDivElement>;
  isError: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  hasText: boolean;
  hasFilters: boolean;
  searchType: string;
  errorMessage: string;
  refreshText: string;
  noResultsText: string;
  resultText: string;
};

export function ResultList({
  data,
  loadMoreRef,
  isError,
  isFetchingNextPage,
  isLoading,
  isSuccess,
  hasText,
  hasFilters,
  errorMessage,
  refreshText,
  noResultsText,
  resultText,
}: Props) {
  if (isError) {
    return <ErrorState errorMessage={errorMessage} refreshText={refreshText} />;
  }

  const isQuerying = hasText || hasFilters;

  if (isQuerying && !isLoading && data.length === 0 && isSuccess) {
    return <NoResultsState noResultsText={noResultsText} />;
  }

  if (isLoading && !isFetchingNextPage) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-3">
      {data.length > 0 && (
        <div className="w-full flex justify-start items-start">
          <span className="">
            <p className="text-sm md:text-base font-normal text-zinc-700">{resultText}</p>
          </span>
        </div>
      )}

      {data.map((item) =>
        item.type === 'poem' ? (
          <PoemCard key={`${item.slug}-${item.relevance}`} item={item} />
        ) : (
          <PoetCard key={`${item.slug}-${item.relevance}`} item={item} />
        )
      )}

      {data.length > 0 && (
        <div ref={loadMoreRef} className="h-32 flex justify-center items-center">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />}
        </div>
      )}
    </div>
  );
}
