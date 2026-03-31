// ============================================
// DATABASE TYPES
// ============================================

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface Feedback {
  id: string;
  project_id: string;
  title?: string | null;
  content: string;
  category?: FeedbackCategory;
  priority?: FeedbackPriority;
  status?: FeedbackStatus;
  internal_notes?: string | null;
  created_by?: string | null;
  source?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface Analysis {
  id: string;
  project_id: string;
  feedback_id?: string;
  result: AnalysisResult;
  created_at: string;
}

// ============================================
// AI TYPES
// ============================================

export interface AnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  themes: string[];
  actionableInsights: ActionableInsight[];
  summary: string;
  confidence: number;
  priorities?: Priority[];
}

export interface ActionableInsight {
  category: string;
  insight: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  suggestedAction?: string;
}

export interface Priority {
  title: string;
  description: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
  provider?: 'gemini' | 'groq';
}

// ============================================
// API TYPES
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// AUTH TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSession {
  user: User;
  access_token: string;
  refresh_token?: string;
}

// ============================================
// REQUEST TYPES
// ============================================

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateFeedbackRequest {
  project_id: string;
  title?: string;
  content: string;
  category?: FeedbackCategory;
  priority?: FeedbackPriority;
  status?: FeedbackStatus;
  internal_notes?: string;
  source?: string;
  metadata?: Record<string, any>;
}

export type FeedbackCategory =
  | 'bug'
  | 'feature'
  | 'improvement'
  | 'ux'
  | 'performance'
  | 'other';

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeedbackStatus = 'new' | 'reviewed' | 'planned' | 'done';

export interface ProfileRecord {
  id: string;
  email: string;
  full_name?: string | null;
  job_title?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface UserSettings {
  id: string;
  theme: 'system' | 'light' | 'dark';
  shortcut_hints_enabled: boolean;
  notifications: {
    email: boolean;
    product: boolean;
    feedback: boolean;
    analysis: boolean;
  };
  dashboard_preferences: {
    compact_mode: boolean;
    default_project_view: 'grid' | 'list';
    show_welcome_banner: boolean;
  };
  ai_preferences: {
    default_output_length: 'short' | 'medium' | 'long' | 'extra-long';
    include_cost_estimation: boolean;
    include_timeline: boolean;
  };
  updated_at?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  project_id?: string | null;
  subject: string;
  message: string;
  category: 'technical' | 'billing' | 'feature' | 'general';
  priority: FeedbackPriority;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  response_message?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AnalyzeFeedbackRequest {
  feedback: string;
  project_id?: string;
  context?: string;
}

// ============================================
// UTILITY TYPES
// ============================================

export type ErrorCode =
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'AI_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMIT_ERROR';

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: any;
  timestamp: string;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// ============================================
// ENVIRONMENT TYPES
// ============================================

/**
 * Environment configuration
 *
 * AI PROVIDERS:
 * - PRIMARY: Google Gemini API
 * - FALLBACK: Groq (only if Gemini fails)
 *
 * REMOVED: Ollama, HuggingFace, OpenRouter
 */
export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  gemini: {
    apiKey: string;
    apiKeys: string[];
    model: string;
    freeTierOnly: boolean;
  };
  groq: {
    apiKey: string;
  };
  claude: {
    apiKey: string;
  };
  app: {
    env: 'development' | 'production' | 'test';
  };
}

// ============================================
// RE-EXPORT COMPREHENSIVE ANALYSIS TYPES
// ============================================

export * from './analysis';
