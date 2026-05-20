import type { PoemSlug } from '@qafiyah/contracts';
import {
  POEM_DEFAULT_TITLE,
  POEM_KEYWORDS_JOIN_SEPARATOR,
  POEM_LANGUAGE,
  SCHEMA_ORG_CONTEXT,
  SITE_LOGO_PATH,
  SITE_NAME_AR,
  SITE_URL,
  TWITTER_DESCRIPTION_TEMPLATE_AR,
  UNKNOWN_POET_NAME,
} from '@/constants';
import type { Poem } from '@/lib/api/rpc';
import { breadcrumbListJsonLd } from '@/lib/breadcrumbs';
import { flattenVerses } from '@/lib/flatten-verses';

function sanitizeMetaText(value: string): string {
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
  readonly twitterTitle: string;
  readonly twitterDescription: string;
  readonly jsonLd: readonly Readonly<Record<string, unknown>>[];
};

function buildJsonLd(
  poem: Poem,
  slug: PoemSlug,
  pageUrl: string,
  sanitizedKeywords: string
): readonly Readonly<Record<string, unknown>>[] {
  const poetUrl = `${SITE_URL}/poets/${poem.poet.slug}/page/1`;
  const eraUrl = `${SITE_URL}/eras/${poem.era.slug}/page/1`;
  const article = {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'CreativeWork',
    name: sanitizeMetaText(poem.title),
    headline: sanitizeMetaText(`${poem.title} — ${poem.poet.name}`),
    author: { '@type': 'Person', name: poem.poet.name, url: poetUrl },
    inLanguage: POEM_LANGUAGE,
    url: pageUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
    isPartOf: [
      { '@type': 'Collection', name: poem.poet.name, url: poetUrl },
      { '@type': 'Collection', name: poem.era.name, url: eraUrl },
    ],
    description: sanitizeMetaText(poem.verses.flat().join(POEM_KEYWORDS_JOIN_SEPARATOR)),
    keywords: sanitizedKeywords,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME_AR,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}${SITE_LOGO_PATH}`,
        width: '112',
        height: '112',
      },
    },
  };
  const crumbs = breadcrumbListJsonLd([
    { name: SITE_NAME_AR, path: '/' },
    { name: 'الشعراء', path: '/poets/page/1' },
    { name: poem.poet.name, path: `/poets/${poem.poet.slug}/page/1` },
    { name: poem.title || POEM_DEFAULT_TITLE, path: `/poems/${slug}` },
  ]);
  return [article, crumbs];
}

export function buildPoemLayout(poem: Poem, slug: PoemSlug): PoemLayoutProps {
  const displayTitle = poem.title || POEM_DEFAULT_TITLE;
  const poetName = poem.poet.name || UNKNOWN_POET_NAME;
  const description = sanitizeMetaText(flattenVerses(poem.verses));
  const pageTitle = `${sanitizeMetaText(displayTitle)} — ${sanitizeMetaText(poetName)} | ${SITE_NAME_AR}`;
  const pageUrl = `${SITE_URL}/poems/${slug}`;
  const twitterDescription = sanitizeMetaText(
    TWITTER_DESCRIPTION_TEMPLATE_AR.replace('{poet}', poetName)
  );
  const sanitizedKeywords = sanitizeMetaText(poem.keywords);
  return {
    title: pageTitle,
    description,
    keywords: sanitizedKeywords,
    canonical: `/poems/${slug}`,
    ogTitle: pageTitle,
    ogDescription: description,
    twitterTitle: pageTitle,
    twitterDescription,
    jsonLd: buildJsonLd(poem, slug, pageUrl, sanitizedKeywords),
  };
}
