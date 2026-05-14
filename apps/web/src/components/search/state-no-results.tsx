import { SearchIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  noResultsText: string;
};

export function NoResultsState({ noResultsText }: Props) {
  return (
    <Card className="border-zinc-300/50 bg-zinc-50 shadow-none">
      <CardContent className="flex flex-col items-center justify-center p-8 text-zinc-500/90">
        <SearchIcon className="h-10 w-10 mb-3 text-zinc-500/90" />
        <p className="text-base text-center">{noResultsText}</p>
      </CardContent>
    </Card>
  );
}
