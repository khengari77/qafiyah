import { cleanArabicQuery, parseIds, searchQueries } from '@qafiyah/db';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppContext } from '../types';

type ErrorTypeDefinition = { code: ContentfulStatusCode; type: string };
type ErrorTypeKey =
  | 'VALIDATION'
  | 'EMPTY_QUERY'
  | 'INVALID_SEARCH_TYPE'
  | 'INVALID_POEM_QUERY'
  | 'INVALID_POET_QUERY'
  | 'SERVER_ERROR';

const ERROR_TYPES: Record<ErrorTypeKey, ErrorTypeDefinition> = {
  VALIDATION: { code: 400, type: 'VALIDATION_ERROR' },
  EMPTY_QUERY: { code: 400, type: 'EMPTY_QUERY' },
  INVALID_SEARCH_TYPE: { code: 400, type: 'INVALID_SEARCH_TYPE' },
  INVALID_POEM_QUERY: { code: 400, type: 'INVALID_POEM_QUERY' },
  INVALID_POET_QUERY: { code: 400, type: 'INVALID_POET_QUERY' },
  SERVER_ERROR: { code: 500, type: 'SERVER_ERROR' },
};

const app = new Hono<AppContext>()
  .get('/', async (c) => {
    try {
      const q = c.req.query('q') ?? '';
      const rawSearchType = c.req.query('search_type');
      if (rawSearchType !== 'poems' && rawSearchType !== 'poets') {
        throw new HTTPException(ERROR_TYPES.INVALID_SEARCH_TYPE.code, {
          message: 'نوع البحث غير صالح',
        });
      }
      const search_type = rawSearchType;
      const page = Math.max(1, Number(c.req.query('page')) || 1);
      const match_type = c.req.query('match_type') ?? 'all';
      const meter_ids = c.req.query('meter_ids');
      const era_ids = c.req.query('era_ids');
      const rhyme_ids = c.req.query('rhyme_ids');
      const theme_ids = c.req.query('theme_ids');

      const db = c.get('db');
      const sanitizedQuery = decodeURIComponent(cleanArabicQuery(q));

      if (!sanitizedQuery) {
        throw new HTTPException(ERROR_TYPES.EMPTY_QUERY.code, {
          message: 'لا نقل إلا الحروف العربية',
        });
      }

      const meterIds = parseIds(meter_ids);
      const eraIds = parseIds(era_ids);
      const rhymeIds = parseIds(rhyme_ids);
      const themeIds = parseIds(theme_ids);

      let dbResult: Awaited<ReturnType<typeof searchQueries.searchPoems>>;

      switch (search_type) {
        case 'poems': {
          dbResult = await searchQueries.searchPoems(
            db,
            sanitizedQuery,
            page,
            match_type,
            meterIds,
            eraIds,
            themeIds,
            rhymeIds
          );
          break;
        }
        case 'poets': {
          dbResult = await searchQueries.searchPoets(db, sanitizedQuery, page, match_type, eraIds);
          break;
        }
      }

      const results = dbResult || [];

      if (results.length === 0) {
        return c.json({
          success: true,
          data: {
            results: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalResults: 0,
              hasNextPage: false,
              hasPrevPage: page > 1,
            },
          },
        });
      }

      const totalResults =
        results.length > 0 && results[0]?.['total_count'] ? Number(results[0]['total_count']) : 0;
      const resultsPerPage = search_type === 'poems' ? 5 : 10;
      const totalPages = Math.ceil(totalResults / resultsPerPage);
      const pagination = {
        currentPage: page,
        totalPages,
        totalResults,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      };

      const responseData = {
        results: results.map((r) => {
          const totalCount =
            typeof r['total_count'] === 'number'
              ? r['total_count']
              : typeof r['total_count'] === 'string'
                ? Number.parseInt(r['total_count'], 10) || 0
                : 0;
          if (search_type === 'poems') {
            return {
              poet_name: String(r['poet_name'] ?? ''),
              poet_era: String(r['poet_era'] ?? ''),
              poet_slug: String(r['poet_slug'] ?? ''),
              poem_title: String(r['poem_title'] ?? ''),
              poem_snippet: String(r['poem_snippet'] ?? ''),
              poem_meter: String(r['poem_meter'] ?? ''),
              poem_slug: String(r['poem_slug'] ?? ''),
              relevance: Number(r['relevance'] ?? 0),
              total_count: totalCount,
            };
          }
          return {
            poet_name: String(r['poet_name'] ?? ''),
            poet_era: String(r['poet_era'] ?? ''),
            poet_slug: String(r['poet_slug'] ?? ''),
            poet_bio: String(r['poet_bio'] ?? ''),
            relevance: Number(r['relevance'] ?? 0),
            total_count: totalCount,
          };
        }),
        pagination,
      };
      return c.json({ success: true, data: responseData });
    } catch (error) {
      if (!(error instanceof HTTPException)) {
        console.error(error);
        throw new HTTPException(ERROR_TYPES.SERVER_ERROR.code, {
          message: 'حدث خطأ غير متوقع في الخادم',
        });
      }
      throw error;
    }
  })
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ success: false, error: error.message, status: error.status }, error.status);
    }
    console.error(error);
    return c.json(
      { success: false, error: 'Internal Server Error. SEARCH Route', status: 500 },
      500
    );
  });

export default app;
