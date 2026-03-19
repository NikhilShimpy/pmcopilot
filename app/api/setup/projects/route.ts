import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API route to set up the projects table
 * POST /api/setup/projects
 */
export async function POST() {
  try {
    // Use service role key if available, otherwise anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if projects table exists by trying to select from it
    const { error: checkError } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: 'Projects table already exists',
        alreadyExists: true
      })
    }

    // If table doesn't exist, we need to create it via SQL
    // Note: This requires the service role key or SQL Editor access
    return NextResponse.json({
      success: false,
      error: 'Projects table does not exist. Please run the SQL script in Supabase SQL Editor.',
      sql: SQL_SCRIPT,
      instructions: [
        '1. Go to your Supabase Dashboard',
        '2. Click on "SQL Editor" in the left sidebar',
        '3. Create a new query',
        '4. Paste the SQL script below and run it',
        '5. Refresh your dashboard page'
      ]
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup projects table'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Projects table setup endpoint',
    method: 'POST to check/create table, or copy SQL below',
    sql: SQL_SCRIPT
  })
}

const SQL_SCRIPT = `
-- =============================================
-- PROJECTS TABLE SETUP FOR PMCOPILOT
-- Run this in Supabase SQL Editor
-- =============================================

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);

-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Create RLS policies
-- Policy: Users can only see their own projects
CREATE POLICY "Users can view their own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create projects for themselves
CREATE POLICY "Users can create their own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own projects
CREATE POLICY "Users can update their own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

-- Success message
SELECT 'Projects table created successfully!' as message;
`
