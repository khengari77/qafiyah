import { formatArabicCount } from 'arabic-count-format';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Key } from 'react';
import { toArabicDigits } from 'to-arabic-digits';
import { JsonLdServer } from '@/components/json-ld-server';
import { ListCard } from '@/components/ui/list-card';
import { PageNavigationButtons, PageSectionWithHeader } from '@/components/ui/section-wrapper';
import { NOT_FOUND_TITLE, SITE_URL } from '@/constants/globals';
import { POEMS_PER_PAGE } from '@/constants/pagination';
import {
  fetchPoetInfo,
  fetchPoetPoemPage,
  fetchPoetsWithPoemCount,
  generatePageNumbers,
} from '@/lib/api/static';
import { buildOpenGraphMetadata, buildTwitterMetadata } from '@/lib/metadata-helpers';

type Props = {
  params: Promise<{ slug: string; page: string }>;
};

export async function generateStaticParams() {
  const poets = await fetchPoetsWithPoemCount();
  const params: Array<{ slug: string; page: string }> = [];

  for (const poet of poets) {
    const pages = generatePageNumbers(poet.poemsCount);
    for (const page of pages) {
      params.push({ slug: poet.slug, page: page.toString() });
    }
  }

  return params;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;

  const poetInfo = await fetchPoetInfo(slug);

  if (!poetInfo) {
    return {
      title: NOT_FOUND_TITLE,
      robots: { index: false, follow: false },
    };
  }

  const poetData = poetInfo.poet;
  const poetName = poetData?.name || 'شاعر غير معروف';
  const poemsCount = poetData?.poemsCount || 0;
  const eraName = poetData?.era?.name || 'غير محدد';

  const title = `قافية: ديوان «${poetName}» - صفحة (${toArabicDigits(page)})`;

  return {
    title,
    description: `قصائد الشاعر ${poetName} من العصر ال${eraName}، عدد القصائد: ${toArabicDigits(poemsCount)}`,
    keywords: `${poetName}, شعر, قصائد, العصر ال${eraName}, شاعر`,
    authors: [{ name: poetName }],
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
    openGraph: buildOpenGraphMetadata({
      title: `قافية | ديوان ${poetName}`,
      url: `${SITE_URL}/poets/${slug}/page/${page}`,
      description: `قصائد الشاعر ${poetName} من العصر ال${eraName}، عدد القصائد: ${toArabicDigits(poemsCount)}`,
    }),
    twitter: buildTwitterMetadata({
      title: `قافية | ديوان ${poetName}`,
      description: `قصائد الشاعر ${poetName} من العصر ال${eraName}، عدد القصائد: ${toArabicDigits(poemsCount)}`,
    }),
  };
}

export default async function PoetPoemsPage({ params }: Props) {
  const { slug, page } = await params;
  const pageNumber = Number.parseInt(page, 10);

  if (!slug || !Number.isFinite(pageNumber) || pageNumber < 1) {
    notFound();
  }

  const result = await fetchPoetPoemPage(slug, page);
  if (!result?.data) {
    notFound();
  }
  const { data, pagination } = result;
  const { poetDetails: poet, poems } = data;
  const totalPages = pagination?.totalPages || Math.ceil(poet.poemsCount / POEMS_PER_PAGE);
  const hasNextPage = pagination?.hasNextPage || pageNumber < totalPages;
  const hasPrevPage = pagination?.hasPrevPage || pageNumber > 1;

  const nextPageUrl = `/poets/${slug}/page/${pageNumber + 1}`;
  const prevPageUrl = `/poets/${slug}/page/${pageNumber - 1}`;

  const content = {
    header: `${poet.name} (${toArabicDigits(poet.poemsCount)} قصيدة)`,
    headerTip: `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: poet.name,
    url: `${SITE_URL}/poets/${slug}/page/${pageNumber}`,
    description: `ديوان ${poet.name} (${formatArabicCount({
      count: poet.poemsCount,
      nounForms: {
        singular: 'قصيدة',
        dual: 'قصيدتان',
        plural: 'قصائد',
      },
    })})`,
    mainEntityOfPage: {
      '@type': 'CollectionPage',
      name: `ديوان ${poet.name}`,
      url: `${SITE_URL}/poets/${slug}/page/1`,
    },
    workExample: poems.slice(0, 10).map((poem) => ({
      '@type': 'CreativeWork',
      name: poem.title,
      description: `قصيدة (${poem.title}) على ${poem.meter}`,
      url: `${SITE_URL}/poems/${poem.slug}`,
    })),
  };

  return (
    <>
      <JsonLdServer data={jsonLd} />
      <PageSectionWithHeader
        dynamicTitle={content.header}
        pagination={{
          totalPages,
          component: (
            <PageNavigationButtons
              headerTip={content.headerTip}
              nextPageUrl={nextPageUrl}
              prevPageUrl={prevPageUrl}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
            />
          ),
        }}
      >
        {poems.length > 0 ? (
          poems.map((poem: { slug: Key | null | undefined; title: string; meter: string }) => (
            <ListCard
              key={poem.slug}
              href={`/poems/${poem.slug}`}
              name={poem.title}
              title={`${poem.meter}`}
            />
          ))
        ) : (
          <p className="text-center text-zinc-500">لا توجد قصائد لهذا الشاعر.</p>
        )}
      </PageSectionWithHeader>
    </>
  );
}
