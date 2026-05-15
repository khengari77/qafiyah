import {
  POEM_DEFAULT_TITLE,
  POEM_KEYWORDS_JOIN_SEPARATOR,
  POEM_LANGUAGE,
  SCHEMA_ORG_CONTEXT,
  SITE_LOGO_PATH,
  SITE_ORGANIZATION_NAME,
  TWITTER_DESCRIPTION_TEMPLATE_AR,
  UNKNOWN_POET_NAME,
} from '@qafiyah/constants';
import { SITE_NAME, SITE_URL } from '@/constants/globals';
import { fetchPoem } from '@/lib/api/static';
import type { PoemResponseData } from '@/lib/api/types';
import { flattenVerses } from '@/lib/flatten-verse-description';

/** Strip chars that break Astro's codegen when strings are embedded into generated JS props. */
function safeMetaText(value: string): string {
  return value
    .replace(/['"\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type PoemLayoutProps = {
  title: string;
  description: string;
  keywords: PoemResponseData['processedContent']['keywords'];
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  twitterTitle: string;
  twitterDescription: string;
  jsonLd: Record<string, unknown>;
};

export async function loadPoemPage(slug: string): Promise<{
  poem: PoemResponseData;
  layout: PoemLayoutProps;
} | null> {
  const poem = await fetchPoem(slug);
  if (!poem) return null;

  const clearTitle = poem.clearTitle || POEM_DEFAULT_TITLE;
  const poetName = poem.metadata.poetName || UNKNOWN_POET_NAME;
  const rawDescription = flattenVerses(poem.processedContent.verses as [string, string][]);
  const safeClearTitle = safeMetaText(clearTitle);
  const safePoetName = safeMetaText(poetName);
  const description = safeMetaText(rawDescription);
  const pageTitle = `${safeClearTitle} - ${safePoetName} - ${SITE_NAME}`;
  const pageUrl = `${SITE_URL}/poems/${slug}`;
  const canonicalPath = `/poems/${slug}`;
  const twitterDescription = safeMetaText(
    TWITTER_DESCRIPTION_TEMPLATE_AR.replace('{poet}', poetName)
  );
  const sanitizedKeywords = safeMetaText(poem.processedContent.keywords);

  const jsonLd = {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'CreativeWork',
    name: safeMetaText(poem.clearTitle),
    headline: safeMetaText(`${poem.clearTitle} | ${poem.metadata.poetName}`),
    author: {
      '@type': 'Person',
      name: poem.metadata.poetName,
      url: poem.metadata.poetSlug,
    },
    inLanguage: POEM_LANGUAGE,
    datePublished: new Date().toISOString(),
    url: pageUrl,
    isPartOf: [
      { '@type': 'Collection', name: poem.metadata.poetName, url: poem.metadata.poetSlug },
      { '@type': 'Collection', name: poem.metadata.eraName, url: poem.metadata.eraSlug },
    ],
    description: safeMetaText(
      poem.processedContent.verses.flat().join(POEM_KEYWORDS_JOIN_SEPARATOR)
    ),
    keywords: sanitizedKeywords,
    publisher: {
      '@type': 'Organization',
      name: SITE_ORGANIZATION_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}${SITE_LOGO_PATH}` },
    },
  };

  const layout: PoemLayoutProps = {
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
  };

  return { poem, layout };
}
