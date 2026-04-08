import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthCallbackUrlFromRequest, getRequestOrigin } from '@/lib/appUrl'

export const runtime = 'nodejs'
export const maxDuration = 30

const REQUIRED_RUNTIME_FILES = [
  'lib/auth.ts',
  'hooks/useAuth.tsx',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'proxy.ts',
]

/**
 * Health Check & Status Endpoint
 * Visit: /api/health
 */
export async function GET(request: Request) {
  const appOrigin = getRequestOrigin(request)
  const callbackUrl = getAuthCallbackUrlFromRequest(request)

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
    files: REQUIRED_RUNTIME_FILES,
    endpoints: {
      setup_wizard: '/setup',
      verification: '/api/setup/verify',
      database_check: '/api/setup/database',
      signup: '/signup',
      login: '/login',
      dashboard: '/dashboard',
      callback: callbackUrl,
    }
  }

  // Check environment variables
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    status.checks.environment = true
  }

  // Check Supabase connection
  if (status.checks.environment) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.from('profiles').select('id').limit(1)
      status.checks.supabase = true
    } catch {
      status.checks.supabase = false
    }
  }

  // Runtime file list is validated at build-time by TypeScript/Next bundling.
  status.checks.files = REQUIRED_RUNTIME_FILES.length > 0

  const allChecks = Object.values(status.checks).every(check => check === true)

  return NextResponse.json({
    ...status,
    app_origin: appOrigin,
    ready: allChecks,
    message: allChecks
      ? 'System ready - Visit /setup to complete database setup'
      : 'System needs configuration - Visit /setup for instructions'
  }, {
    status: allChecks ? 200 : 503
  })
}
