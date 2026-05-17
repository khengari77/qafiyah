import { Frown, Loader2, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_URL } from '@/constants';

export function LoadingState() {
  return (
    <div className="flex justify-center p-6">
      <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );
}

type NoResultsProps = {
  readonly noResultsText: string;
};

export function NoResultsState({ noResultsText }: NoResultsProps) {
  return (
    <Card className="border-zinc-300/50 bg-zinc-50 shadow-none">
      <CardContent className="flex flex-col items-center justify-center p-8 text-zinc-500/90">
        <SearchIcon className="h-10 w-10 mb-3 text-zinc-500/90" />
        <p className="text-base text-center">{noResultsText}</p>
      </CardContent>
    </Card>
  );
}

type ErrorProps = {
  readonly errorMessage: string;
  readonly refreshText: string;
};

export function ErrorState({ errorMessage, refreshText }: ErrorProps) {
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
