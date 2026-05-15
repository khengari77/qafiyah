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
  pattern: text('pattern').notNull(),
  slug: uuid('slug').notNull(),
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
  poet_name: text('poet_name'),
  poet_slug: text('poet_slug'),
  meter_name: text('meter_name'),
  theme_name: text('theme_name'),
  era_name: text('era_name'),
  era_slug: text('era_slug'),
}).existing();
