-- ============================================================
-- PMCopilot FK patch: ensure project delete cascades analyses
-- Non-destructive: no table/data drops, no row deletes here.
-- ============================================================

BEGIN;

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

COMMIT;

