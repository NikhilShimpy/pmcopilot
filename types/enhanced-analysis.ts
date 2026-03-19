/**
 * PMCopilot - Enhanced Analysis Types
 * Advanced Product Intelligence System with Resource Estimation
 */

import {
  Problem,
  Feature,
  PRD,
  DevelopmentTask,
  ImpactEstimation,
  ComprehensiveAnalysisResult,
} from './analysis';

// ============================================
// ENHANCED PROBLEM TYPES
// ============================================

export interface EnhancedProblem extends Problem {
  root_cause: string;
  affected_users: string;
  current_solutions: string;
  gaps: string;
  why_it_matters: string;
  detailed_description: string;
  market_research?: string;
  competitive_analysis?: string;
}

// ============================================
// ENHANCED FEATURE TYPES
// ============================================

export interface EnhancedFeature extends Feature {
  category: 'core' | 'advanced' | 'futuristic';
  detailed_description: string;
  implementation_strategy: string;
  technical_requirements: string[];
  expected_outcome: string;
  user_scenarios: string[];
  competitive_advantage?: string;
  monetization_potential?: string;
}

// ============================================
// MANPOWER & RESOURCE ESTIMATION
// ============================================

export interface RoleRequirement {
  role: string;
  type: 'full-time' | 'part-time' | 'contract' | 'consultant';
  count: number;
  duration_weeks: number;
  skills_required: string[];
  responsibilities: string[];
  estimated_cost_usd: number;
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
}

export interface ManpowerEstimation {
  total_people: number;
  total_person_weeks: number;
  by_phase: {
    phase_1_mvp: RoleRequirement[];
    phase_2_scale: RoleRequirement[];
    phase_3_advanced: RoleRequirement[];
  };
  by_function: {
    engineering: RoleRequirement[];
    product_management: RoleRequirement[];
    design: RoleRequirement[];
    qa_testing: RoleRequirement[];
    devops_infrastructure: RoleRequirement[];
    data_science?: RoleRequirement[];
  };
  organizational_structure: {
    team_composition: string;
    reporting_structure: string;
    collaboration_model: string;
  };
}

// ============================================
// RESOURCE REQUIREMENTS
// ============================================

export interface TechnicalResources {
  infrastructure: {
    category: string;
    items: Array<{
      resource: string;
      type: 'cloud' | 'on-premise' | 'saas' | 'paas';
      provider: string;
      specifications: string;
      monthly_cost_usd: number;
      annual_cost_usd: number;
    }>;
  };
  software_licenses: {
    category: string;
    items: Array<{
      software: string;
      license_type: string;
      users: number;
      monthly_cost_usd: number;
      annual_cost_usd: number;
    }>;
  };
  third_party_services: {
    category: string;
    items: Array<{
      service: string;
      purpose: string;
      provider: string;
      tier: string;
      monthly_cost_usd: number;
      annual_cost_usd: number;
    }>;
  };
}

export interface ResourceEstimation {
  technical: TechnicalResources;
  operational: {
    office_space?: {
      type: string;
      capacity: number;
      monthly_cost_usd: number;
    };
    equipment: Array<{
      item: string;
      quantity: number;
      unit_cost_usd: number;
      total_cost_usd: number;
    }>;
    training_development: {
      description: string;
      estimated_cost_usd: number;
    };
  };
  contingency: {
    percentage: number;
    amount_usd: number;
    rationale: string;
  };
}

// ============================================
// TIMELINE ESTIMATION
// ============================================

export interface MilestoneTimeline {
  phase: string;
  duration_weeks: number;
  start_week: number;
  end_week: number;
  milestones: Array<{
    name: string;
    week: number;
    deliverables: string[];
    dependencies: string[];
    risk_level: 'low' | 'medium' | 'high';
  }>;
  critical_path: string[];
}

export interface TimelineEstimation {
  total_duration_weeks: number;
  phases: MilestoneTimeline[];
  parallel_tracks: string[];
  dependencies_map: Record<string, string[]>;
  buffer_weeks: number;
  estimated_launch_date: string;
}

// ============================================
// COST BREAKDOWN
// ============================================

export interface CostBreakdown {
  development: {
    engineering: number;
    design: number;
    product_management: number;
    qa_testing: number;
    total: number;
  };
  infrastructure: {
    cloud_services: number;
    software_licenses: number;
    third_party_apis: number;
    total: number;
  };
  operational: {
    office_equipment: number;
    training: number;
    miscellaneous: number;
    total: number;
  };
  marketing_launch?: {
    go_to_market: number;
    user_acquisition: number;
    total: number;
  };
  contingency: number;
  grand_total: number;
  breakdown_by_phase: {
    phase_1_mvp: number;
    phase_2_scale: number;
    phase_3_advanced: number;
  };
  monthly_burn_rate: number;
}

// ============================================
// GAP ANALYSIS
// ============================================

export interface GapAnalysis {
  current_state: {
    what_exists: string[];
    current_capabilities: string[];
    current_limitations: string[];
  };
  desired_state: {
    target_capabilities: string[];
    success_criteria: string[];
  };
  gaps: Array<{
    gap_id: string;
    category: 'technical' | 'product' | 'market' | 'organizational';
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    impact: string;
    remediation: string;
    priority: number;
  }>;
  bridging_strategy: {
    quick_wins: string[];
    medium_term: string[];
    long_term: string[];
  };
}

// ============================================
// ENHANCED EXECUTION PLAN
// ============================================

export interface PhaseDetail {
  phase_name: string;
  duration_weeks: number;
  objectives: string[];
  key_deliverables: string[];
  success_metrics: string[];
  tasks: Array<{
    task_id: string;
    title: string;
    description: string;
    owner_role: string;
    estimated_hours: number;
    dependencies: string[];
    acceptance_criteria: string[];
  }>;
  risks: Array<{
    risk: string;
    probability: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
    mitigation: string;
  }>;
  team_composition: RoleRequirement[];
}

export interface ExecutionPlan {
  phase_1_mvp: PhaseDetail;
  phase_2_scale: PhaseDetail;
  phase_3_advanced: PhaseDetail;
  overall_strategy: string;
  success_criteria: string[];
  key_assumptions: string[];
}

// ============================================
// ENHANCED PRD
// ============================================

export interface EnhancedPRD extends PRD {
  vision: string;
  target_users: string[];
  user_personas: Array<{
    name: string;
    description: string;
    goals: string[];
    pain_points: string[];
    user_journey: string;
  }>;
  market_analysis: {
    market_size: string;
    growth_rate: string;
    competitors: string[];
    competitive_advantages: string[];
  };
  technical_architecture: {
    high_level_design: string;
    tech_stack: string[];
    scalability_considerations: string[];
    security_requirements: string[];
  };
  go_to_market_strategy?: {
    launch_strategy: string;
    pricing_model: string;
    distribution_channels: string[];
  };
}

// ============================================
// SYSTEM DESIGN
// ============================================

export interface SystemDesign {
  architecture: string;
  components: Array<{
    name: string;
    type: 'frontend' | 'backend' | 'database' | 'service' | 'infrastructure';
    description: string;
    technologies: string[];
    responsibilities: string[];
    interfaces: string[];
  }>;
  data_flow: string;
  scalability: {
    horizontal_scaling: string;
    vertical_scaling: string;
    load_balancing: string;
    caching_strategy: string;
    cdn_strategy?: string;
  };
  security: {
    authentication: string;
    authorization: string;
    data_encryption: string;
    api_security: string;
    compliance: string[];
  };
  monitoring_observability: {
    logging: string;
    metrics: string;
    alerting: string;
    tracing: string;
  };
}

// ============================================
// COMPREHENSIVE ENHANCED RESULT
// ============================================

export interface EnhancedAnalysisResult extends Omit<ComprehensiveAnalysisResult, 'problems' | 'features' | 'prd'> {
  // Enhanced core results
  problems: EnhancedProblem[];
  features: EnhancedFeature[];
  prd: EnhancedPRD;

  // New comprehensive sections
  executive_summary_detailed: {
    expanded_problem_space: string;
    key_insight: string;
    opportunity_score: number;
    innovation_angle: string;
    market_opportunity: string;
  };

  gap_analysis: GapAnalysis;
  execution_plan: ExecutionPlan;
  system_design: SystemDesign;
  manpower: ManpowerEstimation;
  resources: ResourceEstimation;
  timeline: TimelineEstimation;
  cost_breakdown: CostBreakdown;

  // Enhanced impact with more detail
  impact_detailed: ImpactEstimation & {
    market_size_estimate: string;
    roi_projection: {
      year_1: string;
      year_2: string;
      year_3: string;
    };
    break_even_analysis: string;
  };
}

// ============================================
// CHAT TYPES
// ============================================

export interface ChatMessage {
  id: string;
  analysis_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: {
    section_type?: string; // e.g., 'problem', 'feature', 'prd'
    section_id?: string;
    section_content?: string;
  };
  created_at: string;
}

export interface ChatSession {
  id: string;
  analysis_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface DragDropContext {
  section_type: string;
  section_id: string;
  section_title: string;
  section_content: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface EnhancedAnalyzeRequest {
  project_id?: string;
  feedback: string;
  context?: {
    project_name?: string;
    project_context?: string;
    user_persona?: string;
    industry?: string;
    product_type?: string;
    budget_range?: string;
    timeline_constraint?: string;
  };
  options?: {
    detail_level: 'standard' | 'enhanced' | 'comprehensive';
    include_cost_estimation: boolean;
    include_marketanalysis: boolean;
  };
}

export interface ChatRequest {
  analysis_id: string;
  message: string;
  context?: DragDropContext;
  previous_messages?: ChatMessage[];
}

export interface ChatResponse {
  success: boolean;
  message?: ChatMessage;
  error?: string;
}
