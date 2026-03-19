// ============================================
// COMPREHENSIVE ANALYSIS TYPES
// PMCopilot - Core AI Analysis Engine
// ============================================

// ============================================
// PROBLEM TYPES
// ============================================

export interface Problem {
  id: string;
  title: string;
  description: string;
  frequency_score: number; // 1-10, based on how often this problem is mentioned
  severity_score: number; // 1-10, based on impact words and urgency
  evidence: string[]; // Direct quotes from feedback
  category?: string; // Optional categorization
  user_segment?: string; // Which user type is affected
}

// ============================================
// FEATURE TYPES
// ============================================

export type FeaturePriority = 'High' | 'Medium' | 'Low';

export interface Feature {
  id: string;
  name: string;
  priority: FeaturePriority;
  reason: string; // WHY this feature was suggested
  linked_problems: string[]; // Problem IDs this feature addresses
  complexity?: 'Simple' | 'Medium' | 'Complex';
  estimated_impact?: string;
  supporting_evidence: string[]; // Feedback quotes that support this feature
}

// ============================================
// PRD (PRODUCT REQUIREMENTS DOCUMENT) TYPES
// ============================================

export interface UserStory {
  persona: string;
  action: string;
  benefit: string;
  full_statement: string; // "As a [persona], I want to [action] so that [benefit]"
}

export interface AcceptanceCriteria {
  id: string;
  description: string;
  testable: boolean;
  priority: 'Must' | 'Should' | 'Could';
}

export interface PRD {
  title: string;
  problem_statement: string;
  solution_overview: string;
  goals: string[];
  non_goals: string[];
  user_stories: UserStory[];
  acceptance_criteria: AcceptanceCriteria[];
  success_metrics: string[];
  risks: string[];
  dependencies: string[];
}

// ============================================
// TASK (JIRA-STYLE) TYPES
// ============================================

export type TaskType = 'frontend' | 'backend' | 'api' | 'database' | 'infrastructure' | 'design' | 'testing';
export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type TaskSize = 'XS' | 'S' | 'M' | 'L' | 'XL';

export interface DevelopmentTask {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  story_points?: number;
  size?: TaskSize;
  linked_feature?: string; // Feature ID this task implements
  dependencies?: string[]; // Other task IDs this depends on
  technical_notes?: string;
  acceptance_criteria?: string[];
}

// ============================================
// IMPACT ESTIMATION TYPES
// ============================================

export interface ImpactEstimation {
  user_impact: string; // Qualitative description
  user_impact_score: number; // 1-10
  business_impact: string; // Qualitative description
  business_impact_score: number; // 1-10
  confidence_score: number; // 0-1, how confident is the AI in this analysis
  time_to_value?: string; // Estimated time to see impact
  affected_user_percentage?: number; // % of users affected
  revenue_impact?: 'Increase' | 'Decrease' | 'Neutral' | 'Unknown';
  retention_impact?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown';
}

// ============================================
// PIPELINE STAGE RESULTS
// ============================================

export interface CleanedFeedback {
  original: string;
  cleaned: string;
  language: string;
  word_count: number;
  noise_removed: string[];
}

export interface FeedbackCluster {
  id: string;
  theme: string;
  feedback_items: string[];
  count: number;
  representative_quote: string;
}

export interface ScoringResult {
  problem_id: string;
  frequency_score: number;
  severity_score: number;
  frequency_factors: string[];
  severity_factors: string[];
}

// ============================================
// MAIN ANALYSIS RESULT
// ============================================

export interface ComprehensiveAnalysisResult {
  // Metadata
  analysis_id: string;
  created_at: string;
  processing_time_ms: number;
  model_used: string;
  total_feedback_items: number;

  // Core Results
  problems: Problem[];
  features: Feature[];
  prd: PRD;
  tasks: DevelopmentTask[];
  impact: ImpactEstimation;

  // Explainability Layer
  explainability: {
    methodology: string;
    data_quality_score: number; // 0-1
    confidence_factors: string[];
    limitations: string[];
    recommendations: string[];
  };

  // Summary
  executive_summary: string;
  key_findings: string[];
  immediate_actions: string[];
}

// ============================================
// PIPELINE TYPES
// ============================================

export type PipelineStage =
  | 'cleaning'
  | 'clustering'
  | 'scoring'
  | 'feature_generation'
  | 'prd_generation'
  | 'task_generation'
  | 'impact_estimation';

export interface PipelineProgress {
  current_stage: PipelineStage;
  stages_completed: PipelineStage[];
  progress_percentage: number;
  current_stage_start: string;
  estimated_remaining_ms?: number;
}

export interface PipelineContext {
  project_id?: string;
  project_name?: string;
  project_context?: string;
  user_persona?: string;
  industry?: string;
  product_type?: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface AnalyzeRequest {
  project_id?: string;
  feedback: string;
  detail_level?: 'standard' | 'enhanced';
  context?: PipelineContext;
  options?: {
    skip_stages?: PipelineStage[];
    detailed_mode?: boolean;
    max_problems?: number;
    max_features?: number;
    max_tasks?: number;
  };
}

export interface AnalyzeResponse {
  success: boolean;
  data?: ComprehensiveAnalysisResult;
  error?: string;
  error_code?: string;
  provider?: 'openrouter' | 'openrouter-free' | 'puter' | 'groq' | 'groq-fast' | 'groq-enhanced' | 'huggingface' | string;
  pipeline_progress?: PipelineProgress;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  expected?: string;
  received?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  parsed_data?: ComprehensiveAnalysisResult;
}

// ============================================
// AI PROMPT TYPES
// ============================================

export interface StagePrompt {
  stage: PipelineStage;
  system_prompt: string;
  user_prompt: string;
  expected_output_schema: Record<string, any>;
  temperature: number;
  max_tokens: number;
}

export interface StageResult<T> {
  stage: PipelineStage;
  success: boolean;
  data?: T;
  error?: string;
  raw_response?: string;
  retry_count: number;
  duration_ms: number;
}
