import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a Supabase client for client components
 * Automatically handles session management
 */
export function createClientSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Singleton client for browser usage
 */
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('This function should only be called on the client side')
  }

  if (!clientInstance) {
    clientInstance = createClientSupabaseClient()
  }

  return clientInstance
}
