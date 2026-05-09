WITH kept_poems AS (
  SELECT id FROM poems ORDER BY id LIMIT 50
)
DELETE FROM poems WHERE id NOT IN (SELECT id FROM kept_poems);

DELETE FROM poets WHERE id NOT IN (
  SELECT DISTINCT poet_id FROM poems WHERE poet_id IS NOT NULL
);

REFRESH MATERIALIZED VIEW poem_full_data;
