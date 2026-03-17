import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';
import { logger } from './logger';
import { User } from '@/types';

/**
 * Supabase client instance
 * Creates a singleton instance for server-side usage
 */
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          persistSession: false, // Server-side doesn't need session persistence
          autoRefreshToken: false,
        },
      }
    );

    logger.info('Supabase client initialized');
  }

  return supabaseInstance;
}

/**
 * Get Supabase client for browser usage
 * Creates a new instance with session persistence enabled
 */
export function createBrowserClient(): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Get current authenticated user from session
 */
export async function getCurrentUser(
  supabase: SupabaseClient
): Promise<User | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.error('Failed to get current user', { error: error.message });
      return null;
    }

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      created_at: user.created_at,
    };
  } catch (error) {
    logger.error('Error getting current user', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Require authentication - throws error if user is not authenticated
 */
export async function requireAuth(
  supabase: SupabaseClient
): Promise<User> {
  const user = await getCurrentUser(supabase);

  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}

/**
 * Get user from authorization header
 */
export async function getUserFromHeader(
  authHeader: string | null
): Promise<User | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseClient();

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email!,
      created_at: user.created_at,
    };
  } catch (error) {
    logger.error('Error getting user from header', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    logger.error('Sign up failed', { error: error.message });
    throw error;
  }

  logger.info('User signed up successfully', { userId: data.user?.id });
  return data;
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string) {
  const supabase = createBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    logger.error('Sign in failed', { error: error.message });
    throw error;
  }

  logger.info('User signed in successfully', { userId: data.user?.id });
  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createBrowserClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error('Sign out failed', { error: error.message });
    throw error;
  }

  logger.info('User signed out successfully');
}

/**
 * Get session from cookies (for server-side)
 */
export async function getSession(supabase: SupabaseClient) {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      logger.error('Failed to get session', { error: error.message });
      return null;
    }

    return session;
  } catch (error) {
    logger.error('Error getting session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

// Export default instance
export const supabase = getSupabaseClient();

export default supabase;
