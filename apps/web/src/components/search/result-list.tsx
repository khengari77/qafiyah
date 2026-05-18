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
        <SearchIcon className="mb-3 h-10 w-10 text-zinc-500/90" />
        <p className="text-center text-base">{noResultsText}</p>
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
    <Card className="flex flex-col items-center justify-center gap-4 border-red-100 bg-red-50/80 py-8 shadow-none">
      <Frown className="h-16 w-16 text-red-600" />
      <p className="w-9/12 text-center font-bold text-red-600 text-sm md:text-base">
        {errorMessage}
      </p>
      <Button
        asChild
        variant="outline"
        className="mt-8 border-red-200 text-red-600 text-xs hover:bg-red-100 hover:text-red-700 md:text-sm"
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
  readonly hasCommittedQuery: boolean;
  readonly hasFilters: boolean;
  readonly errorMessage: string;
  readonly refreshText: string;
  readonly noResultsText: string;
  readonly resultText: string;
};

export function ResultList({
  status,
  loadMoreRef,
  hasCommittedQuery,
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
      const isQuerying = hasCommittedQuery || hasFilters;
      const isFetchingMore = s.kind === 'success-fetching-more';

      if (isQuerying && s.data.length === 0) {
        return <NoResultsState noResultsText={noResultsText} />;
      }

      return (
        <div className="space-y-3">
          {s.data.length > 0 && (
            <div className="flex w-full items-start justify-start">
              <span className="">
                <p className="font-normal text-sm text-zinc-700 md:text-base">{resultText}</p>
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
            <div ref={loadMoreRef} className="flex h-32 items-center justify-center">
              {isFetchingMore && <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />}
            </div>
          )}
        </div>
      );
    })
    .exhaustive();
}
