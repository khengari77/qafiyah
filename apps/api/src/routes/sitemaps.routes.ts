import { PROD_API_URL as API_URL, PROD_SITE_URL as SITE_URL } from '@qafiyah/constants';
import { MAX_URLS_PER_SITEMAP, sitemapQueries } from '@qafiyah/db';
import { Hono } from 'hono';
import type { AppContext } from '../types';
import {
  createPagedEntries,
  generateSitemapIndexXml,
  generateUrlEntriesXml,
  toPriority,
  type UrlEntry,
} from '../utils/xml-sitemaps';

const app = new Hono<AppContext>()

  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* ENTRY -------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->

  .get('/', async (c) => {
    const db = c.get('db');

    const count = await sitemapQueries.getPoemCount(db);
    const totalPoemSitemaps = Math.ceil(count / MAX_URLS_PER_SITEMAP);

    const staticSitemaps: UrlEntry[] = ['main', 'poets', 'eras', 'meters', 'rhymes', 'themes'].map(
      (name) => ({
        url: `${API_URL}/sitemaps/${name}`,
        lastmod: new Date().toISOString(),
      })
    );

    const poemSitemaps: UrlEntry[] = Array.from({ length: totalPoemSitemaps }, (_, i) => ({
      url: `${API_URL}/sitemaps/poems/${i + 1}`,
      lastmod: new Date().toISOString(),
    }));

    const xml = generateSitemapIndexXml([...staticSitemaps, ...poemSitemaps]);

    c.header('Content-Type', 'application/xml');
    return c.body(xml);
  })

  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* MAIN --------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->

  .get('/main', async (c) => {
    const xml = generateUrlEntriesXml([
      {
        url: SITE_URL,
        lastmod: new Date().toISOString(),
        changefreq: 'hourly',
        priority: toPriority(1.0),
      },
    ]);

    c.header('Content-Type', 'application/xml');
    return c.body(xml);
  })

  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* POEMS/:PAGE -------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->

  .get('/poems/:page', async (c) => {
    const db = c.get('db');
    const page = Math.max(1, Number(c.req.param('page')) || 1);

    const poems = await sitemapQueries.listSitemapPoems(db, page);

    const entries: UrlEntry[] = poems.map((poem) => ({
      url: `${SITE_URL}/poems/${poem.slug}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: toPriority(0.9),
    }));

    const xml = generateUrlEntriesXml(entries);

    c.header('Content-Type', 'application/xml');
    return c.body(xml);
  })

  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* POETS -------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->

  .get('/poets', async (c) => {
    const db = c.get('db');

    const { count, poets } = await sitemapQueries.listPoetSitemapData(db);

    const poetListEntries: UrlEntry[] = createPagedEntries({
      baseUrl: `${SITE_URL}/poets`,
      count,
      firstPageChangefreq: 'weekly',
      firstPagePriority: toPriority(0.7),
      baseChangefreq: 'monthly',
      basePriority: toPriority(0.6),
    });

    const poetEntries: UrlEntry[] = poets.flatMap((poet) =>
      createPagedEntries({
        baseUrl: `${SITE_URL}/poets/${poet.slug}`,
        count: poet.poemsCount,
        firstPageChangefreq: 'weekly',
        firstPagePriority: toPriority(0.8),
        baseChangefreq: 'monthly',
        basePriority: toPriority(0.6),
      })
    );

    const xml = generateUrlEntriesXml([...poetListEntries, ...poetEntries]);

    c.header('Content-Type', 'application/xml');
    return c.body(xml);
  })

  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* ERAS --------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->

  .get('/eras', async (c) => {
    const db = c.get('db');
    const eras = await sitemapQueries.listEraStats(db);

    const listEntries: UrlEntry[] = [
      {
        url: `${SITE_URL}/eras`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: toPriority(0.7),
      },
    ];

    const itemEntries: UrlEntry[] = eras.flatMap((era) =>
      createPagedEntries({
        baseUrl: `${SITE_URL}/eras/${era.slug}`,
        count: era.poemsCount,
        firstPageChangefreq: 'weekly',
        firstPagePriority: toPriority(0.8),
        baseChangefreq: 'monthly',
        basePriority: toPriority(0.6),
      })
    );

    const xml = generateUrlEntriesXml([...listEntries, ...itemEntries]);

    c.header('Content-Type', 'application/xml');
    return c.body(xml);
  })

  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* METERS ------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->

  .get('/meters', async (c) => {
    const db = c.get('db');
    const meters = await sitemapQueries.listMeterStats(db);

    const listEntries: UrlEntry[] = [
      {
        url: `${SITE_URL}/meters`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: toPriority(0.7),
      },
    ];

    const itemEntries: UrlEntry[] = meters.flatMap((meter) =>
      createPagedEntries({
        baseUrl: `${SITE_URL}/meters/${meter.slug}`,
        count: meter.poemsCount,
        firstPageChangefreq: 'weekly',
        firstPagePriority: toPriority(0.8),
        baseChangefreq: 'monthly',
        basePriority: toPriority(0.6),
      })
    );

    const xml = generateUrlEntriesXml([...listEntries, ...itemEntries]);

    c.header('Content-Type', 'application/xml');
    return c.body(xml);
  })

  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* RHYMES ------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->

  .get('/rhymes', async (c) => {
    const db = c.get('db');
    const rhymes = await sitemapQueries.listRhymeStats(db);

    const listEntries: UrlEntry[] = [
      {
        url: `${SITE_URL}/rhymes`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: toPriority(0.7),
      },
    ];

    const itemEntries: UrlEntry[] = rhymes.flatMap((rhyme) =>
      createPagedEntries({
        baseUrl: `${SITE_URL}/rhymes/${rhyme.slug}`,
        count: rhyme.poemsCount,
        firstPageChangefreq: 'weekly',
        firstPagePriority: toPriority(0.8),
        baseChangefreq: 'monthly',
        basePriority: toPriority(0.6),
      })
    );

    const xml = generateUrlEntriesXml([...listEntries, ...itemEntries]);

    c.header('Content-Type', 'application/xml');
    return c.body(xml);
  })

  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* THEMES ------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->
  //* -------------------------------------------------------->

  .get('/themes', async (c) => {
    const db = c.get('db');
    const themes = await sitemapQueries.listThemeStats(db);

    const listEntries: UrlEntry[] = [
      {
        url: `${SITE_URL}/themes`,
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: toPriority(0.7),
      },
    ];

    const itemEntries: UrlEntry[] = themes.flatMap((theme) =>
      createPagedEntries({
        baseUrl: `${SITE_URL}/themes/${theme.slug}`,
        count: theme.poemsCount,
        firstPageChangefreq: 'weekly',
        firstPagePriority: toPriority(0.8),
        baseChangefreq: 'monthly',
        basePriority: toPriority(0.6),
      })
    );

    const xml = generateUrlEntriesXml([...listEntries, ...itemEntries]);

    c.header('Content-Type', 'application/xml');
    return c.body(xml);
  })

  //! -------------------------------------------------------->
  //! -------------------------------------------------------->
  //! -------------------------------------------------------->
  //! -------------------------------------------------------->
  //! ERR HANDLING ------------------------------------------->
  //! -------------------------------------------------------->
  //! -------------------------------------------------------->
  //! -------------------------------------------------------->

  .onError((error, c) => {
    console.error(error);
    return c.json(
      {
        success: false,
        error: 'Internal Server Error. SITEMAPS Route',
        status: 500,
      },
      500
    );
  });

export default app;
