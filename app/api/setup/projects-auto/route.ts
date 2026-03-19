import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hasServiceRoleKey } from '@/lib/supabase/admin'

const SQL_CREATE_PROJECTS_TABLE = `
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
`

const SQL_ENABLE_RLS = `
-- Enable Row Level Security
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
`

const SQL_CREATE_POLICIES = `
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Create RLS policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
`

/**
 * POST /api/setup/projects-auto
 * Automatically create the projects table using Supabase Management API
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL' },
        { status: 500 }
      )
    }

    if (!serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Service role key not configured',
        requiresManualSetup: true,
        instructions: [
          '1. Go to your Supabase Dashboard',
          '2. Navigate to Settings > API',
          '3. Copy the "service_role" secret key',
          '4. Add it to your .env.local file as SUPABASE_SERVICE_ROLE_KEY=your_key',
          '5. Restart your development server',
          '',
          'OR run the SQL script manually in Supabase SQL Editor'
        ],
        sql: getFullSQLScript()
      }, { status: 200 })
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if table already exists
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

    // Table doesn't exist - create it using the REST API SQL endpoint
    // Supabase allows executing SQL via the pg_execute function on some plans
    // or via the Management API

    // Try using the Supabase Management API to run SQL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]

    if (!projectRef) {
      return NextResponse.json({
        success: false,
        error: 'Could not parse Supabase project reference from URL',
        requiresManualSetup: true,
        sql: getFullSQLScript()
      }, { status: 200 })
    }

    // Try running SQL via the database REST endpoint
    const sqlEndpoint = `${supabaseUrl}/rest/v1/rpc/exec_sql`

    // First, try to execute SQL directly using the database function
    // This requires the function to be created first, which usually isn't available

    // Since direct SQL execution isn't available via standard Supabase API,
    // we'll provide detailed instructions and the SQL
    return NextResponse.json({
      success: false,
      error: 'Automatic table creation requires SQL Editor access',
      requiresManualSetup: true,
      instructions: [
        '1. Go to your Supabase Dashboard: https://supabase.com/dashboard',
        '2. Select your project',
        '3. Click on "SQL Editor" in the left sidebar',
        '4. Click "New query"',
        '5. Copy and paste the SQL below',
        '6. Click "Run" to execute',
        '7. Return here and click "Verify Setup"'
      ],
      sql: getFullSQLScript(),
      dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/sql`
    }, { status: 200 })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
      sql: getFullSQLScript()
    }, { status: 500 })
  }
}

/**
 * GET /api/setup/projects-auto
 * Check if projects table exists
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase credentials',
        tableExists: false
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if table exists
    const { error } = await supabase
      .from('projects')
      .select('id')
      .limit(1)

    const tableExists = !error || !isTableNotFoundError(error.message)

    return NextResponse.json({
      success: true,
      tableExists,
      error: error?.message || null,
      hasServiceRoleKey: hasServiceRoleKey()
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Check failed',
      tableExists: false
    }, { status: 500 })
  }
}

function isTableNotFoundError(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  return (
    (lowerMessage.includes('relation') && lowerMessage.includes('does not exist')) ||
    (lowerMessage.includes('could not find') && lowerMessage.includes('projects')) ||
    lowerMessage.includes('schema cache') ||
    (lowerMessage.includes('table') && lowerMessage.includes('not found')) ||
    lowerMessage.includes('42p01')
  )
}

function getFullSQLScript(): string {
  return `-- =============================================
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
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

-- Success message
SELECT 'Projects table created successfully!' as message;`
}
