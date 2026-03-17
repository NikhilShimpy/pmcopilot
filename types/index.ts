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
  content: string;
  source?: string;
  metadata?: Record<string, any>;
  created_at: string;
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
  provider?: 'openrouter' | 'puter';
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
  created_at: string;
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
  content: string;
  source?: string;
  metadata?: Record<string, any>;
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

export interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  openrouter: {
    apiKey: string;
  };
  app: {
    env: 'development' | 'production' | 'test';
  };
}
