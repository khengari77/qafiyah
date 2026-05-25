-- Idempotent: safe to re-run. Truncates then re-inserts.
-- Run this against the target DB before running pg_dump.
--
-- Uses LATERAL + LIMIT 5 per source so work is bounded at 79K × 5 × 6 rows,
-- regardless of how large each era/theme/meter group is. Each source is an
-- indexed equijoin — no full cross-product.
-- Duplicate candidates (matching on multiple signals) keep their highest score.

TRUNCATE public.poem_relations;

INSERT INTO public.poem_relations (poem_id, related_id, score, rank)
WITH

-- Pre-compute the attributes we join on to avoid repeated lookups
sources AS (
  SELECT
    p.id          AS poem_id,
    p.collection_id,
    p.poet_id,
    pt.era_id,
    p.theme_id,
    p.rhyme_id,
    p.meter_id
  FROM public.poems p
  JOIN public.poets pt ON pt.id = p.poet_id
),

-- For each poem, draw up to 5 candidates from each source in priority order
candidates AS (
  SELECT s.poem_id, c.related_id, c.score, c.related_slug
  FROM sources s,
  LATERAL (
    -- Source 1: same collection (score 6)
    (SELECT p2.id AS related_id, 6::smallint AS score, p2.slug AS related_slug
     FROM public.poems p2
     WHERE p2.collection_id = s.collection_id AND p2.id <> s.poem_id
       AND s.collection_id IS NOT NULL
     ORDER BY p2.slug LIMIT 5)

    UNION ALL

    -- Source 2: same poet (score 5)
    (SELECT p2.id, 5::smallint, p2.slug
     FROM public.poems p2
     WHERE p2.poet_id = s.poet_id AND p2.id <> s.poem_id
     ORDER BY p2.slug LIMIT 5)

    UNION ALL

    -- Source 3: same era (score 4)
    (SELECT p2.id, 4::smallint, p2.slug
     FROM public.poems p2
     JOIN public.poets pt2 ON pt2.id = p2.poet_id
     WHERE pt2.era_id = s.era_id AND p2.id <> s.poem_id
     ORDER BY p2.slug LIMIT 5)

    UNION ALL

    -- Source 4: same theme (score 3)
    (SELECT p2.id, 3::smallint, p2.slug
     FROM public.poems p2
     WHERE p2.theme_id = s.theme_id AND p2.id <> s.poem_id
       AND s.theme_id IS NOT NULL
     ORDER BY p2.slug LIMIT 5)

    UNION ALL

    -- Source 5: same rhyme (score 2)
    (SELECT p2.id, 2::smallint, p2.slug
     FROM public.poems p2
     WHERE p2.rhyme_id = s.rhyme_id AND p2.id <> s.poem_id
       AND s.rhyme_id IS NOT NULL
     ORDER BY p2.slug LIMIT 5)

    UNION ALL

    -- Source 6: same meter (score 1)
    (SELECT p2.id, 1::smallint, p2.slug
     FROM public.poems p2
     WHERE p2.meter_id = s.meter_id AND p2.id <> s.poem_id
     ORDER BY p2.slug LIMIT 5)
  ) c
),

-- When a candidate matches multiple signals, keep the highest score
best AS (
  SELECT DISTINCT ON (poem_id, related_id)
    poem_id, related_id, score, related_slug
  FROM candidates
  ORDER BY poem_id, related_id, score DESC
),

-- Rank within each poem: highest score first, slug as tiebreaker
ranked AS (
  SELECT
    poem_id,
    related_id,
    score,
    ROW_NUMBER() OVER (
      PARTITION BY poem_id
      ORDER BY score DESC, related_slug ASC
    )::smallint AS rank
  FROM best
)

SELECT poem_id, related_id, score, rank
FROM ranked
WHERE rank <= 5;
