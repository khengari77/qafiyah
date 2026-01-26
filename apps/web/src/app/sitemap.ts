import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/constants/GLOBALS';
import {
  fetchAllErasWithStats,
  fetchAllMetersWithStats,
  fetchAllPoemSlugs,
  fetchAllPoetsWithStats,
  fetchAllRhymesWithStats,
  fetchAllThemesWithStats,
  generatePageNumbers,
} from '@/lib/api/static';

// Required for static export
export const dynamic = 'force-static';

const FETCH_PER_PAGE = 30;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/eras`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/meters`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/rhymes`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/themes`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Fetch all data in parallel for efficiency
  const [poemSlugs, poets, eras, meters, rhymes, themes] = await Promise.all([
    fetchAllPoemSlugs(),
    fetchAllPoetsWithStats(),
    fetchAllErasWithStats(),
    fetchAllMetersWithStats(),
    fetchAllRhymesWithStats(),
    fetchAllThemesWithStats(),
  ]);

  // Poem pages
  const poemPages: MetadataRoute.Sitemap = poemSlugs.map((slug) => ({
    url: `${SITE_URL}/poems/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  // Poet list pages
  const totalPoets = poets.length;
  const poetListPages = generatePageNumbers(totalPoets, FETCH_PER_PAGE);
  const poetListEntries: MetadataRoute.Sitemap = poetListPages.map((page, index) => ({
    url: `${SITE_URL}/poets/page/${page}`,
    lastModified: now,
    changeFrequency: index === 0 ? ('weekly' as const) : ('monthly' as const),
    priority: index === 0 ? 0.7 : 0.6,
  }));

  // Poet detail pages (with pagination)
  const poetDetailEntries: MetadataRoute.Sitemap = poets.flatMap((poet) => {
    const pages = generatePageNumbers(poet.poemsCount, FETCH_PER_PAGE);
    return pages.map((page, index) => ({
      url: `${SITE_URL}/poets/${poet.slug}/page/${page}`,
      lastModified: now,
      changeFrequency: index === 0 ? ('weekly' as const) : ('monthly' as const),
      priority: index === 0 ? 0.8 : 0.6,
    }));
  });

  // Era pages (with pagination)
  const eraEntries: MetadataRoute.Sitemap = eras.flatMap((era) => {
    const pages = generatePageNumbers(era.poemsCount, FETCH_PER_PAGE);
    return pages.map((page, index) => ({
      url: `${SITE_URL}/eras/${era.slug}/page/${page}`,
      lastModified: now,
      changeFrequency: index === 0 ? ('weekly' as const) : ('monthly' as const),
      priority: index === 0 ? 0.8 : 0.6,
    }));
  });

  // Meter pages (with pagination)
  const meterEntries: MetadataRoute.Sitemap = meters.flatMap((meter) => {
    const pages = generatePageNumbers(meter.poemsCount, FETCH_PER_PAGE);
    return pages.map((page, index) => ({
      url: `${SITE_URL}/meters/${meter.slug}/page/${page}`,
      lastModified: now,
      changeFrequency: index === 0 ? ('weekly' as const) : ('monthly' as const),
      priority: index === 0 ? 0.8 : 0.6,
    }));
  });

  // Rhyme pages (with pagination)
  const rhymeEntries: MetadataRoute.Sitemap = rhymes.flatMap((rhyme) => {
    const pages = generatePageNumbers(rhyme.poemsCount, FETCH_PER_PAGE);
    return pages.map((page, index) => ({
      url: `${SITE_URL}/rhymes/${rhyme.slug}/page/${page}`,
      lastModified: now,
      changeFrequency: index === 0 ? ('weekly' as const) : ('monthly' as const),
      priority: index === 0 ? 0.8 : 0.6,
    }));
  });

  // Theme pages (with pagination)
  const themeEntries: MetadataRoute.Sitemap = themes.flatMap((theme) => {
    const pages = generatePageNumbers(theme.poemsCount, FETCH_PER_PAGE);
    return pages.map((page, index) => ({
      url: `${SITE_URL}/themes/${theme.slug}/page/${page}`,
      lastModified: now,
      changeFrequency: index === 0 ? ('weekly' as const) : ('monthly' as const),
      priority: index === 0 ? 0.8 : 0.6,
    }));
  });

  return [
    ...staticPages,
    ...poetListEntries,
    ...poetDetailEntries,
    ...eraEntries,
    ...meterEntries,
    ...rhymeEntries,
    ...themeEntries,
    ...poemPages,
  ];
}
