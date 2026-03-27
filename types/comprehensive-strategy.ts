/**
 * PMCopilot - Comprehensive Product Strategy Types
 * Complete Product Thinking Engine Output Schema
 *
 * This represents the 13-section output that combines:
 * - YC-level pitch
 * - McKinsey-quality analysis
 * - CTO execution document
 */

// ============================================
// SECTION 1: EXECUTIVE DASHBOARD
// ============================================

export interface ExecutiveDashboard {
  idea_expansion: string;
  key_insight: string;
  innovation_score: number; // 0-10
  market_opportunity: string;
  complexity_level: 'Low' | 'Medium' | 'High' | 'Very High';
  recommended_strategy: string;
}

// ============================================
// SECTION 2: PROBLEM ANALYSIS (5-10 problems)
// ============================================

export interface StrategicProblem {
  id: string;
  title: string;
  deep_description: string;
  root_cause: string;
  affected_users: string;
  current_solutions: string;
  gaps_in_market: string;
  why_existing_fails: string;
  severity_score: number; // 0-10
  frequency_score: number; // 0-10
  business_impact: string;
  technical_difficulty: 'Low' | 'Medium' | 'High';
  evidence_examples: string[];
}

// ============================================
// SECTION 3: FEATURE SYSTEM (15-30 features)
// ============================================

export interface StrategicFeature {
  id: string;
  name: string;
  category: 'core' | 'advanced' | 'futuristic';
  detailed_description: string;
  why_needed: string;
  linked_problems: string[];
  user_value: string;
  business_value: string;
  implementation_strategy: string[];
  technical_requirements: string[];
  dependencies: string[];
  complexity: 'Low' | 'Medium' | 'High';
  estimated_dev_time: string;
}

// ============================================
// SECTION 4: GAPS & OPPORTUNITIES
// ============================================

export interface GapsOpportunities {
  market_lacks: string[];
  why_competitors_fail: string[];
  innovation_opportunities: string[];
  unfair_advantages: string[];
}

// ============================================
// SECTION 5: COMPREHENSIVE PRD
// ============================================

export interface UserPersona {
  name: string;
  description: string;
  goals: string[];
  pain_points: string[];
  user_journey: string;
}

export interface UserStory {
  id: string;
  persona: string;
  action: string;
  benefit: string;
  full_statement: string;
  acceptance_criteria: string[];
}

export interface AcceptanceCriterion {
  id: string;
  description?: string;
  priority?: 'Must' | 'Should' | 'Could';
  test_scenarios?: string[];
  requirement?: string;
  criteria?: string;
  testable?: boolean;
}

export interface RiskItem {
  risk: string;
  impact: 'High' | 'Medium' | 'Low';
  probability: 'High' | 'Medium' | 'Low';
  mitigation: string;
}

export interface ComprehensivePRD {
  vision: string;
  mission: string;
  problem_statement: string;
  target_users: string[];
  personas: UserPersona[];
  user_journey: string;
  goals_short_term: string[];
  goals_long_term: string[];
  non_goals: string[];
  feature_requirements: string[];
  user_stories?: UserStory[];
  acceptance_criteria: AcceptanceCriterion[];
  success_metrics: string[];
  risk_analysis?: RiskItem[];
  risks?: string[];
  assumptions?: string[];
  compliance?: string[];
  dependencies?: string[];
}

// ============================================
// SECTION 6: SYSTEM DESIGN
// ============================================

export interface SystemComponent {
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'service' | 'infrastructure';
  description: string;
  technologies: string[];
  responsibilities: string[];
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  request_body?: string;
  response: string;
}

export interface DatabaseSchema {
  table_name: string;
  description: string;
  columns: string[];
  relationships: string[];
}

export interface StrategicSystemDesign {
  architecture_overview: string;
  frontend_components?: SystemComponent[];
  backend_services?: SystemComponent[];
  database_design?: DatabaseSchema[];
  apis?: APIEndpoint[];
  ai_integration?: string;
  data_flow?: string;
  scalability_strategy?: string;
  security_considerations?: string[];
  core_components?: any[];
  data_models?: string;
  api_design?: string;
  scalability_plan?: string;
  technology_stack?: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    infrastructure?: string[];
    third_party?: string[];
  };
}

// ============================================
// SECTION 7: DEVELOPMENT TASKS (20-40 tasks)
// ============================================

export interface StrategicTask {
  id: string;
  title: string;
  detailed_steps: string[];
  type: 'frontend' | 'backend' | 'ai' | 'devops' | 'design' | 'testing' | 'database';
  tech_stack: string[];
  dependencies: string[];
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimated_time: string;
  expected_output: string;
}

// ============================================
// SECTION 8: EXECUTION ROADMAP
// ============================================

export interface RoadmapPhase {
  phase_name?: string;
  features?: string[];
  goals?: string[];
  timeline?: string;
  success_criteria?: string[];
  duration?: string;
  key_features?: string[];
  resources_needed?: string[];
}

export interface ExecutionRoadmap {
  phase_1_mvp?: RoadmapPhase;
  phase_2_scale?: RoadmapPhase;
  phase_3_advanced?: RoadmapPhase;
  phase_2_growth?: RoadmapPhase;
  phase_3_scale?: RoadmapPhase;
  overall_timeline?: string;
  milestones?: any[];
}

// ============================================
// SECTION 9: MANPOWER PLANNING
// ============================================

export interface TeamRole {
  role: string;
  count: number;
  skill_level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal';
  responsibilities: string[];
  skills_required: string[];
}

export interface ManpowerPlan {
  roles?: TeamRole[];
  total_headcount?: number;
  minimum_team?: {
    description: string;
    roles: TeamRole[];
    total: number;
  };
  ideal_team?: {
    description: string;
    roles: TeamRole[];
    total: number;
  };
  hiring_priority?: string[];
  team_composition?: any[];
  hiring_plan?: string;
  total_monthly_cost_inr?: number;
  total_team_size?: number;
}

// ============================================
// SECTION 10: RESOURCE REQUIREMENTS
// ============================================

export interface ResourceItem {
  name: string;
  category: 'cloud' | 'api' | 'tool' | 'hardware' | 'software' | 'dataset';
  description: string;
  provider?: string;
  estimated_cost?: string;
}

export interface ResourcePlan {
  tools_needed: ResourceItem[];
  third_party_services: ResourceItem[];
  hardware_software: ResourceItem[];
  datasets: ResourceItem[];
}

// ============================================
// SECTION 11: COST ESTIMATION
// ============================================

export interface CostBreakdownItem {
  category: string;
  items: {
    name: string;
    monthly_cost: number;
    annual_cost: number;
  }[];
  subtotal_monthly: number;
  subtotal_annual: number;
}

// ============================================
// SECTION 10: RESOURCE PLANNING
// ============================================

export interface InfrastructureCost {
  service: string;
  purpose: string;
  monthly_cost_inr: number;
  scaling_factor: string;
}

export interface ThirdPartyService {
  service: string;
  purpose: string;
  monthly_cost_inr: number;
}

export interface ResourcePlan {
  infrastructure_costs: InfrastructureCost[];
  third_party_services: ThirdPartyService[];
  total_monthly_infrastructure_cost_inr: number;
}

// ============================================
// SECTION 11: COST PLANNING (ENHANCED)
// ============================================

export interface TeamCost {
  role: string;
  count: number;
  monthly_cost_inr: number;
  seniority: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal' | 'Director';
  responsibilities: string[];
  skills_required: string[];
}

export interface DevelopmentPhaseCost {
  mvp: number;
  growth: number;
  scale: number;
}

export interface OperationalCostsMonthly {
  team: number;
  infrastructure: number;
  marketing: number;
  others: number;
}

export interface CostPlan {
  // Development Phase Costs (in INR)
  development_phase_cost_inr: DevelopmentPhaseCost;

  // Monthly Operational Costs (in INR)
  operational_costs_monthly_inr: OperationalCostsMonthly;

  // Total First Year Cost (in INR)
  total_first_year_cost_inr: number;

  // Break-even Analysis
  break_even_analysis: string;

  // Funding Requirements
  funding_requirements: string;

  // Budget Scenario Analysis
  budget_scenarios: {
    lean_startup: {
      total_cost_inr: number;
      runway_months: number;
      team_size: number;
      description: string;
    };
    standard_startup: {
      total_cost_inr: number;
      runway_months: number;
      team_size: number;
      description: string;
    };
    well_funded: {
      total_cost_inr: number;
      runway_months: number;
      team_size: number;
      description: string;
    };
  };
}

// Legacy budget structure (backwards compatibility)
export interface BudgetVersion {
  name: string;
  description: string;
  monthly_cost: number;
  annual_cost: number;
  breakdown: CostBreakdownItem[];
}

// Legacy support (keeping old structure for backwards compatibility)
export interface LegacyCostPlan {
  monthly_cost_infra_apis: number;
  development_cost: number;
  operational_cost: number;
  engineers_cost: number;
  cloud_cost: number;
  ai_api_cost: number;
  tools_cost: number;
  low_budget_version: BudgetVersion;
  startup_version: BudgetVersion;
  scale_version: BudgetVersion;
  total_first_year: number;
}

// ============================================
// SECTION 12: TIME ESTIMATION
// ============================================

export interface FeatureTimeEstimate {
  feature_name: string;
  estimated_weeks: number;
  dependencies: string[];
}

export interface TimePlan {
  mvp_timeline: string;
  full_product_timeline: string;
  per_feature_estimates: FeatureTimeEstimate[];
  total_weeks: number;
  milestones: {
    name: string;
    target_week: number;
    deliverables: string[];
  }[];
}

// ============================================
// SECTION 13: IMPACT ANALYSIS
// ============================================

export interface ImpactAnalysis {
  user_impact: string;
  user_impact_score: number; // 0-10
  business_impact: string;
  business_impact_score: number; // 0-10
  revenue_potential?: string;
  scalability_potential?: string;
  confidence_score: number; // 0-100
  time_to_value: string;
  affected_user_percentage?: number;
  revenue_impact?: string;
  retention_impact?: string;
  market_impact?: string;
  competitive_advantage?: string;
  long_term_vision?: string;
}

// ============================================
// METADATA
// ============================================

export interface AnalysisMetadata {
  analysis_id: string;
  created_at: string;
  processing_time_ms: number;
  model_used: string;
  input_length: number;
  fallback_mode?: boolean;
}

// ============================================
// COMPLETE STRATEGY RESULT
// ============================================

export interface ComprehensiveStrategyResult {
  // Section 1: Executive Dashboard
  executive_dashboard: ExecutiveDashboard;

  // Section 2: Problem Analysis (5-10 problems)
  problem_analysis: StrategicProblem[];

  // Section 3: Feature System (15-30 features)
  feature_system: StrategicFeature[];

  // Section 4: Current Gaps & Opportunities
  gaps_opportunities: GapsOpportunities;

  // Section 5: PRD
  prd: ComprehensivePRD;

  // Section 6: System Design
  system_design: StrategicSystemDesign;

  // Section 7: Development Tasks (20-40 tasks)
  development_tasks: StrategicTask[];

  // Section 8: Execution Roadmap
  execution_roadmap: ExecutionRoadmap;

  // Section 9: Manpower Planning
  manpower_planning: ManpowerPlan;

  // Section 10: Resource Requirements
  resource_requirements: ResourcePlan;

  // Section 11: Cost Estimation (Enhanced)
  cost_estimation: CostPlan;
  cost_planning: CostPlan; // Enhanced cost planning with INR support

  // Section 12: Time Estimation
  time_estimation: TimePlan;

  // Section 13: Impact Analysis
  impact_analysis: ImpactAnalysis;

  // Metadata
  metadata: AnalysisMetadata;
}

// ============================================
// API TYPES
// ============================================

export interface ComprehensiveAnalyzeRequest {
  project_id?: string;
  feedback: string;
  detail_level?: 'standard' | 'enhanced' | 'comprehensive';
  context?: {
    project_name?: string;
    project_context?: string;
    user_persona?: string;
    industry?: string;
    product_type?: string;
  };
}

export interface ComprehensiveAnalyzeResponse {
  success: boolean;
  data?: ComprehensiveStrategyResult;
  error?: string;
  provider?: string;
}
