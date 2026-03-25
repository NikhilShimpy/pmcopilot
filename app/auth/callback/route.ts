import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth callback route
 * Handles email confirmation and OAuth callbacks
 * Properly exchanges code for session and handles errors
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', error)
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(loginUrl)
  }

  // No code provided - redirect to login
  if (!code) {
    console.warn('Auth callback called without code')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Code exchange failed:', exchangeError.message)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'auth_failed')
      loginUrl.searchParams.set('error_description', exchangeError.message)
      return NextResponse.redirect(loginUrl)
    }

    // Successfully authenticated - redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (err) {
    console.error('Unexpected auth callback error:', err)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'unexpected_error')
    return NextResponse.redirect(loginUrl)
  }
}
