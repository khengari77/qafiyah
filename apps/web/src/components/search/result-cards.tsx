import { Badge } from '@/components/ui/badge';
import { SITE_URL } from '@/constants/globals';
import type { PoemsSearchResult, PoetsSearchResult } from '@/lib/api/types';
import { HighlightedText } from './highlighted-text';

const badgeClassname =
  'text-[11px] lg:text-sm font-normal text-zinc-600/90 shadow-none border-0 ring-none bg-zinc-50';

export function PoemCard({
  item: { poemMeter, poemSlug, poemSnippet, poemTitle, poetEra, poetName, poetSlug },
}: {
  item: PoemsSearchResult;
}) {
  return (
    <div className="shadow-none group overflow-hidden border-0 ring-1 ring-zinc-300/50 hover:border-zinc-200 transition-all duration-300 bg-white rounded-xl flex justify-center items-center p-4 md:p-6">
      <div className="flex flex-col w-full h-full gap-4">
        {/*  */}
        <div className="flex flex-col gap-1.5">
          <a
            href={`${SITE_URL}/poems/${poemSlug}`}
            className="text-base md:text-lg 2xl:text-xl font-bold text-zinc-900 group-hover:text-zinc-900 transition-colors hover:underline hover:underline-offset-4"
          >
            {poemTitle}
          </a>

          <a
            href={`${SITE_URL}/poets/${poetSlug}/page/1`}
            className="text-base md:text-lg hover:cursor-pointer font-normal text-zinc-900/80 hover:text-zinc-900 hover:underline hover:underline-offset-4"
          >
            {poetName || 'شاعر'}
          </a>
        </div>

        {/*  */}
        <div className="flex flex-col gap-2">
          <HighlightedText
            className="text-sm sm:text-base md:text-lg font-normal text-zinc-900"
            text={poemSnippet}
          />
          <div className="flex justify-end items-center gap-1">
            {poemMeter && (
              <Badge variant="outline" className={badgeClassname}>
                {poemMeter.split(' ')[0]}
              </Badge>
            )}
            {poetEra && (
              <Badge variant="outline" className={badgeClassname}>
                {poetEra.split(' ')[0] || 'عصر غير معروف'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PoetCard({ item: { poetEra, poetName, poetSlug } }: { item: PoetsSearchResult }) {
  return (
    <div className="shadow-none group overflow-hidden border-0 ring-1 ring-zinc-300/50 hover:border-zinc-200 transition-all duration-300 bg-white rounded-xl flex justify-center items-center p-4 md:p-6">
      <a
        className="flex flex-row justify-between items-centers gap-2 w-full "
        href={`${SITE_URL}/poets/${poetSlug}/page/1`}
      >
        <h2 className="flex-1 text-base md:text-lg 2xl:text-xl font-bold text-zinc-900 group-hover:text-zinc-900 transition-colors  hover:underline hover:underline-offset-4">
          {poetName || 'شاعر'}
        </h2>

        <div className="flex justify-center items-center">
          {poetEra && (
            <Badge variant="outline" className={badgeClassname}>
              {poetEra || 'عصر غير معروف'}
            </Badge>
          )}
        </div>
      </a>
    </div>
  );
}
