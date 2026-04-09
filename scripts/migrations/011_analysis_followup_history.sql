-- PMCopilot - Ask Follow-up history with titled chat sessions

CREATE TABLE IF NOT EXISTS public.analysis_followup_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_session_id UUID REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  legacy_analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  active_section TEXT NOT NULL DEFAULT 'all',
  analysis_title TEXT,
  source_input TEXT,
  message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.analysis_followup_sessions
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS analysis_session_id UUID REFERENCES public.analysis_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS legacy_analysis_id UUID REFERENCES public.analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS active_section TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS analysis_title TEXT,
  ADD COLUMN IF NOT EXISTS source_input TEXT,
  ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.analysis_followup_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.analysis_followup_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  structured_payload JSONB,
  section_id TEXT NOT NULL DEFAULT 'all',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.analysis_followup_messages
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.analysis_followup_sessions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS content TEXT,
  ADD COLUMN IF NOT EXISTS structured_payload JSONB,
  ADD COLUMN IF NOT EXISTS section_id TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_analysis_followup_sessions_project_recent
  ON public.analysis_followup_sessions(project_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_followup_sessions_analysis_session
  ON public.analysis_followup_sessions(analysis_session_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_followup_sessions_legacy_analysis
  ON public.analysis_followup_sessions(legacy_analysis_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_followup_sessions_user_recent
  ON public.analysis_followup_sessions(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_followup_messages_session_created
  ON public.analysis_followup_messages(session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_analysis_followup_messages_project_created
  ON public.analysis_followup_messages(project_id, created_at DESC);

ALTER TABLE public.analysis_followup_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_followup_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_followup_sessions'
      AND policyname = 'analysis_followup_sessions_select_own'
  ) THEN
    CREATE POLICY analysis_followup_sessions_select_own
      ON public.analysis_followup_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_followup_sessions'
      AND policyname = 'analysis_followup_sessions_insert_own'
  ) THEN
    CREATE POLICY analysis_followup_sessions_insert_own
      ON public.analysis_followup_sessions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_followup_sessions'
      AND policyname = 'analysis_followup_sessions_update_own'
  ) THEN
    CREATE POLICY analysis_followup_sessions_update_own
      ON public.analysis_followup_sessions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_followup_sessions'
      AND policyname = 'analysis_followup_sessions_delete_own'
  ) THEN
    CREATE POLICY analysis_followup_sessions_delete_own
      ON public.analysis_followup_sessions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_followup_messages'
      AND policyname = 'analysis_followup_messages_select_own'
  ) THEN
    CREATE POLICY analysis_followup_messages_select_own
      ON public.analysis_followup_messages FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_followup_messages'
      AND policyname = 'analysis_followup_messages_insert_own'
  ) THEN
    CREATE POLICY analysis_followup_messages_insert_own
      ON public.analysis_followup_messages FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_followup_messages'
      AND policyname = 'analysis_followup_messages_delete_own'
  ) THEN
    CREATE POLICY analysis_followup_messages_delete_own
      ON public.analysis_followup_messages FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.sync_followup_session_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.analysis_followup_sessions
  SET
    message_count = (
      SELECT COUNT(*)
      FROM public.analysis_followup_messages
      WHERE session_id = NEW.session_id
    ),
    last_message_at = GREATEST(COALESCE(last_message_at, NEW.created_at), NEW.created_at),
    active_section = COALESCE(NEW.section_id, active_section),
    updated_at = NOW()
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_analysis_followup_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_analysis_followup_sessions_updated_at
      BEFORE UPDATE ON public.analysis_followup_sessions
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_analysis_followup_messages_updated_at'
  ) THEN
    CREATE TRIGGER trg_analysis_followup_messages_updated_at
      BEFORE UPDATE ON public.analysis_followup_messages
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_analysis_followup_sync_session'
  ) THEN
    CREATE TRIGGER trg_analysis_followup_sync_session
      AFTER INSERT ON public.analysis_followup_messages
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_followup_session_on_message();
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_followup_sessions TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.analysis_followup_messages TO authenticated;
