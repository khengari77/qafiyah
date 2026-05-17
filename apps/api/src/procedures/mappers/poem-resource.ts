import type { EraSlug, MeterSlug, PoemSlug, PoetSlug, ThemeSlug } from '@qafiyah/contracts';
import type { poemsQueries } from '@qafiyah/db';
import { type PoemListItem, toPoemListItem } from './poem-list-item';

type SubRef<TSlug> = { readonly name: string; readonly slug: TSlug };

// @WARN: PoemResource is the wire output shape, `verses` and `relatedPoems` are
//   mutable arrays because the oRPC contract (Valibot InferOutput) does not preserve
//   readonly. Internally readonly data from @qafiyah/db is copied into a mutable
//   shape only at this boundary.
type PoemResource = {
  readonly title: string;
  readonly slug: PoemSlug;
  readonly verses: [string, string][];
  readonly verseCount: number;
  readonly sample: string;
  readonly keywords: string;
  readonly poet: SubRef<PoetSlug>;
  readonly era: SubRef<EraSlug>;
  readonly meter: SubRef<MeterSlug>;
  readonly theme: SubRef<ThemeSlug>;
  readonly relatedPoems: PoemListItem[];
};

export function toPoemResource(slug: PoemSlug, data: poemsQueries.PoemResourceData): PoemResource {
  return {
    title: data.clearTitle,
    slug,
    verses: data.processedContent.verses.map((v) => [v[0], v[1]] as [string, string]),
    verseCount: data.processedContent.verseCount,
    sample: data.processedContent.sample,
    keywords: data.processedContent.keywords,
    poet: { name: data.metadata.poetName, slug: data.metadata.poetSlug },
    era: { name: data.metadata.eraName, slug: data.metadata.eraSlug },
    meter: { name: data.metadata.meterName, slug: data.metadata.meterSlug },
    theme: { name: data.metadata.themeName, slug: data.metadata.themeSlug },
    relatedPoems: data.relatedPoems.map(toPoemListItem),
  };
}
