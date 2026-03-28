import { EnvironmentConfig } from '@/types';
import { AI_CONFIG } from '@/utils/constants';

/**
 * Free-tier Gemini models that this app is allowed to use.
 * Any other model is treated as invalid configuration.
 */
const FREE_TIER_GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
] as const;

const DEFAULT_FREE_TIER_MODEL = 'gemini-2.5-flash-lite';

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

function getGeminiApiKeys(): string[] {
  const keys = new Set<string>();
  const primaryKey = process.env.GEMINI_API_KEY?.trim();
  const pooledKeys =
    process.env.GEMINI_API_KEYS
      ?.split(',')
      .map((key) => key.trim())
      .filter(Boolean) || [];

  if (primaryKey) {
    keys.add(primaryKey);
  }

  for (const key of pooledKeys) {
    keys.add(key);
  }

  for (let index = 1; index <= 10; index++) {
    const numberedKey = process.env[`GEMINI_API_KEY_${index}`]?.trim();
    if (numberedKey) {
      keys.add(numberedKey);
    }
  }

  return Array.from(keys);
}

function resolveGeminiModel(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    AI_CONFIG.GEMINI.DEFAULT_MODEL ||
    DEFAULT_FREE_TIER_MODEL
  );
}

type GeminiModelValidation = {
  valid: boolean;
  model: string;
  message: string;
};

export function validateGeminiModel(
  model: string = resolveGeminiModel()
): GeminiModelValidation {
  if (!model) {
    return {
      valid: false,
      model: '',
      message: `No Gemini model configured. Set GEMINI_MODEL to one of: ${FREE_TIER_GEMINI_MODELS.join(
        ', '
      )}.`,
    };
  }

  const normalized = model.trim();
  const isKnownFreeTierModel = FREE_TIER_GEMINI_MODELS.some(
    (allowed) => normalized === allowed || normalized.startsWith(`${allowed}-`)
  );

  if (!isKnownFreeTierModel) {
    return {
      valid: false,
      model: normalized,
      message: `Invalid GEMINI_MODEL "${normalized}" for free-tier-only mode. Allowed: ${FREE_TIER_GEMINI_MODELS.join(
        ', '
      )}.`,
    };
  }

  return {
    valid: true,
    model: normalized,
    message: `Gemini free-tier model "${normalized}" is valid.`,
  };
}

/**
 * Environment configuration object
 */
export const config: EnvironmentConfig = {
  supabase: {
    url: getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    anonKey: getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  },
  gemini: {
    apiKey: validateEnv('GEMINI_API_KEY / GEMINI_API_KEYS', getGeminiApiKeys()[0]),
    apiKeys: getGeminiApiKeys(),
    model: resolveGeminiModel(),
    freeTierOnly: true,
  },
  groq: {
    apiKey: getEnv('GROQ_API_KEY', '', false),
  },
  claude: {
    apiKey: getEnv('CLAUDE_API_KEY', '', false),
  },
  app: {
    env: getEnv('NODE_ENV', 'development', false) as
      | 'development'
      | 'production'
      | 'test',
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

export function assertGeminiFreeTierConfig(): void {
  const validation = validateGeminiModel(config.gemini.model);
  if (!validation.valid) {
    throw new Error(validation.message);
  }
}

/**
 * Validates all environment variables on startup
 */
export function validateEnvironment(): void {
  try {
    // Trigger required env checks
    const requiredKeys = [
      config.supabase.url,
      config.supabase.anonKey,
      config.gemini.apiKey,
    ];
    void requiredKeys;

    assertGeminiFreeTierConfig();

    console.log('[Config] Environment variables validated successfully');
    console.log(`[Config] Gemini model: ${config.gemini.model} (free-tier only)`);
    console.log('[Config] Provider mode: Gemini only (no paid fallback)');
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

// Auto-validate on import (server only)
if (typeof window === 'undefined') {
  validateEnvironment();
}

export const FREE_TIER_MODELS = FREE_TIER_GEMINI_MODELS;

export default config;
