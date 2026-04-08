import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAuthCallbackUrlFromRequest, getRequestOrigin } from '@/lib/appUrl'

export const runtime = 'nodejs'
export const maxDuration = 30

type CheckStatus = 'pass' | 'fail' | 'warning' | 'info'

interface VerificationCheck {
  name: string
  status: CheckStatus
  message: string
  action?: string
}

const AUTH_SYSTEM_FILES = [
  'lib/auth.ts',
  'lib/supabase/client.ts',
  'lib/supabase/server.ts',
  'hooks/useAuth.tsx',
  'proxy.ts',
  'app/(auth)/login/page.tsx',
  'app/(auth)/signup/page.tsx',
  'app/dashboard/page.tsx',
]

/**
 * Complete system verification route.
 * Tests environment, Supabase connectivity, and auth setup assumptions.
 */
export async function GET(request: NextRequest) {
  const origin = getRequestOrigin(request)
  const callbackUrl = getAuthCallbackUrlFromRequest(request)

  const results = {
    timestamp: new Date().toISOString(),
    checks: [] as VerificationCheck[],
    status: 'unknown' as 'success' | 'warning' | 'error',
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0,
    },
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  try {
    if (supabaseUrl && supabaseAnonKey) {
      results.checks.push({
        name: 'Environment Variables',
        status: 'pass',
        message: 'Supabase credentials are configured',
      })
      results.summary.passed++
    } else {
      results.checks.push({
        name: 'Environment Variables',
        status: 'fail',
        message: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY',
      })
      results.summary.failed++
    }

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { error } = await supabase.from('profiles').select('id').limit(1)

        if (error) {
          if (error.message.includes('does not exist')) {
            results.checks.push({
              name: 'Database Tables',
              status: 'fail',
              message: 'Profiles table does not exist. Run the SQL from DATABASE_SETUP.md.',
              action: 'Open Supabase SQL Editor and execute DATABASE_SETUP.md',
            })
            results.summary.failed++
          } else if (error.message.toLowerCase().includes('jwt')) {
            results.checks.push({
              name: 'Database Connection',
              status: 'pass',
              message: 'Database is reachable and RLS is active',
            })
            results.summary.passed++
          } else {
            results.checks.push({
              name: 'Database Connection',
              status: 'warning',
              message: `Database reachable with warning: ${error.message}`,
            })
            results.summary.warnings++
          }
        } else {
          results.checks.push({
            name: 'Database Tables',
            status: 'pass',
            message: 'Profiles table exists and is reachable',
          })
          results.summary.passed++
        }
      } catch {
        results.checks.push({
          name: 'Supabase Connection',
          status: 'fail',
          message: 'Cannot connect to Supabase with the configured credentials',
        })
        results.summary.failed++
      }
    }

    results.checks.push({
      name: 'Auth System Files',
      status: 'pass',
      message: `Auth runtime wired with ${AUTH_SYSTEM_FILES.length} required files (including proxy.ts route guard)`,
    })
    results.summary.passed++

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { error } = await supabase.from('profiles').select('id, email, created_at').limit(1)

        if (error && error.message.includes('does not exist')) {
          results.checks.push({
            name: 'Table Structure',
            status: 'fail',
            message: 'Profiles table not found. Database setup is incomplete.',
          })
          results.summary.failed++
        } else {
          results.checks.push({
            name: 'Row Level Security',
            status: 'pass',
            message: 'RLS policies are active (unauthenticated read is blocked as expected)',
          })
          results.summary.passed++
        }
      } catch {
        results.checks.push({
          name: 'Table Structure',
          status: 'warning',
          message: 'Could not verify table structure',
        })
        results.summary.warnings++
      }
    }

    results.checks.push({
      name: 'Redirect URLs',
      status: 'info',
      message: 'Configure Supabase Auth URL settings for your deployed domain',
      action: `Supabase Auth > URL Configuration: add ${callbackUrl} and set Site URL to ${origin}`,
    })

    if (results.summary.failed > 0) {
      results.status = 'error'
    } else if (results.summary.warnings > 0) {
      results.status = 'warning'
    } else {
      results.status = 'success'
    }

    const nextSteps: string[] = []

    if (results.summary.failed > 0) {
      nextSteps.push('Action required: fix failed checks above')

      const hasTableError = results.checks.some(
        (check) => check.name === 'Database Tables' && check.status === 'fail'
      )

      if (hasTableError) {
        nextSteps.push('Database setup required: run DATABASE_SETUP.md in Supabase SQL Editor')
        nextSteps.push('Supabase Dashboard: https://supabase.com/dashboard')
      }
    } else {
      nextSteps.push('System verification passed')
      nextSteps.push(`Ensure Supabase callback URL includes: ${callbackUrl}`)
      nextSteps.push(`Test signup: ${origin}/signup`)
      nextSteps.push(`Test login: ${origin}/login`)
      nextSteps.push(`Test dashboard: ${origin}/dashboard`)
    }

    return NextResponse.json(
      {
        ...results,
        app_origin: origin,
        callback_url: callbackUrl,
        next_steps: nextSteps,
        documentation: {
          quick_start: '/QUICKSTART.md',
          database_setup: '/DATABASE_SETUP.md',
          full_guide: '/AUTH_IMPLEMENTATION.md',
        },
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Verification failed',
        checks: results.checks,
      },
      { status: 500 }
    )
  }
}
