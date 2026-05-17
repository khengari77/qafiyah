import type { MeterSlug, PoemSlug, PoetSlug } from '@qafiyah/contracts';
import type { PoemListRow } from '@qafiyah/db';

type SubRef<TSlug> = { readonly name: string; readonly slug: TSlug };

export type PoemListItem = {
  readonly title: string;
  readonly slug: PoemSlug;
  readonly poet: SubRef<PoetSlug>;
  readonly meter: SubRef<MeterSlug>;
};

export function toPoemListItem(row: PoemListRow): PoemListItem {
  return {
    title: row.title,
    slug: row.slug,
    poet: { name: row.poetName, slug: row.poetSlug },
    meter: { name: row.meterName, slug: row.meterSlug },
  };
}
