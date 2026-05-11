import { Loader2 } from 'lucide-react';
import type { Ref } from 'react';
import type { PoemsSearchResult, PoetsSearchResult } from '@/lib/api/types';
import { PoemCard, PoetCard } from './result-cards';
import { ErrorState } from './state-error';
import { LoadingState } from './state-loading';
import { NoResultsState } from './state-no-results';

type Props = {
  data: (PoemsSearchResult | PoetsSearchResult)[];
  loadMoreRef: Ref<HTMLDivElement>;
  isError: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  inputValue: string;
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
  inputValue,
  searchType,
  errorMessage,
  refreshText,
  noResultsText,
  resultText,
}: Props) {
  if (isError) {
    return <ErrorState errorMessage={errorMessage} refreshText={refreshText} />;
  }

  if (inputValue && !isLoading && data.length === 0 && isSuccess) {
    return <NoResultsState noResultsText={noResultsText} />;
  }

  if (isLoading && !isFetchingNextPage) {
    return <LoadingState />;
  }
  return (
    <div className="space-y-3">
      {/* Tiny Result Counts */}
      {data.length > 0 && (
        <div className="w-full flex justify-start items-start">
          <span className="">
            <p className="text-sm md:text-base font-normal text-zinc-700">{resultText}</p>
          </span>
        </div>
      )}

      {searchType === 'poems' &&
        (data as PoemsSearchResult[]).map((item) => (
          <PoemCard key={`${item.poem_slug}-${item.relevance}`} item={item} />
        ))}

      {searchType === 'poets' &&
        (data as PoetsSearchResult[]).map((item) => (
          <PoetCard key={`${item.poet_slug}-${item.relevance}`} item={item} />
        ))}

      {data.length > 0 && (
        <div ref={loadMoreRef} className="h-32 flex justify-center items-center">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />}
        </div>
      )}
    </div>
  );
}
