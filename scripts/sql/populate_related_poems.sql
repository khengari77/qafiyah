-- Idempotent: safe to re-run. Truncates then re-inserts.
-- Run this against the target DB before running pg_dump.

TRUNCATE public.poem_relations;

INSERT INTO public.poem_relations (poem_id, related_id, score, rank)
WITH scored AS (
  SELECT
    p1.id   AS poem_id,
    p2.id   AS related_id,
    p2.slug AS related_slug,
    (
      CASE WHEN p2.collection_id = p1.collection_id AND p1.collection_id IS NOT NULL THEN 6 ELSE 0 END +
      CASE WHEN p2.poet_id       = p1.poet_id                                         THEN 5 ELSE 0 END +
      CASE WHEN pt2.era_id       = pt1.era_id                                         THEN 4 ELSE 0 END +
      CASE WHEN p2.theme_id      = p1.theme_id      AND p1.theme_id IS NOT NULL       THEN 3 ELSE 0 END +
      CASE WHEN p2.rhyme_id      = p1.rhyme_id      AND p1.rhyme_id IS NOT NULL       THEN 2 ELSE 0 END +
      CASE WHEN p2.meter_id      = p1.meter_id                                        THEN 1 ELSE 0 END
    )::smallint AS score
  FROM public.poems p1
  JOIN public.poets pt1 ON pt1.id = p1.poet_id
  JOIN public.poems p2  ON p2.id <> p1.id
  JOIN public.poets pt2 ON pt2.id = p2.poet_id
),
ranked AS (
  SELECT
    poem_id,
    related_id,
    score,
    ROW_NUMBER() OVER (
      PARTITION BY poem_id
      ORDER BY score DESC, related_slug ASC
    )::smallint AS rank
  FROM scored
)
SELECT poem_id, related_id, score, rank
FROM ranked
WHERE rank <= 5;
