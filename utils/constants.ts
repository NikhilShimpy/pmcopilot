// ============================================
// API ROUTES
// ============================================

export const API_ROUTES = {
  // Setup
  SETUP_DB: '/api/setup-db',

  // Analysis
  ANALYZE: '/api/analyze',

  // Projects
  PROJECTS: '/api/projects',
  PROJECT_BY_ID: (id: string) => `/api/projects/${id}`,

  // Feedback
  FEEDBACK: '/api/feedback',
  FEEDBACK_BY_ID: (id: string) => `/api/feedback/${id}`,
  FEEDBACK_BY_PROJECT: (projectId: string) => `/api/feedback?project_id=${projectId}`,

  // Integrations
  INTEGRATIONS: {
    GMAIL: '/api/integrations/gmail',
    SLACK: '/api/integrations/slack',
    WEBHOOK: '/api/webhook/feedback',
  },
} as const;

// ============================================
// HTTP STATUS CODES
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================
// AI CONFIGURATION
// ============================================

/**
 * AI CONFIGURATION
 * Runtime generation is enforced as Gemini free-tier only.
 */
export const AI_CONFIG = {
  // FREE-TIER GEMINI ONLY
  GEMINI: {
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
    DEFAULT_MODEL: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite',
    TIMEOUT: 90000,
  },

  // Legacy provider settings retained for compatibility only.
  // No runtime fallback path should route to paid providers.
  GROQ: {
    BASE_URL: 'https://api.groq.com/openai/v1',
    CHAT_ENDPOINT: '/chat/completions',
    DEFAULT_MODEL: 'llama-3.3-70b-versatile',
    FAST_MODEL: 'llama-3.1-8b-instant',
    TIMEOUT: 90000,
  },

  // Legacy provider settings retained for compatibility only.
  CLAUDE: {
    BASE_URL: 'https://api.anthropic.com/v1',
    MESSAGES_ENDPOINT: '/messages',
    DEFAULT_MODEL: 'claude-3-5-sonnet-20241022',
    TIMEOUT: 60000,
  },

  MAX_RETRIES: 2,
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 4096,

  // Pipeline-specific configuration
  PIPELINE: {
    STAGES: {
      cleaning: { temperature: 0.3, max_tokens: 2000, timeout: 20000 },
      clustering: { temperature: 0.5, max_tokens: 3000, timeout: 30000 },
      scoring: { temperature: 0.3, max_tokens: 2000, timeout: 20000 },
      feature_generation: { temperature: 0.7, max_tokens: 8000, timeout: 60000 },
      prd_generation: { temperature: 0.6, max_tokens: 6000, timeout: 50000 },
      task_generation: { temperature: 0.5, max_tokens: 8000, timeout: 60000 },
      impact_estimation: { temperature: 0.5, max_tokens: 4000, timeout: 30000 },
    },
    TOTAL_TIMEOUT: 300000, // 5 minutes max
    ENABLE_PARALLEL: false,
    RETRY_PER_STAGE: 2,
  },

  // Severity keywords for scoring
  SEVERITY_KEYWORDS: {
    critical: ['crash', 'broken', 'unusable', 'data loss', 'security', 'urgent', 'critical', 'emergency', 'blocker'],
    high: ['frustrating', 'annoying', 'hate', 'terrible', 'awful', 'worst', 'unacceptable', 'major'],
    medium: ['difficult', 'confusing', 'slow', 'inconvenient', 'needs improvement', 'could be better'],
    low: ['minor', 'small', 'would be nice', 'suggestion', 'idea', 'nice to have'],
  },
} as const;

// ============================================
// DATABASE CONSTANTS
// ============================================

export const DB_TABLES = {
  PROJECTS: 'projects',
  FEEDBACK: 'feedbacks',
  ANALYSES: 'analyses',
} as const;

export const DB_SCHEMA = {
  PROJECTS: `
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
  `,
  FEEDBACK: `
    CREATE TABLE IF NOT EXISTS feedbacks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      source TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_feedbacks_project_id ON feedbacks(project_id);
  `,
  ANALYSES: `
    CREATE TABLE IF NOT EXISTS analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      result JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);
  `,
} as const;

// ============================================
// VALIDATION CONSTANTS
// ============================================

export const VALIDATION = {
  PROJECT_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
  },
  PROJECT_DESCRIPTION: {
    MAX_LENGTH: 1000,
  },
  FEEDBACK_CONTENT: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 10000,
  },
  ANALYSIS_INPUT: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 10000,
  },
} as const;

// ============================================
// REGEX PATTERNS
// ============================================

export const REGEX = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// ============================================
// DEFAULTS
// ============================================

export const DEFAULTS = {
  PAGINATION: {
    PAGE: 1,
    LIMIT: 20,
    MAX_LIMIT: 100,
  },
  CACHE_TTL: 300, // 5 minutes in seconds
} as const;

// ============================================
// ERROR MESSAGES
// ============================================

export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred',
  UNAUTHORIZED: 'You must be logged in to perform this action',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'The requested resource was not found',
  VALIDATION: 'Validation failed',
  DATABASE: 'Database operation failed',
  AI_SERVICE: 'AI service is currently unavailable',
  RATE_LIMIT: 'Too many requests, please try again later',
} as const;

// ============================================
// SUCCESS MESSAGES
// ============================================

export const SUCCESS_MESSAGES = {
  PROJECT_CREATED: 'Project created successfully',
  PROJECT_UPDATED: 'Project updated successfully',
  PROJECT_DELETED: 'Project deleted successfully',
  FEEDBACK_CREATED: 'Feedback created successfully',
  FEEDBACK_UPDATED: 'Feedback updated successfully',
  FEEDBACK_DELETED: 'Feedback deleted successfully',
  ANALYSIS_COMPLETED: 'Analysis completed successfully',
  DB_SETUP_COMPLETE: 'Database setup completed successfully',
} as const;
