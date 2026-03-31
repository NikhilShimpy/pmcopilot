-- ============================================================
-- PMCopilot non-destructive persistence upgrade
-- Safe to run on existing Supabase projects.
-- No DROP TABLE / DELETE statements.
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- Core projects / analyses / feedbacks safety net
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'users_can_read_projects') THEN
    CREATE POLICY users_can_read_projects ON public.projects
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'users_can_insert_projects') THEN
    CREATE POLICY users_can_insert_projects ON public.projects
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'users_can_update_projects') THEN
    CREATE POLICY users_can_update_projects ON public.projects
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'users_can_delete_projects') THEN
    CREATE POLICY users_can_delete_projects ON public.projects
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON public.analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analyses' AND policyname = 'users_can_read_analyses') THEN
    CREATE POLICY users_can_read_analyses ON public.analyses
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analyses' AND policyname = 'users_can_insert_analyses') THEN
    CREATE POLICY users_can_insert_analyses ON public.analyses
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analyses' AND policyname = 'users_can_update_analyses') THEN
    CREATE POLICY users_can_update_analyses ON public.analyses
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analyses' AND policyname = 'users_can_delete_analyses') THEN
    CREATE POLICY users_can_delete_analyses ON public.analyses
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = analyses.project_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual',
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.feedbacks
  ALTER COLUMN source SET DEFAULT 'manual',
  ALTER COLUMN category SET DEFAULT 'other',
  ALTER COLUMN priority SET DEFAULT 'medium',
  ALTER COLUMN status SET DEFAULT 'new';

UPDATE public.feedbacks
SET source = 'manual'
WHERE source IS NULL OR source NOT IN ('manual', 'gmail', 'slack', 'intercom', 'webhook', 'api');

UPDATE public.feedbacks
SET category = 'other'
WHERE category IS NULL OR category NOT IN ('bug', 'feature', 'improvement', 'ux', 'performance', 'other');

UPDATE public.feedbacks
SET priority = 'medium'
WHERE priority IS NULL OR priority NOT IN ('low', 'medium', 'high', 'critical');

UPDATE public.feedbacks
SET status = 'new'
WHERE status IS NULL OR status NOT IN ('new', 'reviewed', 'planned', 'done');

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedbacks_source_check') THEN
    ALTER TABLE public.feedbacks
      ADD CONSTRAINT feedbacks_source_check
      CHECK (source IN ('manual', 'gmail', 'slack', 'intercom', 'webhook', 'api'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedbacks_category_check') THEN
    ALTER TABLE public.feedbacks
      ADD CONSTRAINT feedbacks_category_check
      CHECK (category IN ('bug', 'feature', 'improvement', 'ux', 'performance', 'other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedbacks_priority_check') THEN
    ALTER TABLE public.feedbacks
      ADD CONSTRAINT feedbacks_priority_check
      CHECK (priority IN ('low', 'medium', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feedbacks_status_check') THEN
    ALTER TABLE public.feedbacks
      ADD CONSTRAINT feedbacks_status_check
      CHECK (status IN ('new', 'reviewed', 'planned', 'done'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON public.feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_priority ON public.feedbacks(priority);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_by ON public.feedbacks(created_by);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_status ON public.feedbacks(project_id, status);

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedbacks' AND policyname = 'users_can_read_feedbacks') THEN
    CREATE POLICY users_can_read_feedbacks ON public.feedbacks
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = feedbacks.project_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedbacks' AND policyname = 'users_can_insert_feedbacks') THEN
    CREATE POLICY users_can_insert_feedbacks ON public.feedbacks
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = feedbacks.project_id
            AND p.user_id = auth.uid()
        )
        AND (created_by IS NULL OR created_by = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedbacks' AND policyname = 'users_can_update_feedbacks') THEN
    CREATE POLICY users_can_update_feedbacks ON public.feedbacks
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = feedbacks.project_id
            AND p.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = feedbacks.project_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'feedbacks' AND policyname = 'users_can_delete_feedbacks') THEN
    CREATE POLICY users_can_delete_feedbacks ON public.feedbacks
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = feedbacks.project_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ------------------------------------------------------------
-- Profile / settings / support persistence
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  job_title TEXT,
  timezone TEXT DEFAULT 'UTC',
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select_own') THEN
    CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_insert_own') THEN
    CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_update_own') THEN
    CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  shortcut_hints_enabled BOOLEAN NOT NULL DEFAULT true,
  notifications JSONB NOT NULL DEFAULT '{"email": true, "product": true, "feedback": true, "analysis": true}'::jsonb,
  dashboard_preferences JSONB NOT NULL DEFAULT '{"compact_mode": false, "default_project_view": "grid", "show_welcome_banner": true}'::jsonb,
  ai_preferences JSONB NOT NULL DEFAULT '{"default_output_length": "long", "include_cost_estimation": true, "include_timeline": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_select_own') THEN
    CREATE POLICY user_settings_select_own ON public.user_settings FOR SELECT USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_insert_own') THEN
    CREATE POLICY user_settings_insert_own ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_settings' AND policyname = 'user_settings_update_own') THEN
    CREATE POLICY user_settings_update_own ON public.user_settings FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('technical', 'billing', 'feature', 'general')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  response_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_project_id ON public.support_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_tickets' AND policyname = 'support_tickets_select_own') THEN
    CREATE POLICY support_tickets_select_own ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_tickets' AND policyname = 'support_tickets_insert_own') THEN
    CREATE POLICY support_tickets_insert_own ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_tickets' AND policyname = 'support_tickets_update_own') THEN
    CREATE POLICY support_tickets_update_own ON public.support_tickets FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'support_tickets' AND policyname = 'support_tickets_delete_own') THEN
    CREATE POLICY support_tickets_delete_own ON public.support_tickets FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- Normalized analysis sessions + sections
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
  ADD COLUMN IF NOT EXISTS legacy_analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS generated_sections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS section_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_analysis_sessions_project_created ON public.analysis_sessions(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_user_created ON public.analysis_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_sessions_legacy_analysis_id ON public.analysis_sessions(legacy_analysis_id);

ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_sessions' AND policyname = 'analysis_sessions_select_own') THEN
    CREATE POLICY analysis_sessions_select_own ON public.analysis_sessions FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_sessions' AND policyname = 'analysis_sessions_insert_own') THEN
    CREATE POLICY analysis_sessions_insert_own ON public.analysis_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_sessions' AND policyname = 'analysis_sessions_update_own') THEN
    CREATE POLICY analysis_sessions_update_own ON public.analysis_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_sessions' AND policyname = 'analysis_sessions_delete_own') THEN
    CREATE POLICY analysis_sessions_delete_own ON public.analysis_sessions FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_analysis_sections_session_id ON public.analysis_sections(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sections_project_id ON public.analysis_sections(project_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sections_user_id ON public.analysis_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_sections_content_gin ON public.analysis_sections USING GIN (content);

ALTER TABLE public.analysis_sections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_sections' AND policyname = 'analysis_sections_select_own') THEN
    CREATE POLICY analysis_sections_select_own ON public.analysis_sections FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_sections' AND policyname = 'analysis_sections_insert_own') THEN
    CREATE POLICY analysis_sections_insert_own ON public.analysis_sections FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_sections' AND policyname = 'analysis_sections_update_own') THEN
    CREATE POLICY analysis_sections_update_own ON public.analysis_sections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'analysis_sections' AND policyname = 'analysis_sections_delete_own') THEN
    CREATE POLICY analysis_sections_delete_own ON public.analysis_sections FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ------------------------------------------------------------
-- Backfill sessions from legacy analyses (non-destructive)
-- ------------------------------------------------------------
INSERT INTO public.analysis_sessions (
  project_id,
  user_id,
  legacy_analysis_id,
  title,
  prompt,
  prompt_hash,
  detail_level,
  provider,
  model,
  completion_percentage,
  metadata,
  created_at,
  updated_at
)
SELECT
  a.project_id,
  p.user_id,
  a.id,
  COALESCE(NULLIF(TRIM(a.result -> 'overview_summary' ->> 'product_name'), ''), 'Analysis Session'),
  COALESCE(NULLIF(TRIM(a.result -> 'metadata' ->> 'source_input'), ''), 'No prompt captured'),
  NULLIF(TRIM(a.result -> 'metadata' ->> 'input_hash'), ''),
  COALESCE(NULLIF(TRIM(a.result -> 'metadata' ->> 'detail_level'), ''), 'long'),
  COALESCE(NULLIF(TRIM(a.result -> 'metadata' ->> 'provider'), ''), 'gemini'),
  NULLIF(TRIM(a.result -> 'metadata' ->> 'model_used'), ''),
  0,
  COALESCE(a.result -> 'metadata', '{}'::jsonb),
  a.created_at,
  NOW()
FROM public.analyses a
JOIN public.projects p ON p.id = a.project_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.analysis_sessions s
  WHERE s.legacy_analysis_id = a.id
);

INSERT INTO public.analysis_sections (
  session_id, project_id, user_id, section_id, section_title, status, content, provider, model, input_hash, generated_at, updated_at
)
SELECT
  s.id, s.project_id, s.user_id, source.section_id, source.section_title, 'generated',
  source.section_content,
  COALESCE(NULLIF(TRIM(a.result -> 'metadata' ->> 'provider'), ''), 'gemini'),
  NULLIF(TRIM(a.result -> 'metadata' ->> 'model_used'), ''),
  NULLIF(TRIM(a.result -> 'metadata' ->> 'input_hash'), ''),
  a.created_at,
  NOW()
FROM public.analysis_sessions s
JOIN public.analyses a ON a.id = s.legacy_analysis_id
JOIN LATERAL (
  VALUES
    ('executive-dashboard', 'Executive Dashboard', a.result -> 'executive_dashboard'),
    ('problem-analysis', 'Problem Analysis', a.result -> 'problem_analysis'),
    ('feature-system', 'Feature System', a.result -> 'feature_system'),
    ('gaps-opportunities', 'Gaps & Opportunities', a.result -> 'gaps_opportunities'),
    ('prd', 'PRD', a.result -> 'prd'),
    ('system-design', 'System Design', a.result -> 'system_design'),
    ('development-tasks', 'Development Tasks', a.result -> 'development_tasks'),
    ('execution-roadmap', 'Execution Roadmap', a.result -> 'execution_roadmap'),
    ('manpower-planning', 'Manpower Planning', a.result -> 'manpower_planning'),
    ('resources', 'Resources', a.result -> 'resource_requirements'),
    ('cost-estimation', 'Cost Estimation', a.result -> 'cost_estimation'),
    ('timeline', 'Timeline', COALESCE(a.result -> 'time_estimation', a.result -> 'time_planning')),
    ('impact-analysis', 'Impact Analysis', a.result -> 'impact_analysis')
) AS source(section_id, section_title, section_content) ON TRUE
WHERE source.section_content IS NOT NULL
ON CONFLICT (session_id, section_id)
DO UPDATE SET
  content = EXCLUDED.content,
  status = 'generated',
  updated_at = NOW();

WITH section_agg AS (
  SELECT
    session_id,
    ARRAY_AGG(section_id ORDER BY section_id) AS generated_sections
  FROM public.analysis_sections
  WHERE status = 'generated'
  GROUP BY session_id
)
UPDATE public.analysis_sessions s
SET
  generated_sections = section_agg.generated_sections,
  completion_percentage = LEAST(
    100,
    ROUND((CARDINALITY(section_agg.generated_sections)::numeric / 13) * 100)::integer
  ),
  section_status = jsonb_build_object(
    'executive-dashboard', CASE WHEN 'executive-dashboard' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'problem-analysis', CASE WHEN 'problem-analysis' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'feature-system', CASE WHEN 'feature-system' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'gaps-opportunities', CASE WHEN 'gaps-opportunities' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'prd', CASE WHEN 'prd' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'system-design', CASE WHEN 'system-design' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'development-tasks', CASE WHEN 'development-tasks' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'execution-roadmap', CASE WHEN 'execution-roadmap' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'manpower-planning', CASE WHEN 'manpower-planning' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'resources', CASE WHEN 'resources' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'cost-estimation', CASE WHEN 'cost-estimation' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'timeline', CASE WHEN 'timeline' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END,
    'impact-analysis', CASE WHEN 'impact-analysis' = ANY(section_agg.generated_sections) THEN 'generated' ELSE 'missing' END
  ),
  updated_at = NOW()
FROM section_agg
WHERE s.id = section_agg.session_id;

-- ------------------------------------------------------------
-- Updated-at triggers (idempotent)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated_at') THEN
    CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_settings_updated_at') THEN
    CREATE TRIGGER trg_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_support_tickets_updated_at') THEN
    CREATE TRIGGER trg_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_feedbacks_updated_at') THEN
    CREATE TRIGGER trg_feedbacks_updated_at BEFORE UPDATE ON public.feedbacks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_analysis_sessions_updated_at') THEN
    CREATE TRIGGER trg_analysis_sessions_updated_at BEFORE UPDATE ON public.analysis_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_analysis_sections_updated_at') THEN
    CREATE TRIGGER trg_analysis_sections_updated_at BEFORE UPDATE ON public.analysis_sections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ------------------------------------------------------------
-- Grants for authenticated role
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedbacks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_sections TO authenticated;

COMMIT;
