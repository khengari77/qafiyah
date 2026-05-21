import { createHash } from 'node:crypto';

// U+0610–U+061A, U+064B–U+065F, U+06D6–U+06ED — Arabic diacritics + small marks; plus tatweel.
const TASHKEEL_REGEX = /[ؐ-ًؚ-ٟۖ-ۭـ]/g;

function stripTashkeel(text: string): string {
  return text.replace(TASHKEEL_REGEX, '');
}

export type PoemSource = {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly content: string;
  readonly poetName: string;
  readonly poetSlug: string;
  readonly eraName: string;
  readonly eraSlug: string;
  readonly meterName: string;
  readonly meterSlug: string;
  readonly themeSlug: string;
  readonly rhymeSlug: string;
};

export type PoetSource = {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  readonly bio: string;
  readonly eraName: string;
  readonly eraSlug: string;
};

export type PoemDoc = {
  id: number;
  slug: string;
  hash: string;
  title: string;
  content: string;
  poetName: string;
  titleDisplay: string;
  poetNameDisplay: string;
  poetSlug: string;
  eraSlug: string;
  eraName: string;
  meterSlug: string;
  meterName: string;
  themeSlug: string;
  rhymeSlug: string;
};

export type PoetDoc = {
  id: number;
  slug: string;
  hash: string;
  name: string;
  bio: string;
  nameDisplay: string;
  eraSlug: string;
  eraName: string;
};

export function toPoemDoc(src: PoemSource): PoemDoc {
  const doc: Omit<PoemDoc, 'hash'> = {
    id: src.id,
    slug: src.slug,
    title: stripTashkeel(src.title),
    content: stripTashkeel(src.content),
    poetName: stripTashkeel(src.poetName),
    titleDisplay: src.title,
    poetNameDisplay: src.poetName,
    poetSlug: src.poetSlug,
    eraSlug: src.eraSlug,
    eraName: src.eraName,
    meterSlug: src.meterSlug,
    meterName: src.meterName,
    themeSlug: src.themeSlug,
    rhymeSlug: src.rhymeSlug,
  };
  return { ...doc, hash: docHash(doc) };
}

export function toPoetDoc(src: PoetSource): PoetDoc {
  const doc: Omit<PoetDoc, 'hash'> = {
    id: src.id,
    slug: src.slug,
    name: stripTashkeel(src.name),
    bio: stripTashkeel(src.bio),
    nameDisplay: src.name,
    eraSlug: src.eraSlug,
    eraName: src.eraName,
  };
  return { ...doc, hash: docHash(doc) };
}

// Stable content hash for reconciliation; excludes any pre-existing `hash`.
export function docHash(doc: Record<string, unknown>): string {
  const { hash: _ignore, ...rest } = doc as { hash?: string } & Record<string, unknown>;
  const stable = JSON.stringify(rest, Object.keys(rest).sort());
  return createHash('sha1').update(stable).digest('hex');
}
