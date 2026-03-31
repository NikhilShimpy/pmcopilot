-- ============================================================
-- PMCopilot - Analysis input imports (non-destructive)
-- Creates structured storage for composer imports:
-- text/files/images/audio/whatsapp/linkedin/instagram
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.analysis_input_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  analysis_session_id UUID NULL REFERENCES public.analysis_sessions(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('text', 'file', 'image', 'audio', 'whatsapp', 'linkedin', 'instagram')
  ),
  import_method TEXT NOT NULL DEFAULT 'manual',
  title TEXT NOT NULL DEFAULT 'Imported input',
  normalized_text TEXT NOT NULL,
  raw_text TEXT NULL,
  file_name TEXT NULL,
  mime_type TEXT NULL,
  file_size BIGINT NULL,
  storage_bucket TEXT NULL,
  storage_path TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Backfill compatibility if an earlier draft table exists.
ALTER TABLE public.analysis_input_imports
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS project_id UUID,
  ADD COLUMN IF NOT EXISTS analysis_session_id UUID NULL,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS import_method TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS title TEXT DEFAULT 'Imported input',
  ADD COLUMN IF NOT EXISTS normalized_text TEXT,
  ADD COLUMN IF NOT EXISTS raw_text TEXT NULL,
  ADD COLUMN IF NOT EXISTS file_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS mime_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS file_size BIGINT NULL,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT NULL,
  ADD COLUMN IF NOT EXISTS storage_path TEXT NULL,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analysis_input_imports_source_type_check'
      AND conrelid = 'public.analysis_input_imports'::regclass
  ) THEN
    ALTER TABLE public.analysis_input_imports
      ADD CONSTRAINT analysis_input_imports_source_type_check
      CHECK (
        source_type IN ('text', 'file', 'image', 'audio', 'whatsapp', 'linkedin', 'instagram')
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analysis_input_imports_project_created_at
  ON public.analysis_input_imports(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_input_imports_user_created_at
  ON public.analysis_input_imports(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analysis_input_imports_session_id
  ON public.analysis_input_imports(analysis_session_id);

CREATE INDEX IF NOT EXISTS idx_analysis_input_imports_source_type
  ON public.analysis_input_imports(source_type);

CREATE INDEX IF NOT EXISTS idx_analysis_input_imports_storage_path
  ON public.analysis_input_imports(storage_bucket, storage_path);

CREATE INDEX IF NOT EXISTS idx_analysis_input_imports_normalized_text_tsv
  ON public.analysis_input_imports
  USING GIN (to_tsvector('english', coalesce(normalized_text, '')));

ALTER TABLE public.analysis_input_imports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_input_imports'
      AND policyname = 'analysis_input_imports_select_own'
  ) THEN
    CREATE POLICY analysis_input_imports_select_own
      ON public.analysis_input_imports
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_input_imports'
      AND policyname = 'analysis_input_imports_insert_own'
  ) THEN
    CREATE POLICY analysis_input_imports_insert_own
      ON public.analysis_input_imports
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_input_imports'
      AND policyname = 'analysis_input_imports_update_own'
  ) THEN
    CREATE POLICY analysis_input_imports_update_own
      ON public.analysis_input_imports
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_input_imports'
      AND policyname = 'analysis_input_imports_delete_own'
  ) THEN
    CREATE POLICY analysis_input_imports_delete_own
      ON public.analysis_input_imports
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'set_updated_at'
      AND pg_function_is_visible(oid)
  ) THEN
    CREATE FUNCTION public.set_updated_at()
    RETURNS TRIGGER AS $inner$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $inner$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_analysis_input_imports_updated_at'
  ) THEN
    CREATE TRIGGER trg_analysis_input_imports_updated_at
      BEFORE UPDATE ON public.analysis_input_imports
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_input_imports TO authenticated;

-- Storage bucket for optional attachment persistence.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('analysis-imports', 'analysis-imports', false, 10485760)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'analysis_imports_select_own'
  ) THEN
    CREATE POLICY analysis_imports_select_own
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'analysis-imports'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'analysis_imports_insert_own'
  ) THEN
    CREATE POLICY analysis_imports_insert_own
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'analysis-imports'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'analysis_imports_update_own'
  ) THEN
    CREATE POLICY analysis_imports_update_own
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'analysis-imports'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'analysis-imports'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'analysis_imports_delete_own'
  ) THEN
    CREATE POLICY analysis_imports_delete_own
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'analysis-imports'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

COMMIT;
