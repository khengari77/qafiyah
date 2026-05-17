import * as v from 'valibot';
import { meterSlugSchema } from '../brands/meter-slug';
import { poemSlugSchema } from '../brands/poem-slug';
import { poetSlugSchema } from '../brands/poet-slug';

export const subRef = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
  });

export const statRow = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
    poemsCount: v.number(),
    poetsCount: v.number(),
  });

export const parentMeta = <TSlug extends v.GenericSchema<string, string>>(slug: TSlug) =>
  v.object({
    name: v.string(),
    slug,
    poemsCount: v.number(),
  });

export const poemListItem = v.object({
  title: v.string(),
  slug: poemSlugSchema,
  poet: subRef(poetSlugSchema),
  meter: subRef(meterSlugSchema),
});
