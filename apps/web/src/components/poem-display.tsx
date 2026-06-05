'use client';

import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { ListCard } from '@/components/ui/list-card';
import {
  FONT_SIZE_BASE_GAP_PX,
  FONT_SIZE_INITIAL,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
} from '@/constants';
import type { Poem } from '@/lib/api/rpc';
import { formatVerseCount } from '@/lib/arabic';
import { poemUrl, poetUrl, taxonomyUrl } from '@/lib/urls';

function useFontSize(
  minSize = FONT_SIZE_MIN,
  maxSize = FONT_SIZE_MAX,
  initialSize = FONT_SIZE_INITIAL
) {
  const [fontSize, setFontSize] = useState(initialSize);

  const increaseFontSize = () => {
    if (fontSize < maxSize) setFontSize((prev) => prev + FONT_SIZE_STEP);
  };

  const decreaseFontSize = () => {
    if (fontSize > minSize) setFontSize((prev) => prev - FONT_SIZE_STEP);
  };

  const getVerseFontSize = () => {
    const baseClasses = 'text-base xxs:text-lg xs:text-xl sm:text-2xl md:text-2xl';
    const scaleStyle = { transform: `scale(${fontSize})`, transformOrigin: 'center' };
    return { className: baseClasses, style: scaleStyle };
  };

  const getVerseGap = () => {
    const gapSize = FONT_SIZE_BASE_GAP_PX * fontSize;
    return { gap: `${gapSize}px` };
  };

  return {
    fontSize,
    increaseFontSize,
    decreaseFontSize,
    getVerseFontSize,
    getVerseGap,
  };
}

type PoemDisplayProps = {
  readonly title: string;
  readonly poet: Poem['poet'];
  readonly era: Poem['era'];
  readonly meter: Poem['meter'];
  readonly theme: Poem['theme'];
  readonly verses: Poem['verses'];
  readonly verseCount: Poem['verseCount'];
  readonly relatedPoems?: Poem['relatedPoems'];
};

export function PoemDisplay({
  title,
  poet,
  era,
  meter,
  theme,
  verses,
  verseCount,
  relatedPoems,
}: PoemDisplayProps) {
  const { decreaseFontSize, increaseFontSize, getVerseFontSize, getVerseGap } = useFontSize();
  const handleTwitterShare = () =>
    window.open(
      `https://x.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`,
      '_blank',
      'noopener,noreferrer'
    );

  return (
    <div className="my-14 xs:my-20 flex w-full items-start justify-center lg:my-28">
      <div className="flex w-full flex-col items-center justify-center gap-10">
        <header className="flex w-full flex-col items-center justify-center gap-4 xxs:gap-6 text-center">
          <div className="flex flex-col gap-2 xx:gap-4">
            <h1 className="font-bold text-lg text-zinc-800 xs:text-2xl xxs:text-xl sm:text-3xl md:text-4xl">
              {title}
            </h1>

            <h2 className="text-sm text-zinc-700 xxs:text-base md:text-2xl">
              <a href={poetUrl(poet.slug)} className="hover:underline">
                {poet.name}
              </a>{' '}
              <a href={taxonomyUrl('eras', era.slug)} className="hover:underline">
                {`(${era.name})`}
              </a>
            </h2>

            <button
              onClick={handleTwitterShare}
              type="button"
              className="mt-1 flex w-full cursor-pointer items-center justify-center sm:mt-2"
            >
              <div className="flex items-center justify-center rounded-md border border-zinc-300/60 bg-white/5 px-2 text-[8px] text-zinc-600 xxs:text-xs md:text-base lg:px-4">
                <p>غرد</p>
              </div>
            </button>
          </div>

          <div className="flex w-full items-center justify-between rounded-full border border-zinc-300/80 px-2.5 text-[10px] text-zinc-600 xxs:text-xs md:w-8/12 md:px-8 md:text-sm lg:px-16 lg:text-base xl:text-lg 2xl:text-xl">
            <p className="flex-1 border-l py-0.5 md:py-1 lg:py-1.5">{meter.name || ''}</p>
            <p className="flex-1 border-l py-0.5 md:py-1 lg:py-1.5">
              {formatVerseCount(verseCount)}
            </p>
            <p className="flex-1 py-0.5 md:py-1 lg:py-1.5">{theme.name || ''}</p>
          </div>
        </header>

        <div className="relative flex w-full flex-col items-center justify-between gap-4 rounded-2xl bg-white px-4 py-10 shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.09)] md:w-10/12 md:py-8 lg:py-16 xl:w-9/12">
          <div className="flex items-center gap-4 rounded-md border border-zinc-300/50 bg-zinc-50/30">
            <button
              type="button"
              onClick={decreaseFontSize}
              className="p-1"
              aria-label="Decrease font size"
            >
              <Minus className="h-3 w-3 text-zinc-500/60 md:h-5 md:w-5 xl:h-7 xl:w-7" />
            </button>
            <p className="text-[10px] text-zinc-500/90 xxs:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl">
              حجم الخط
            </p>
            <button
              type="button"
              onClick={increaseFontSize}
              className="p-1"
              aria-label="Increase font size"
            >
              <Plus className="h-3 w-3 text-zinc-500/60 md:h-5 md:w-5 xl:h-7 xl:w-7" />
            </button>
          </div>

          <article className="flex w-full flex-col items-center">
            <div className="w-full sm:w-11/12 md:w-10/12 xl:w-6/12">
              {verses.map((verse) => (
                <div
                  key={`${verse[0] ?? ''}|${verse[1] ?? ''}`}
                  className="flex w-full flex-col items-center justify-center gap-4 border-zinc-50 border-b py-6 last:border-b-0 md:py-8"
                  style={{ ...getVerseGap() }}
                >
                  <p
                    className={getVerseFontSize().className}
                    style={getVerseFontSize().style}
                    lang="ar"
                    dir="rtl"
                  >
                    {verse[0]}
                  </p>
                  <p
                    className={getVerseFontSize().className}
                    style={getVerseFontSize().style}
                    lang="ar"
                    dir="rtl"
                  >
                    {verse[1]}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <div className="flex w-full flex-col gap-6 py-6 md:w-10/12 xl:w-9/12 xl:gap-8 xl:py-8">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg xs:text-2xl xxs:text-xl sm:text-3xl md:text-4xl">
              استزد
            </h3>
            <p className="font-normal text-xs text-zinc-600 md:text-sm xl:text-base">
              عشر قصائد مشابهة
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:gap-4 2xl:grid-cols-2 2xl:gap-6">
            {relatedPoems && relatedPoems.length > 0 ? (
              relatedPoems.map((item) => (
                <ListCard
                  className="rounded-2xl"
                  key={`${item.slug} ${poet.slug}`}
                  title={item.title}
                  subtitle={item.poet.name}
                  href={poemUrl(item.slug)}
                />
              ))
            ) : (
              <div className="py-8 text-center text-red-500">
                حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
