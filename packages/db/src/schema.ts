import { integer, pgMaterializedView, pgView, text, uuid } from 'drizzle-orm/pg-core';

export const eraStats = pgView('era_stats', {
  id: integer('id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  poetsCount: integer('poets_count').notNull(),
  poemsCount: integer('poems_count').notNull(),
}).existing();

export const meterStats = pgView('meter_stats', {
  id: integer('id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  poemsCount: integer('poems_count').notNull(),
  poetsCount: integer('poets_count').notNull(),
}).existing();

export const poetStats = pgView('poet_stats', {
  id: integer('id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  eraId: integer('era_id').notNull(),
  poemsCount: integer('poems_count').notNull(),
}).existing();

export const rhymeStats = pgView('rhyme_stats', {
  id: integer('id').notNull(),
  letter: text('letter').notNull(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  poemsCount: integer('poems_count').notNull(),
  poetsCount: integer('poets_count').notNull(),
}).existing();

export const themeStats = pgView('theme_stats', {
  id: integer('id').notNull(),
  name: text('name').notNull(),
  slug: uuid('slug').notNull(),
  poemsCount: integer('poems_count').notNull(),
  poetsCount: integer('poets_count').notNull(),
}).existing();

export const poemsFullData = pgMaterializedView('poem_full_data', {
  slug: text('slug').notNull(),
  title: text('title'),
  content: text('content'),
  verseCount: integer('verse_count'),
  poetName: text('poet_name'),
  poetSlug: text('poet_slug'),
  meterName: text('meter_name'),
  themeName: text('theme_name'),
  eraName: text('era_name'),
  eraSlug: text('era_slug'),
}).existing();
