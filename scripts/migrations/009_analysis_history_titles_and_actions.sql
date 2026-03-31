-- ============================================================
-- PMCopilot - Analysis history title quality + search indexes
-- Non-destructive migration. No DROP TABLE or DELETE statements.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.analysis_sessions
  ALTER COLUMN title SET NOT NULL;

-- Backfill missing/weak titles using prompt text when available.
WITH normalized AS (
  SELECT
    id,
    trim(
      regexp_replace(
        regexp_replace(coalesce(prompt, ''), '\s+', ' ', 'g'),
        '^(i am|i''m|i want to|i need to|we want to|we need to)\s+',
        '',
        'i'
      )
    ) AS cleaned_prompt,
    coalesce(metadata->>'project_name', 'Project') AS project_name
  FROM public.analysis_sessions
)
UPDATE public.analysis_sessions s
SET title = CASE
  WHEN n.cleaned_prompt <> '' THEN left(initcap(n.cleaned_prompt), 96)
  ELSE left('Analysis - ' || n.project_name, 96)
END
FROM normalized n
WHERE s.id = n.id
  AND (
    s.title IS NULL
    OR btrim(s.title) = ''
    OR lower(btrim(s.title)) IN (
      'analysis session',
      'analysis',
      'demo',
      'untitled',
      'new analysis'
    )
    OR lower(btrim(s.title)) LIKE 'analysis - demo%'
    OR lower(btrim(s.title)) LIKE 'analysis - untitled%'
  );

-- Keep metadata session_title aligned with canonical title.
UPDATE public.analysis_sessions
SET metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{session_title}',
  to_jsonb(title),
  true
)
WHERE coalesce(metadata->>'session_title', '') IS DISTINCT FROM coalesce(title, '');

-- Search/sort performance indexes for history page.
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_project_created_at_desc
  ON public.analysis_sessions (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_project_title
  ON public.analysis_sessions (project_id, title);

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_title_trgm
  ON public.analysis_sessions
  USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_prompt_trgm
  ON public.analysis_sessions
  USING GIN (prompt gin_trgm_ops);

COMMIT;
