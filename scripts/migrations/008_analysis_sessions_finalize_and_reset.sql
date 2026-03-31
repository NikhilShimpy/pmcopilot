-- ============================================================
-- PMCopilot: Analysis persistence finalize + fresh-start reset
-- Non-destructive to schema: NO DROP TABLE / NO DATABASE DELETE
-- This script only deletes old analysis DATA rows intentionally.
-- ============================================================

BEGIN;

-- Ensure UUID helper exists.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- 1) Ensure legacy analyses FK cascades on project delete
-- ------------------------------------------------------------
DO $$
DECLARE
  fk_name TEXT;
  fk_action "char";
BEGIN
  SELECT c.conname, c.confdeltype
  INTO fk_name, fk_action
  FROM pg_constraint c
  JOIN pg_class child ON child.oid = c.conrelid
  JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
  JOIN pg_class parent ON parent.oid = c.confrelid
  JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
  WHERE c.contype = 'f'
    AND child_ns.nspname = 'public'
    AND child.relname = 'analyses'
    AND parent_ns.nspname = 'public'
    AND parent.relname = 'projects'
  LIMIT 1;

  IF fk_name IS NULL THEN
    ALTER TABLE public.analyses
      ADD CONSTRAINT analyses_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  ELSIF fk_action <> 'c' THEN
    EXECUTE format('ALTER TABLE public.analyses DROP CONSTRAINT %I', fk_name);
    ALTER TABLE public.analyses
      ADD CONSTRAINT analyses_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2) Ensure normalized tables exist and are complete
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  prompt_hash TEXT,
  detail_level TEXT DEFAULT 'long',
  provider TEXT DEFAULT 'gemini',
  model TEXT,
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  required_sections TEXT[] NOT NULL DEFAULT ARRAY[
    'executive-dashboard',
    'problem-analysis',
    'feature-system',
    'gaps-opportunities',
    'prd',
    'system-design',
    'development-tasks',
    'execution-roadmap',
    'manpower-planning',
    'resources',
    'cost-estimation',
    'timeline',
    'impact-analysis'
  ]::TEXT[],
  generated_sections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  section_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.analysis_sessions
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS legacy_analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS prompt TEXT,
  ADD COLUMN IF NOT EXISTS prompt_hash TEXT,
  ADD COLUMN IF NOT EXISTS detail_level TEXT DEFAULT 'long',
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS required_sections TEXT[] NOT NULL DEFAULT ARRAY[
    'executive-dashboard',
    'problem-analysis',
    'feature-system',
    'gaps-opportunities',
    'prd',
    'system-design',
    'development-tasks',
    'execution-roadmap',
    'manpower-planning',
    'resources',
    'cost-estimation',
    'timeline',
    'impact-analysis'
  ]::TEXT[],
  ADD COLUMN IF NOT EXISTS generated_sections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS section_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.analysis_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  section_title TEXT,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'pending', 'failed')),
  content JSONB NOT NULL,
  provider TEXT DEFAULT 'gemini',
  model TEXT,
  input_hash TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT analysis_sections_session_section_unique UNIQUE(session_id, section_id)
);

ALTER TABLE public.analysis_sections
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS section_id TEXT,
  ADD COLUMN IF NOT EXISTS section_title TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'generated',
  ADD COLUMN IF NOT EXISTS content JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS input_hash TEXT,
  ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analysis_sections_session_section_unique'
      AND conrelid = 'public.analysis_sections'::regclass
  ) THEN
    ALTER TABLE public.analysis_sections
      ADD CONSTRAINT analysis_sections_session_section_unique UNIQUE (session_id, section_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_project_created
  ON public.analysis_sessions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_created
  ON public.analysis_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_legacy_analysis_id
  ON public.analysis_sessions(legacy_analysis_id);

CREATE INDEX IF NOT EXISTS idx_analysis_sections_session_id
  ON public.analysis_sections(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sections_project_id
  ON public.analysis_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sections_user_id
  ON public.analysis_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sections_content_gin
  ON public.analysis_sections USING GIN (content);

-- ------------------------------------------------------------
-- 3) Ensure RLS + policies exist for normalized analysis tables
-- ------------------------------------------------------------
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_sessions'
      AND policyname = 'analysis_sessions_select_own'
  ) THEN
    CREATE POLICY analysis_sessions_select_own
      ON public.analysis_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_sessions'
      AND policyname = 'analysis_sessions_insert_own'
  ) THEN
    CREATE POLICY analysis_sessions_insert_own
      ON public.analysis_sessions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_sessions'
      AND policyname = 'analysis_sessions_update_own'
  ) THEN
    CREATE POLICY analysis_sessions_update_own
      ON public.analysis_sessions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_sessions'
      AND policyname = 'analysis_sessions_delete_own'
  ) THEN
    CREATE POLICY analysis_sessions_delete_own
      ON public.analysis_sessions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_sections'
      AND policyname = 'analysis_sections_select_own'
  ) THEN
    CREATE POLICY analysis_sections_select_own
      ON public.analysis_sections FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_sections'
      AND policyname = 'analysis_sections_insert_own'
  ) THEN
    CREATE POLICY analysis_sections_insert_own
      ON public.analysis_sections FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_sections'
      AND policyname = 'analysis_sections_update_own'
  ) THEN
    CREATE POLICY analysis_sections_update_own
      ON public.analysis_sections FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_sections'
      AND policyname = 'analysis_sections_delete_own'
  ) THEN
    CREATE POLICY analysis_sections_delete_own
      ON public.analysis_sections FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;

-- ------------------------------------------------------------
-- 4) Fresh start for analysis data only (intentional)
--    NO TABLE DROPS. This clears old analysis rows.
-- ------------------------------------------------------------
DELETE FROM public.analysis_sections;
DELETE FROM public.analysis_sessions;
DELETE FROM public.analyses;

COMMIT;
