import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export type User = {
  id: string
  email: string
  created_at?: string
}

/**
 * Create a Supabase client for server components and API routes
 * Uses cookies for session management
 *
 * FIXED: Next.js 15+ requires awaiting cookies()
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (_error) {
            // Ignored in Server Components - middleware handles refresh
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (_error) {
            // Ignored in Server Components - middleware handles refresh
          }
        },
      },
    }
  )
}

/**
 * Get current user from server component/API route
 * Returns null if not authenticated (no error thrown)
 */
export async function getServerUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email!,
      created_at: user.created_at,
    }
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}

/**
 * Require authentication in server component/API route
 * Throws error if not authenticated
 */
export async function requireServerAuth(): Promise<User> {
  const user = await getServerUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

/**
 * Get user or return anonymous fallback for public access
 * Useful for APIs that work with or without auth
 */
export async function getUserOrAnonymous(): Promise<User> {
  const user = await getServerUser()

  if (user) {
    return user
  }

  // Return anonymous user for public access
  return {
    id: 'anonymous',
    email: 'anonymous@pmcopilot.local',
  }
}

/**
 * Check if user is authenticated (boolean)
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getServerUser()
  return user !== null
}
