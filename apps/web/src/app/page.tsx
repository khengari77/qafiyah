import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { SearchContainer } from '@/components/search/components/search-container';
import { SITE_URL } from '@/constants/globals';
import { htmlHeadMetadata } from '@/constants/site-metadata';
import Loading from './loading';

const JsonLd = dynamic(() => import('@/components/json-ld'));

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: htmlHeadMetadata.title,
    url: SITE_URL,
    description: htmlHeadMetadata.description,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  } as const;

  return (
    <>
      {/* HIDDEN --------------------------------------------------- */}
      {/* ---------------------------------------------------------- */}
      <p
        className="sr-only pointer-events-none text-opacity-0 opacity-0"
        aria-hidden="true"
        tabIndex={-1}
      >
        {htmlHeadMetadata.description}
      </p>
      {/* ---------------------------------------------------------- */}
      {/* ---------------------------------------------------------- */}

      <JsonLd data={jsonLd} />
      <Suspense fallback={<Loading />}>
        <SearchContainer />
      </Suspense>
    </>
  );
}
