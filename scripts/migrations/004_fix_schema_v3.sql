-- ============================================
-- PMCopilot Database Schema Fix v3.0
-- FIXES:
-- 1. Remove feedback_id dependency from analyses table
-- 2. Fix RLS policies to allow proper inserts
-- ============================================

-- Drop existing policies first
DROP POLICY IF EXISTS "users_own_analyses" ON analyses;
DROP POLICY IF EXISTS "users_can_insert_analyses" ON analyses;
DROP POLICY IF EXISTS "users_can_read_analyses" ON analyses;
DROP POLICY IF EXISTS "users_can_update_analyses" ON analyses;
DROP POLICY IF EXISTS "users_can_delete_analyses" ON analyses;

-- Drop the feedback_id column from analyses if it exists
ALTER TABLE IF EXISTS analyses
DROP COLUMN IF EXISTS feedback_id;

-- Ensure analyses table exists with correct schema
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Enable RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- FIX: Separate policies for SELECT, INSERT, UPDATE, DELETE
-- ============================================

-- SELECT: Users can read analyses for their projects
CREATE POLICY "users_can_read_analyses" ON analyses
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- INSERT: Users can insert analyses for their projects
CREATE POLICY "users_can_insert_analyses" ON analyses
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Users can update analyses for their projects
CREATE POLICY "users_can_update_analyses" ON analyses
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- DELETE: Users can delete analyses for their projects
CREATE POLICY "users_can_delete_analyses" ON analyses
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- ALSO FIX PROJECTS TABLE RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "users_own_projects" ON projects;
DROP POLICY IF EXISTS "users_can_read_projects" ON projects;
DROP POLICY IF EXISTS "users_can_insert_projects" ON projects;
DROP POLICY IF EXISTS "users_can_update_projects" ON projects;
DROP POLICY IF EXISTS "users_can_delete_projects" ON projects;

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "users_can_read_projects" ON projects
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT
CREATE POLICY "users_can_insert_projects" ON projects
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE
CREATE POLICY "users_can_update_projects" ON projects
  FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE
CREATE POLICY "users_can_delete_projects" ON projects
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT ALL ON analyses TO authenticated;
GRANT ALL ON projects TO authenticated;
