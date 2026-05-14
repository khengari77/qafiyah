import * as v from 'valibot';

export const pageParam = v.pipe(
  v.string(),
  v.transform(Number),
  v.number(),
  v.integer(),
  v.minValue(1)
);

export const slugAndPageInput = v.object({
  slug: v.string(),
  page: pageParam,
});

export const slugInput = v.object({
  slug: v.string(),
});

export const statRow = v.object({
  name: v.string(),
  slug: v.string(),
  poemsCount: v.number(),
  poetsCount: v.number(),
});

export const statRowNoPoetsCount = v.object({
  name: v.string(),
  slug: v.string(),
  poemsCount: v.number(),
});

export const poemListItem = v.object({
  title: v.string(),
  slug: v.string(),
  poetName: v.string(),
  meter: v.string(),
});

export const poemListItemNoMeter = v.object({
  title: v.string(),
  slug: v.string(),
  poetName: v.string(),
});

export const poemListItemNoPoet = v.object({
  title: v.string(),
  slug: v.string(),
  meter: v.string(),
});

export const paginationFields = {
  page: v.number(),
  totalPages: v.number(),
  total: v.number(),
};
