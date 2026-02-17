import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { toArabicDigits } from 'to-arabic-digits';
import { JsonLdServer } from '@/components/json-ld-server';
import { ListCard } from '@/components/ui/list-card';
import { PageNavigationButtons, PageSectionWithHeader } from '@/components/ui/section-wrapper';
import { NOT_FOUND_TITLE, SITE_URL } from '@/constants/globals';
import { POEMS_PER_PAGE } from '@/constants/pagination';
import { fetchEraPoemPage, fetchErasWithPoemCount, generatePageNumbers } from '@/lib/api/static';
import { buildOpenGraphMetadata, buildTwitterMetadata } from '@/lib/metadata-helpers';

const ERAS = new Map([
  ['islamic', 'إسلامي'],
  ['abbasid', 'عباسي'],
  ['umayyad', 'أموي'],
  ['jahili', 'جاهلي'],
  ['mukhadram', 'مخضرم'],
  ['andalusian', 'أندلسي'],
  ['mamluki', 'مملوكي'],
  ['ottoman', 'عثماني'],
  ['ayyubi', 'أيوبي'],
  ['late', 'متأخر'],
]);

type Props = {
  params: Promise<{ slug: string; page: string }>;
};

export async function generateStaticParams() {
  const eras = await fetchErasWithPoemCount();
  const params: Array<{ slug: string; page: string }> = [];

  for (const era of eras) {
    const pages = generatePageNumbers(era.poemsCount);
    for (const page of pages) {
      params.push({ slug: era.slug, page: page.toString() });
    }
  }

  return params;
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, page } = await params;

  if (!ERAS.has(slug)) {
    return {
      title: NOT_FOUND_TITLE,
      robots: { index: false, follow: false },
    };
  }

  const eraName = ERAS.get(slug);
  const title = `قافية | قصائد ال${eraName}ين | صفحة (${toArabicDigits(page)})`;

  return {
    title,
    openGraph: buildOpenGraphMetadata({
      title,
      url: `${SITE_URL}/eras/${slug}/page/${page}`,
    }),
    twitter: buildTwitterMetadata({ title }),
  };
}

export default async function EraPage({ params }: Props) {
  const { slug, page } = await params;
  const pageNumber = Number.parseInt(page, 10);

  if (!slug || !Number.isFinite(pageNumber) || pageNumber < 1) {
    notFound();
  }

  const result = await fetchEraPoemPage(slug, page);
  if (!result?.data) {
    notFound();
  }
  const { data, pagination } = result;
  const { eraDetails: era, poems } = data;
  const title = `${era.name}ين`;

  const totalPages = pagination?.totalPages || Math.ceil(era.poemsCount / POEMS_PER_PAGE);
  const hasNextPage = pagination?.hasNextPage || pageNumber < totalPages;
  const hasPrevPage = pagination?.hasPrevPage || pageNumber > 1;

  const nextPageUrl = `/eras/${slug}/page/${pageNumber + 1}`;
  const prevPageUrl = `/eras/${slug}/page/${pageNumber - 1}`;

  const content = {
    header: `قصائد ${title} (${toArabicDigits(era.poemsCount)} قصيدة)`,
    headerTip: `صـ ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
  };

  const itemListElements = poems.map((poem, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    item: {
      '@type': 'CreativeWork',
      name: poem.title,
      url: `${SITE_URL}/poems/${poem.slug}`,
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Collection',
    name: `قصائد العصر ال${era.name}`,
    url: `${SITE_URL}/eras/${slug}/page/${pageNumber}`,
    description: `مجموعة قصائد من العصر ال${era.name} - الصفحة ${toArabicDigits(pageNumber)} من ${toArabicDigits(totalPages)}`,
    mainEntityOfPage: {
      '@type': 'CollectionPage',
      name: `قصائد العصر ال${era.name}`,
      url: `${SITE_URL}/eras/${slug}/page/1`,
    },
    numberOfItems: era.poemsCount,
    itemListElement: itemListElements,
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
          poems.map((poem) => (
            <ListCard
              key={poem.slug}
              href={`/poems/${poem.slug}`}
              name={poem.title}
              title={`${poem.poetName} • ${poem.meter}`}
            />
          ))
        ) : (
          <p className="text-center text-zinc-500">لا توجد قصائد لهذا العصر.</p>
        )}
      </PageSectionWithHeader>
    </>
  );
}
