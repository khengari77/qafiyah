import type { CollectionSlug, MeterSlug, RhymeSlug, ThemeSlug } from '@qafiyah/contracts';
import { SCHEMA_ORG_CONTEXT, SITE_NAME_AR, SITE_URL } from '@/constants';
import { toArabicDigits } from '@/lib/arabic';
import { type BreadcrumbItem, breadcrumbListJsonLd } from '@/lib/breadcrumbs';
import { derivePagination, type PaginationView } from '@/lib/pagination';
import { allCollections, getCollection } from '@/lib/server/collections';
import { listPoems, type PoemFilters } from '@/lib/server/poems';
import {
  allMeters,
  allRhymes,
  allThemes,
  getMeter,
  getRhyme,
  getTheme,
} from '@/lib/server/taxonomies';
import type { ApiOutputs } from '@/lib/server/types';
import { poemUrl, type TaxonomySection, taxonomyIndexUrl, taxonomyUrl } from '@/lib/urls';

type JsonLd = Readonly<Record<string, unknown>>;
type PoemRow = ApiOutputs['poems']['list']['data'][number];

/** Card shape consumed by poem-list-body.astro (kept structural, not imported). */
type ListCardItem = { readonly title: string; readonly subtitle: string; readonly href: string };

/** Minimal shape every taxonomy term shares (meter/rhyme/theme/collection). */
type TermData = { readonly name: string; readonly slug: string; readonly poemsCount: number };
type IndexTermData = TermData & { readonly poetsCount?: number };

type LayoutView = {
  readonly title: string;
  readonly description: string;
  readonly canonical: string;
  readonly prevUrl?: string | undefined;
  readonly nextUrl?: string | undefined;
  readonly jsonLd: readonly JsonLd[];
};

// -- Per-section copy -------------------------------------------------------
// The Arabic phrasing is genuinely irregular across sections (e.g. "على بحر"
// vs "من غرض"), so each section supplies its own string builders rather than a
// derived template. This is the lookup table that replaces four near-identical
// page files.

type TermPageConfig = {
  readonly get: (slug: string) => Promise<TermData | null>;
  readonly makeFilters: (slug: string) => PoemFilters;
  readonly crumbLabel: string;
  /** Page `<title>` lead, after "قافية | ". */
  readonly titleLead: (name: string) => string;
  /** Meta description lead, before " على قافية — …". */
  readonly descLead: (name: string) => string;
  readonly jsonLdName: (name: string) => string;
  readonly jsonLdDescLead: (name: string) => string;
  readonly heading: (name: string, countAr: string) => string;
  readonly emptyText: string;
  /** The card's second line (poet name, or meter name for rhymes). */
  readonly secondary: (poem: PoemRow) => string;
};

const TERM_PAGE_CONFIG: Record<TaxonomySection, TermPageConfig> = {
  meters: {
    get: (slug) => getMeter(slug as MeterSlug),
    makeFilters: (slug) => ({ meterSlugs: [slug as MeterSlug] }),
    crumbLabel: 'البحور',
    titleLead: (name) => `قصائد بحر ${name}`,
    descLead: (name) => `قصائد على بحر ${name}`,
    jsonLdName: (name) => `قصائد بحر ${name}`,
    jsonLdDescLead: (name) => `مجموعة قصائد على بحر ${name}`,
    heading: (name, countAr) => `قصائد بحر ${name} (${countAr} قصيدة)`,
    emptyText: 'لا توجد قصائد لهذا البحر.',
    secondary: (poem) => poem.poet.name,
  },
  rhymes: {
    get: (slug) => getRhyme(slug as RhymeSlug),
    makeFilters: (slug) => ({ rhymeSlugs: [slug as RhymeSlug] }),
    crumbLabel: 'القوافي',
    titleLead: (name) => `قصائد على قافية ${name}`,
    descLead: (name) => `قصائد على قافية ${name}`,
    jsonLdName: (name) => `قصائد قافية ${name}`,
    jsonLdDescLead: (name) => `مجموعة قصائد على قافية ${name}`,
    heading: (name, countAr) => `${name} (${countAr} قصيدة)`,
    emptyText: 'لا توجد قصائد لهذه القافية.',
    secondary: (poem) => poem.meter.name,
  },
  themes: {
    get: (slug) => getTheme(slug as ThemeSlug),
    makeFilters: (slug) => ({ themeSlugs: [slug as ThemeSlug] }),
    crumbLabel: 'الأغراض',
    titleLead: (name) => `قصائد غرض ${name}`,
    descLead: (name) => `قصائد غرض ${name}`,
    jsonLdName: (name) => `قصائد غرض ${name}`,
    jsonLdDescLead: (name) => `مجموعة قصائد من غرض ${name}`,
    heading: (name, countAr) => `قصائد ${name} (${countAr} قصيدة)`,
    emptyText: 'لا توجد قصائد لهذا الغرض.',
    secondary: (poem) => poem.poet.name,
  },
  collections: {
    get: (slug) => getCollection(slug as CollectionSlug),
    makeFilters: (slug) => ({ collectionSlugs: [slug as CollectionSlug] }),
    crumbLabel: 'الدواوين',
    titleLead: (name) => `قصائد ديوان ${name}`,
    descLead: (name) => `قصائد ديوان ${name}`,
    jsonLdName: (name) => `قصائد ديوان ${name}`,
    jsonLdDescLead: (name) => `مجموعة قصائد من ديوان ${name}`,
    heading: (name, countAr) => `قصائد ${name} (${countAr} قصيدة)`,
    emptyText: 'لا توجد قصائد في هذا الديوان.',
    secondary: (poem) => poem.poet.name,
  },
};

type IndexPageConfig = {
  readonly all: () => Promise<readonly IndexTermData[]>;
  readonly filter?: (term: IndexTermData) => boolean;
  readonly metaTitle: string;
  readonly metaDescription: (countAr: string) => string;
  readonly jsonLdName: string;
  readonly jsonLdListDescription: (countAr: string) => string;
  readonly jsonLdItemDescription: (name: string, poemsCountAr: string) => string;
  readonly crumbLabel: string;
  readonly heading: (countAr: string) => string;
  readonly subtitle: (term: IndexTermData) => string;
};

const INDEX_PAGE_CONFIG: Record<TaxonomySection, IndexPageConfig> = {
  meters: {
    all: allMeters,
    metaTitle: `${SITE_NAME_AR} | تصفح حسب البحور`,
    metaDescription: (countAr) =>
      `بحور الشعر العربي على ${SITE_NAME_AR}: الطويل والكامل والوافر والبسيط والمتقارب والمتدارك والرمل والرجز وغيرها — ${countAr} بحرًا مع عدد القصائد المتوفرة لكل بحر.`,
    jsonLdName: 'البحور الشعرية',
    jsonLdListDescription: (countAr) =>
      `قائمة بجميع البحور الشعرية في موقع ${SITE_NAME_AR} - ${countAr} بحر`,
    jsonLdItemDescription: (name, poemsCountAr) => `قصائد من بحر ${name} - ${poemsCountAr} قصيدة`,
    crumbLabel: 'البحور',
    heading: (countAr) => `جميع البحور (${countAr} بحر)`,
    subtitle: (term) =>
      `${toArabicDigits(term.poetsCount ?? 0)} شاعر و ${toArabicDigits(term.poemsCount)} قصيدة`,
  },
  rhymes: {
    all: allRhymes,
    filter: (term) => term.poemsCount > 0,
    metaTitle: `${SITE_NAME_AR} | تصفح حسب القوافي`,
    metaDescription: (countAr) =>
      `قوافي الشعر العربي على ${SITE_NAME_AR}: من الهمزة إلى الياء — تصفح القصائد حسب حرف الروي مع إحصاءات لكل قافية (${countAr} حرفًا).`,
    jsonLdName: 'القوافي الشعرية',
    jsonLdListDescription: (countAr) =>
      `قائمة بجميع القوافي الشعرية في موقع ${SITE_NAME_AR} - ${countAr} قافية`,
    jsonLdItemDescription: (name, poemsCountAr) =>
      `قصائد على قافية ${name} - ${poemsCountAr} قصيدة`,
    crumbLabel: 'القوافي',
    heading: (countAr) => `جميع القوافي (${countAr} حرف)`,
    // @NOTE: no space after "و" here, unlike meters — preserved from the
    // originals; normalize both in one place if the inconsistency matters.
    subtitle: (term) =>
      `${toArabicDigits(term.poetsCount ?? 0)} شاعر و${toArabicDigits(term.poemsCount)} قصيدة`,
  },
  themes: {
    all: allThemes,
    metaTitle: `${SITE_NAME_AR} | تصفح حسب الأغراض`,
    metaDescription: (countAr) =>
      `أغراض الشعر العربي على ${SITE_NAME_AR}: المدح والرثاء والغزل والهجاء والحكمة والوصف وغيرها — ${countAr} غرضًا مع إحصاءات القصائد لكل غرض.`,
    jsonLdName: 'أغراض الشعر',
    jsonLdListDescription: (countAr) =>
      `قائمة بجميع أغراض الشعر في موقع ${SITE_NAME_AR} - ${countAr} غرض`,
    jsonLdItemDescription: (name, poemsCountAr) => `قصائد من غرض ${name} - ${poemsCountAr} قصيدة`,
    crumbLabel: 'الأغراض',
    heading: (countAr) => `جميع الأغراض (${countAr} غرض)`,
    subtitle: (term) => `${toArabicDigits(term.poemsCount)} قصيدة`,
  },
  collections: {
    all: allCollections,
    metaTitle: `${SITE_NAME_AR} | تصفح حسب الدواوين`,
    metaDescription: (countAr) =>
      `دواوين الشعر العربي على ${SITE_NAME_AR}: المعلقات وغيرها — ${countAr} ديوان مع إحصاءات القصائد لكل ديوان.`,
    jsonLdName: 'دواوين الشعر',
    jsonLdListDescription: (countAr) =>
      `قائمة بجميع دواوين الشعر في موقع ${SITE_NAME_AR} - ${countAr} ديوان`,
    jsonLdItemDescription: (name, poemsCountAr) => `قصائد من ديوان ${name} - ${poemsCountAr} قصيدة`,
    crumbLabel: 'الدواوين',
    heading: (countAr) => `جميع الدواوين (${countAr} ديوان)`,
    subtitle: (term) => `${toArabicDigits(term.poemsCount)} قصيدة`,
  },
};

// -- Term page (poems under one taxonomy term) ------------------------------

export type TaxonomyTermLoad = {
  readonly term: TermData;
  readonly poems: readonly PoemRow[];
  readonly pagination: { readonly page: number; readonly totalPages: number };
};

/** Fetch the term and its page of poems. Null = nothing to render (→ /404). */
export async function loadTaxonomyTerm(
  section: TaxonomySection,
  slug: string,
  page: number
): Promise<TaxonomyTermLoad | null> {
  const cfg = TERM_PAGE_CONFIG[section];
  const [term, list] = await Promise.all([cfg.get(slug), listPoems(cfg.makeFilters(slug), page)]);
  if (!(term && list)) return null;
  return { term, poems: list.poems, pagination: list.pagination };
}

export function buildTaxonomyTermView(section: TaxonomySection, load: TaxonomyTermLoad) {
  const cfg = TERM_PAGE_CONFIG[section];
  const { term, poems, pagination } = load;
  const { slug, name } = term;
  const pageAr = toArabicDigits(pagination.page);
  const totalAr = toArabicDigits(pagination.totalPages);
  const countAr = toArabicDigits(term.poemsCount);

  const collectionJsonLd: JsonLd = {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'Collection',
    name: cfg.jsonLdName(name),
    url: `${SITE_URL}${taxonomyUrl(section, slug, pagination.page)}`,
    description: `${cfg.jsonLdDescLead(name)} - الصفحة ${pageAr} من ${totalAr}`,
    mainEntityOfPage: {
      '@type': 'CollectionPage',
      name: cfg.jsonLdName(name),
      url: `${SITE_URL}${taxonomyUrl(section, slug)}`,
    },
    numberOfItems: term.poemsCount,
    itemListElement: poems.map((poem, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: { '@type': 'CreativeWork', name: poem.title, url: `${SITE_URL}${poemUrl(poem.slug)}` },
    })),
  };

  const crumbItems: readonly BreadcrumbItem[] = [
    { name: SITE_NAME_AR, path: '/' },
    { name: cfg.crumbLabel, path: taxonomyIndexUrl(section) },
    { name, path: taxonomyUrl(section, slug) },
  ];

  const pag: PaginationView = derivePagination(pagination, (p) => taxonomyUrl(section, slug, p));

  const items: readonly ListCardItem[] = poems.map((poem) => ({
    title: poem.title,
    subtitle: cfg.secondary(poem),
    href: poemUrl(poem.slug),
  }));

  const layout: LayoutView = {
    title: `${SITE_NAME_AR} | ${cfg.titleLead(name)}`,
    description: `${cfg.descLead(name)} على ${SITE_NAME_AR} — الصفحة ${pageAr} من ${totalAr}، ${countAr} قصيدة.`,
    canonical: taxonomyUrl(section, slug, pagination.page),
    prevUrl: pag.hasPrevPage ? pag.prevPageUrl : undefined,
    nextUrl: pag.hasNextPage ? pag.nextPageUrl : undefined,
    jsonLd: [collectionJsonLd, breadcrumbListJsonLd(crumbItems)],
  };

  return {
    layout,
    body: {
      heading: cfg.heading(name, countAr),
      crumbItems,
      items,
      emptyText: cfg.emptyText,
      pagination: pag,
    },
  };
}

// -- Index page (the list of terms) -----------------------------------------

/** Fetch (and optionally filter) all terms for a section's index page. */
export async function loadTaxonomyIndex(
  section: TaxonomySection
): Promise<readonly IndexTermData[]> {
  const cfg = INDEX_PAGE_CONFIG[section];
  const terms = await cfg.all();
  return cfg.filter ? terms.filter(cfg.filter) : terms;
}

export function buildTaxonomyIndexView(section: TaxonomySection, terms: readonly IndexTermData[]) {
  const cfg = INDEX_PAGE_CONFIG[section];
  const countAr = toArabicDigits(terms.length);

  const collectionJsonLd: JsonLd = {
    '@context': SCHEMA_ORG_CONTEXT,
    '@type': 'CollectionPage',
    name: cfg.jsonLdName,
    url: `${SITE_URL}${taxonomyIndexUrl(section)}`,
    description: cfg.jsonLdListDescription(countAr),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME_AR, url: SITE_URL },
    numberOfItems: terms.length,
    itemListElement: terms.map((term, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Collection',
        name: term.name,
        url: `${SITE_URL}${taxonomyUrl(section, term.slug)}`,
        description: cfg.jsonLdItemDescription(term.name, toArabicDigits(term.poemsCount)),
      },
    })),
  };

  const crumbsJsonLd = breadcrumbListJsonLd([
    { name: SITE_NAME_AR, path: '/' },
    { name: cfg.crumbLabel, path: taxonomyIndexUrl(section) },
  ]);

  const items: readonly ListCardItem[] = terms.map((term) => ({
    title: term.name,
    subtitle: cfg.subtitle(term),
    href: taxonomyUrl(section, term.slug),
  }));

  const layout: LayoutView = {
    title: cfg.metaTitle,
    description: cfg.metaDescription(countAr),
    canonical: taxonomyIndexUrl(section),
    jsonLd: [collectionJsonLd, crumbsJsonLd],
  };

  return {
    layout,
    body: {
      heading: cfg.heading(countAr),
      items,
      emptyText: 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.',
      emptyVariant: 'error' as const,
    },
  };
}
