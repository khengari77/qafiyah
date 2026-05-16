import {
  POEM_DEFAULT_TITLE,
  POEM_KEYWORDS_JOIN_SEPARATOR,
  POEM_LANGUAGE,
  SCHEMA_ORG_CONTEXT,
  SITE_LOGO_PATH,
  SITE_NAME_AR,
  TWITTER_DESCRIPTION_TEMPLATE_AR,
  UNKNOWN_POET_NAME,
} from '@qafiyah/constants';
import type { PoemSlug } from '@qafiyah/contracts';
import { SITE_URL } from '@/constants/globals';
import { fetchPoem } from '@/lib/api/static';
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

export async function loadPoemPage(slug: PoemSlug): Promise<{
  readonly poem: Poem;
  readonly layout: PoemLayoutProps;
} | null> {
  const poem = await fetchPoem(slug);
  if (!poem) return null;

  const clearTitle = poem.title || POEM_DEFAULT_TITLE;
  const poetName = poem.poet.name || UNKNOWN_POET_NAME;
  const rawDescription = flattenVerses(poem.verses);
  const safeClearTitle = safeMetaText(clearTitle);
  const safePoetName = safeMetaText(poetName);
  const description = safeMetaText(rawDescription);
  const pageTitle = `${safeClearTitle} - ${safePoetName} - ${SITE_NAME_AR}`;
  const pageUrl = `${SITE_URL}/poems/${slug}`;
  const canonicalPath = `/poems/${slug}`;
  const twitterDescription = safeMetaText(
    TWITTER_DESCRIPTION_TEMPLATE_AR.replace('{poet}', poetName)
  );
  const sanitizedKeywords = safeMetaText(poem.keywords);

  const jsonLd = {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'CreativeWork',
    name: safeMetaText(poem.title),
    headline: safeMetaText(`${poem.title} | ${poem.poet.name}`),
    author: {
      '@type': 'Person',
      name: poem.poet.name,
      url: poem.poet.slug,
    },
    inLanguage: POEM_LANGUAGE,
    datePublished: new Date().toISOString(),
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
      logo: { '@type': 'ImageObject', url: `${SITE_URL}${SITE_LOGO_PATH}` },
    },
  };

  const layout = {
    title: pageTitle,
    description,
    keywords: sanitizedKeywords,
    canonical: canonicalPath,
    ogTitle: pageTitle,
    ogDescription: description,
    ogUrl: pageUrl,
    twitterTitle: pageTitle,
    twitterDescription,
    jsonLd,
  } satisfies PoemLayoutProps;

  return { poem, layout };
}
