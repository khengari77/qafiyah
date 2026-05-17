import { Frown, Loader2, SearchIcon } from 'lucide-react';
import type { Ref } from 'react';
import { match } from 'ts-pattern';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_URL } from '@/constants';
import { PoemCard, PoetCard } from './result-cards';
import type { FetchStatus } from './use-search';

function LoadingState() {
  return (
    <div className="flex justify-center p-6">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );
}

function NoResultsState({ noResultsText }: { readonly noResultsText: string }) {
  return (
    <Card className="border-zinc-300/50 bg-zinc-50 shadow-none">
      <CardContent className="flex flex-col items-center justify-center p-8 text-zinc-500/90">
        <SearchIcon className="h-10 w-10 mb-3 text-zinc-500/90" />
        <p className="text-base text-center">{noResultsText}</p>
      </CardContent>
    </Card>
  );
}

function ErrorState({
  errorMessage,
  refreshText,
}: {
  readonly errorMessage: string;
  readonly refreshText: string;
}) {
  return (
    <Card className="border-red-100 bg-red-50/80 shadow-none flex justify-center items-center flex-col py-8 gap-4">
      <Frown className="w-16 h-16 text-red-600" />
      <p className="text-red-600 text-sm md:text-base font-bold text-center w-9/12">
        {errorMessage}
      </p>
      <Button
        asChild
        variant="outline"
        className="border-red-200 mt-8 hover:bg-red-100 hover:text-red-700 text-red-600 text-xs md:text-sm"
        size="sm"
      >
        <a href={SITE_URL}>{refreshText}</a>
      </Button>
    </Card>
  );
}

type Props = {
  readonly status: FetchStatus;
  readonly loadMoreRef: Ref<HTMLDivElement>;
  readonly hasText: boolean;
  readonly hasFilters: boolean;
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
