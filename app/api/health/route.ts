import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

/**
 * Health Check & Status Endpoint
 * Visit: http://localhost:3000/api/health
 */
export async function GET() {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'PMCopilot Authentication System',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      environment: false,
      supabase: false,
      files: false
    },
    endpoints: {
      setup_wizard: '/setup',
      verification: '/api/setup/verify',
      database_check: '/api/setup/database',
      signup: '/signup',
      login: '/login',
      dashboard: '/dashboard'
    }
  }

  // Check environment variables
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    status.checks.environment = true
  }

  // Check Supabase connection
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.from('profiles').select('id').limit(1)

    // If we get here without crashing, Supabase is reachable
    status.checks.supabase = true
  } catch {
    status.checks.supabase = false
  }

  // Check if auth files exist
  const authFiles = [
    'lib/auth.ts',
    'hooks/useAuth.tsx',
    'middleware.ts'
  ]

  status.checks.files = authFiles.every(file => {
    try {
      return fs.existsSync(path.join(process.cwd(), file))
    } catch {
      return false
    }
  })

  const allChecks = Object.values(status.checks).every(check => check === true)

  return NextResponse.json({
    ...status,
    ready: allChecks,
    message: allChecks
      ? 'System ready - Visit /setup to complete database setup'
      : 'System needs configuration - Visit /setup for instructions'
  }, {
    status: allChecks ? 200 : 503
  })
}
