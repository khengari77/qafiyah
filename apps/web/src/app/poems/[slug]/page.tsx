import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { JsonLdServer } from '@/components/json-ld-server';
import { PoemDisplay } from '@/components/poem/poem-display';
import { NOT_FOUND_TITLE, SITE_NAME, SITE_URL } from '@/constants/GLOBALS';
import { htmlHeadMetadata } from '@/constants/SITE_METADATA';
import { fetchAllPoemSlugs, fetchPoem } from '@/lib/api/static';
import type { PoemResponseData } from '@/lib/api/types';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await fetchAllPoemSlugs();
  return slugs.map((slug) => ({ slug }));
}

// In dev, allow any slug (fetched on demand). In production build, only slugs from generateStaticParams.
export const dynamicParams = process.env.NODE_ENV === 'development';

function flattenVerses(verses: [string, string][]): string {
  if (!verses || !verses.length) return '';

  const OPTIMAL_LENGTH = 300;
  let result = '';

  for (let i = 0; i < verses.length; i++) {
    const nextVerseLength = (verses[i][0]?.length || 0) + (verses[i][1]?.length || 0) + 2;
    if (result.length + nextVerseLength > OPTIMAL_LENGTH) {
      break;
    }

    if (i > 0) result += ' * ';
    if (verses[i][0]) result += verses[i][0];
    result += ' * ';
    if (verses[i][1]) result += verses[i][1];
  }

  if (result.length > OPTIMAL_LENGTH) {
    return result.substring(0, OPTIMAL_LENGTH);
  }

  return result;
}

function buildMetadata(poem: PoemResponseData, slug: string): Metadata {
  const clearTitle = poem?.clearTitle || 'قصيدة';
  const data = poem?.metadata || {};
  const poet_name = data.poet_name || 'شاعر غير معروف';
  const processedContent = poem?.processedContent || {};
  const keywords = processedContent.keywords || '';
  const description = flattenVerses(processedContent.verses as [string, string][]);
  const title = `${clearTitle} - ${poet_name} - ${SITE_NAME}`;

  return {
    title,
    description,
    keywords: keywords,
    authors: [{ name: poet_name }],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        notranslate: false,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'ar_AR',
      url: `${SITE_URL}/poems/${slug}`,
      title,
      description,
      images: [
        {
          url: `${SITE_URL}${htmlHeadMetadata.openGraphUrl}`,
          width: 1200,
          height: 630,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      title,
      card: 'summary',
      creatorId: '1570116567538475010',
      creator: '@qafiyahiyahdotcom',
      site: '@qafiyahiyahdotcom',
      description: `ديوان «${poet_name}» على موقع قافية`,
      images: {
        url: `${SITE_URL}${htmlHeadMetadata.twitterSummaryCardImageUrl}`,
        height: 480,
        width: 480,
        alt: `ديوان «${poet_name}» على موقع قافية`,
      },
    },
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const poem = await fetchPoem(slug);

  if (!poem) {
    return {
      title: NOT_FOUND_TITLE,
      robots: { index: false, follow: false },
    };
  }

  return buildMetadata(poem, slug);
}

function buildJsonLd(poem: PoemResponseData, slug: string) {
  const joinedVerses = poem.processedContent.verses.flat().join(' - ');

  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: poem.clearTitle,
    headline: `${poem.clearTitle} | ${poem.metadata.poet_name}`,
    author: {
      '@type': 'Person',
      name: poem.metadata.poet_name,
      url: poem.metadata.poet_slug,
    },
    inLanguage: 'ar',
    datePublished: new Date().toISOString(),
    url: `${SITE_URL}/poems/${slug}`,
    isPartOf: [
      {
        '@type': 'Collection',
        name: poem.metadata.poet_name,
        url: poem.metadata.poet_slug,
      },
      {
        '@type': 'Collection',
        name: poem.metadata.era_name,
        url: poem.metadata.era_slug,
      },
    ],
    description: joinedVerses,
    keywords: poem.processedContent.keywords,
    publisher: {
      '@type': 'Organization',
      name: 'قافية',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
  };
}

export default async function PoemPage({ params }: Props) {
  const { slug } = await params;
  const poem = await fetchPoem(slug);

  if (!poem) {
    notFound();
  }

  const { metadata, clearTitle, processedContent, relatedPoems } = poem;
  const { verses, verseCount } = processedContent;

  return (
    <>
      <JsonLdServer data={buildJsonLd(poem, slug)} />
      <PoemDisplay
        clearTitle={clearTitle}
        metadata={metadata}
        verses={verses}
        verseCount={verseCount}
        relatedPoems={relatedPoems}
      />
    </>
  );
}
