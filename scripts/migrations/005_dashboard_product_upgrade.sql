-- ============================================
-- PMCopilot Dashboard/Product Upgrade
-- Adds profile/settings/support/reporting metadata
-- ============================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- --------------------------------------------
-- 0) Core product tables (fresh install safe)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
DROP POLICY IF EXISTS "users_own_projects" ON public.projects;
DROP POLICY IF EXISTS "users_can_read_projects" ON public.projects;
DROP POLICY IF EXISTS "users_can_insert_projects" ON public.projects;
DROP POLICY IF EXISTS "users_can_update_projects" ON public.projects;
DROP POLICY IF EXISTS "users_can_delete_projects" ON public.projects;

CREATE POLICY "users_can_read_projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.analyses
  DROP COLUMN IF EXISTS feedback_id;

CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON public.analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_analyses" ON public.analyses;
DROP POLICY IF EXISTS "users_can_insert_analyses" ON public.analyses;
DROP POLICY IF EXISTS "users_can_read_analyses" ON public.analyses;
DROP POLICY IF EXISTS "users_can_update_analyses" ON public.analyses;
DROP POLICY IF EXISTS "users_can_delete_analyses" ON public.analyses;

CREATE POLICY "users_can_read_analyses"
  ON public.analyses
  FOR SELECT
  USING (
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_insert_analyses"
  ON public.analyses
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_analyses"
  ON public.analyses
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_delete_analyses"
  ON public.analyses
  FOR DELETE
  USING (
    project_id IN (
      SELECT id
      FROM public.projects
      WHERE user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'gmail', 'slack', 'intercom', 'webhook', 'api')),
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON public.feedbacks(project_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_source ON public.feedbacks(source);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_created ON public.feedbacks(project_id, created_at DESC);

-- --------------------------------------------
-- 1) Profiles enhancements
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
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

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- --------------------------------------------
-- 2) User settings table
-- --------------------------------------------
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

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_settings_select_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_insert_own" ON public.user_settings;
DROP POLICY IF EXISTS "user_settings_update_own" ON public.user_settings;

CREATE POLICY "user_settings_select_own"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "user_settings_insert_own"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_settings_update_own"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- --------------------------------------------
-- 3) Support tickets
-- --------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_project_id ON public.support_tickets(project_id);

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_select_own" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_own" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_own" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_own" ON public.support_tickets;

CREATE POLICY "support_tickets_select_own"
  ON public.support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "support_tickets_insert_own"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "support_tickets_update_own"
  ON public.support_tickets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "support_tickets_delete_own"
  ON public.support_tickets
  FOR DELETE
  USING (auth.uid() = user_id);

-- --------------------------------------------
-- 4) Feedback hub enhancements
-- --------------------------------------------
ALTER TABLE public.feedbacks
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.feedbacks
  ALTER COLUMN source SET DEFAULT 'manual';

ALTER TABLE public.feedbacks
  ALTER COLUMN category SET DEFAULT 'other',
  ALTER COLUMN priority SET DEFAULT 'medium',
  ALTER COLUMN status SET DEFAULT 'new';

UPDATE public.feedbacks
SET source = 'manual'
WHERE source IS NULL;

UPDATE public.feedbacks
SET category = 'other'
WHERE category IS NULL;

UPDATE public.feedbacks
SET priority = 'medium'
WHERE priority IS NULL;

UPDATE public.feedbacks
SET status = 'new'
WHERE status IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedbacks_category_check'
  ) THEN
    ALTER TABLE public.feedbacks
      ADD CONSTRAINT feedbacks_category_check
      CHECK (category IN ('bug', 'feature', 'improvement', 'ux', 'performance', 'other'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedbacks_priority_check'
  ) THEN
    ALTER TABLE public.feedbacks
      ADD CONSTRAINT feedbacks_priority_check
      CHECK (priority IN ('low', 'medium', 'high', 'critical'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'feedbacks_status_check'
  ) THEN
    ALTER TABLE public.feedbacks
      ADD CONSTRAINT feedbacks_status_check
      CHECK (status IN ('new', 'reviewed', 'planned', 'done'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_priority ON public.feedbacks(priority);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_by ON public.feedbacks(created_by);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_status ON public.feedbacks(project_id, status);

DROP TRIGGER IF EXISTS trg_feedbacks_updated_at ON public.feedbacks;
DROP TRIGGER IF EXISTS update_feedbacks_updated_at ON public.feedbacks;
CREATE TRIGGER trg_feedbacks_updated_at
  BEFORE UPDATE ON public.feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own project feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Users can insert own project feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Users can update own project feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Users can delete own project feedbacks" ON public.feedbacks;

CREATE POLICY "Users can view own project feedbacks"
  ON public.feedbacks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = feedbacks.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own project feedbacks"
  ON public.feedbacks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = feedbacks.project_id
        AND projects.user_id = auth.uid()
    )
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY "Users can update own project feedbacks"
  ON public.feedbacks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = feedbacks.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = feedbacks.project_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project feedbacks"
  ON public.feedbacks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = feedbacks.project_id
        AND projects.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedbacks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;

COMMIT;
