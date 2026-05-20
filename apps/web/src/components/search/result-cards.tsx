import { Badge } from '@/components/ui/badge';
import type { PoemSearchResult, PoetSearchResult } from '@/lib/api/rpc';
import { HighlightedText } from './highlighted-text';

const badgeClassname =
  'text-[11px] lg:text-sm font-normal text-zinc-600/90 shadow-none border-0 ring-none bg-zinc-50';

export function PoemCard({ item }: { item: PoemSearchResult }) {
  const { title, slug, snippet, poet, meter, era } = item;
  return (
    <div className="group flex items-center justify-center overflow-hidden rounded-xl border-0 bg-white p-4 shadow-none ring-1 ring-zinc-300/50 transition-all duration-300 hover:border-zinc-200 md:p-6">
      <div className="flex h-full w-full flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <a
            href={`/poems/${slug}`}
            className="font-bold text-base text-zinc-900 transition-colors hover:underline hover:underline-offset-4 group-hover:text-zinc-900 md:text-lg 2xl:text-xl"
          >
            {title}
          </a>

          <a
            href={`/poets/${poet.slug}/page/1`}
            className="font-normal text-base text-zinc-900/80 hover:cursor-pointer hover:text-zinc-900 hover:underline hover:underline-offset-4 md:text-lg"
          >
            {poet.name || 'شاعر'}
          </a>
        </div>

        <div className="flex flex-col gap-2">
          <HighlightedText
            className="font-normal text-sm text-zinc-900 sm:text-base md:text-lg"
            text={snippet}
          />
          <div className="flex items-center justify-end gap-1">
            {meter.name && (
              <Badge variant="outline" className={badgeClassname}>
                {meter.name.split(' ')[0]}
              </Badge>
            )}
            {era.name && (
              <Badge variant="outline" className={badgeClassname}>
                {era.name.split(' ')[0] || 'عصر غير معروف'}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PoetCard({ item }: { item: PoetSearchResult }) {
  const { name, slug, era } = item;
  return (
    <div className="group flex items-center justify-center overflow-hidden rounded-xl border-0 bg-white p-4 shadow-none ring-1 ring-zinc-300/50 transition-all duration-300 hover:border-zinc-200 md:p-6">
      <a
        className="items-centers flex w-full flex-row justify-between gap-2"
        href={`/poets/${slug}/page/1`}
      >
        <h2 className="flex-1 font-bold text-base text-zinc-900 transition-colors hover:underline hover:underline-offset-4 group-hover:text-zinc-900 md:text-lg 2xl:text-xl">
          {name || 'شاعر'}
        </h2>

        <div className="flex items-center justify-center">
          {era.name && (
            <Badge variant="outline" className={badgeClassname}>
              {era.name || 'عصر غير معروف'}
            </Badge>
          )}
        </div>
      </a>
    </div>
  );
}
