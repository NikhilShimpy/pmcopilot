import { EnvironmentConfig } from '@/types';

/**
 * Validates that required environment variables are present
 */
function validateEnv(key: string, value: string | undefined): string {
  if (!value || value === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please check your .env.local file and ensure ${key} is set.`
    );
  }
  return value;
}

/**
 * Get environment with fallback
 */
function getEnv(
  key: string,
  defaultValue?: string,
  required: boolean = true
): string {
  const value = process.env[key];

  if (required) {
    return validateEnv(key, value);
  }

  return value || defaultValue || '';
}

/**
 * Environment configuration object
 *
 * AI PROVIDERS:
 * - PRIMARY: Google Gemini API
 * - FALLBACK: Groq (only if Gemini fails)
 *
 * REMOVED: Ollama, HuggingFace, OpenRouter
 */
export const config: EnvironmentConfig = {
  supabase: {
    url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },
  gemini: {
    apiKey: getEnv('GEMINI_API_KEY'),
  },
  groq: {
    apiKey: getEnv('GROQ_API_KEY'),
  },
  app: {
    env: (getEnv('NODE_ENV', 'development', false) as 'development' | 'production' | 'test'),
  },
};

/**
 * Checks if running in production
 */
export const isProduction = config.app.env === 'production';

/**
 * Checks if running in development
 */
export const isDevelopment = config.app.env === 'development';

/**
 * Checks if running in test
 */
export const isTest = config.app.env === 'test';

/**
 * Validates all environment variables on startup
 */
export function validateEnvironment(): void {
  try {
    // Try to access config to trigger validation
    const requiredKeys = [
      config.supabase.url,
      config.supabase.anonKey,
      config.gemini.apiKey,
      config.groq.apiKey,
    ];

    console.log('[Config] Environment variables validated successfully ✓');
    console.log('[Config] AI Providers: Gemini (PRIMARY) → Groq (FALLBACK)');
  } catch (error) {
    console.error('[Config] Environment validation failed:', error);
    throw error;
  }
}

/**
 * Get configuration for specific service
 */
export function getSupabaseConfig() {
  return config.supabase;
}

export function getGeminiConfig() {
  return config.gemini;
}

export function getGroqConfig() {
  return config.groq;
}

export function getAppConfig() {
  return config.app;
}

// Auto-validate on import (only in Node.js environment, not during build)
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
  try {
    validateEnvironment();
  } catch (error) {
    // Don't throw during build time, only log
    console.warn('[Config] Skipping validation during build');
  }
}

export default config;
