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

export const AI_CONFIG = {
  OPENROUTER: {
    BASE_URL: 'https://openrouter.ai/api/v1',
    CHAT_ENDPOINT: '/chat/completions',
    DEFAULT_MODEL: 'anthropic/claude-3.5-sonnet',
    TIMEOUT: 30000, // 30 seconds
  },
  PUTER: {
    SCRIPT_URL: 'https://js.puter.com/v2/',
    TIMEOUT: 30000,
  },
  MAX_RETRIES: 2,
  DEFAULT_TEMPERATURE: 0.7,
  DEFAULT_MAX_TOKENS: 2000,
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
      feedback_id UUID REFERENCES feedbacks(id) ON DELETE SET NULL,
      result JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_analyses_project_id ON analyses(project_id);
    CREATE INDEX IF NOT EXISTS idx_analyses_feedback_id ON analyses(feedback_id);
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
  FEEDBACK_DELETED: 'Feedback deleted successfully',
  ANALYSIS_COMPLETED: 'Analysis completed successfully',
  DB_SETUP_COMPLETE: 'Database setup completed successfully',
} as const;
