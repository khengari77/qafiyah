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

  const clearTitle = poem.clearTitle || 'قصيدة';
  const poetName = poem.metadata.poet_name || 'شاعر غير معروف';
  const rawDescription = flattenVerses(poem.processedContent.verses as [string, string][]);
  const safeClearTitle = safeMetaText(clearTitle);
  const safePoetName = safeMetaText(poetName);
  const description = safeMetaText(rawDescription);
  const pageTitle = `${safeClearTitle} - ${safePoetName} - ${SITE_NAME}`;
  const pageUrl = `${SITE_URL}/poems/${slug}`;
  const canonicalPath = `/poems/${slug}/`;
  const twitterDescription = safeMetaText(`ديوان «${poetName}» على موقع قافية`);
  const sanitizedKeywords = safeMetaText(poem.processedContent.keywords);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: safeMetaText(poem.clearTitle),
    headline: safeMetaText(`${poem.clearTitle} | ${poem.metadata.poet_name}`),
    author: {
      '@type': 'Person',
      name: poem.metadata.poet_name,
      url: poem.metadata.poet_slug,
    },
    inLanguage: 'ar',
    datePublished: new Date().toISOString(),
    url: pageUrl,
    isPartOf: [
      { '@type': 'Collection', name: poem.metadata.poet_name, url: poem.metadata.poet_slug },
      { '@type': 'Collection', name: poem.metadata.era_name, url: poem.metadata.era_slug },
    ],
    description: safeMetaText(poem.processedContent.verses.flat().join(' - ')),
    keywords: sanitizedKeywords,
    publisher: {
      '@type': 'Organization',
      name: 'قافية',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
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
