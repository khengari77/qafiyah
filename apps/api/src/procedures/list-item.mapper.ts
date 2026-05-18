import type { poemListItem } from '@qafiyah/contracts';
import type { PoemListRow } from '@qafiyah/db';
import type * as v from 'valibot';

type PoemListItem = v.InferOutput<typeof poemListItem>;

export function toPoemListItem(row: PoemListRow): PoemListItem {
  return {
    title: row.title,
    slug: row.slug,
    poet: { name: row.poetName, slug: row.poetSlug },
    meter: { name: row.meterName, slug: row.meterSlug },
  };
}
