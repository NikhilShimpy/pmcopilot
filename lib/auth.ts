'use client'

import { createClientSupabaseClient } from './supabase/client'
import type { AuthError } from '@supabase/supabase-js'

export interface AuthResult {
  success: boolean
  error?: string
  data?: any
}

/**
 * Sign up a new user
 * Automatically creates profile after signup via database trigger
 */
export async function signUp(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    // Create profile via API
    if (data.user) {
      try {
        await fetch('/api/auth/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
          }),
        })
      } catch (profileError) {
        console.error('Profile creation error:', profileError)
        // Don't fail signup if profile creation fails
      }
    }

    return {
      success: true,
      data: data.user,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Signup failed',
    }
  }
}

/**
 * Sign in existing user
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const supabase = createClientSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    return {
      success: true,
      data: data.user,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    }
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase.auth.signOut()

    if (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    }
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  try {
    const supabase = createClientSupabaseClient()

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get current session
 */
export async function getSession() {
  try {
    const supabase = createClientSupabaseClient()

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return null
    }

    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Reset password
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password reset failed',
    }
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  try {
    const supabase = createClientSupabaseClient()

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return {
        success: false,
        error: getAuthErrorMessage(error),
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Password update failed',
    }
  }
}

/**
 * Convert Supabase auth error to user-friendly message
 */
function getAuthErrorMessage(error: AuthError): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password'
    case 'Email not confirmed':
      return 'Please verify your email address'
    case 'User already registered':
      return 'An account with this email already exists'
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long'
    default:
      return error.message || 'An error occurred'
  }
}
