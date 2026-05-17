import type { PoemSlug } from '@qafiyah/contracts';
import {
  POEM_DEFAULT_TITLE,
  POEM_KEYWORDS_JOIN_SEPARATOR,
  POEM_LANGUAGE,
  SITE_NAME_AR,
  SITE_URL,
  TWITTER_DESCRIPTION_TEMPLATE_AR,
  UNKNOWN_POET_NAME,
} from '@/constants';
import { fetchPoem } from '@/lib/api/static/poems';
import type { Poem } from '@/lib/api/types';
import { flattenVerses } from '@/lib/flatten-verses';

function safeMetaText(value: string): string {
  return value
    .replace(/['"\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type PoemLayoutProps = {
  readonly title: string;
  readonly description: string;
  readonly keywords: string;
  readonly canonical: string;
  readonly ogTitle: string;
  readonly ogDescription: string;
  readonly ogUrl: string;
  readonly twitterTitle: string;
  readonly twitterDescription: string;
  readonly jsonLd: Readonly<Record<string, unknown>>;
};

function buildJsonLd(
  poem: Poem,
  pageUrl: string,
  sanitizedKeywords: string
): Readonly<Record<string, unknown>> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: safeMetaText(poem.title),
    headline: safeMetaText(`${poem.title} | ${poem.poet.name}`),
    author: { '@type': 'Person', name: poem.poet.name, url: poem.poet.slug },
    inLanguage: POEM_LANGUAGE,
    url: pageUrl,
    isPartOf: [
      { '@type': 'Collection', name: poem.poet.name, url: poem.poet.slug },
      { '@type': 'Collection', name: poem.era.name, url: poem.era.slug },
    ],
    description: safeMetaText(poem.verses.flat().join(POEM_KEYWORDS_JOIN_SEPARATOR)),
    keywords: sanitizedKeywords,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME_AR,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.webp` },
    },
  };
}

function buildPoemLayout(poem: Poem, slug: PoemSlug): PoemLayoutProps {
  const clearTitle = poem.title || POEM_DEFAULT_TITLE;
  const poetName = poem.poet.name || UNKNOWN_POET_NAME;
  const description = safeMetaText(flattenVerses(poem.verses));
  const pageTitle = `${safeMetaText(clearTitle)} - ${safeMetaText(poetName)} - ${SITE_NAME_AR}`;
  const pageUrl = `${SITE_URL}/poems/${slug}`;
  const twitterDescription = safeMetaText(
    TWITTER_DESCRIPTION_TEMPLATE_AR.replace('{poet}', poetName)
  );
  const sanitizedKeywords = safeMetaText(poem.keywords);
  return {
    title: pageTitle,
    description,
    keywords: sanitizedKeywords,
    canonical: `/poems/${slug}`,
    ogTitle: pageTitle,
    ogDescription: description,
    ogUrl: pageUrl,
    twitterTitle: pageTitle,
    twitterDescription,
    jsonLd: buildJsonLd(poem, pageUrl, sanitizedKeywords),
  };
}

export async function loadPoemPage(slug: PoemSlug): Promise<{
  readonly poem: Poem;
  readonly layout: PoemLayoutProps;
} | null> {
  const poem = await fetchPoem(slug);
  if (!poem) return null;
  return { poem, layout: buildPoemLayout(poem, slug) };
}
