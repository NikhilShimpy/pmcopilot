/**
 * PMCopilot - Comprehensive Product Strategy Types
 * Backwards-compatible schema for both legacy full-generation output
 * and the newer Gemini section-by-section flow.
 */

export type StrategySectionId =
  | 'overview'
  | 'executive-dashboard'
  | 'problem-analysis'
  | 'feature-system'
  | 'gaps-opportunities'
  | 'prd'
  | 'system-design'
  | 'development-tasks'
  | 'execution-roadmap'
  | 'manpower-planning'
  | 'resources'
  | 'cost-estimation'
  | 'timeline'
  | 'impact-analysis';

export interface CostIntakeSelections {
  market_business?: {
    target_market_size?: string;
    audience_type?: string;
    monetization_model?: string;
    competition_level?: string;
    launch_geography?: string;
  };
  user_scale?: {
    expected_users?: string;
    concurrent_users?: string;
    growth_expectation?: string;
    user_roles?: string;
    retention_needs?: string;
  };
  feature_complexity?: {
    basic_features?: string;
    advanced_features?: string;
    ai_features?: string;
    realtime_features?: string;
    integrations_complexity?: string;
    automation_level?: string;
  };
  technical_complexity?: {
    frontend_complexity?: string;
    backend_complexity?: string;
    database_complexity?: string;
    ai_ml_level?: string;
    security_level?: string;
  };
  infrastructure_hosting?: {
    cloud_preference?: string;
    hosting_scale?: string;
    storage_bandwidth?: string;
    cdn_autoscaling?: string;
  };
  integrations_apis?: {
    payment?: string;
    maps_location?: string;
    communication?: string;
    ai_apis?: string;
    social_login?: string;
    domain_integrations?: string;
  };
  design_ux?: {
    design_quality?: string;
    animations?: string;
    accessibility?: string;
    responsiveness?: string;
  };
  security_compliance?: {
    auth_level?: string;
    encryption?: string;
    compliance?: string;
    backup_disaster_recovery?: string;
  };
  development_factors?: {
    team_mode?: string;
    seniority?: string;
    delivery_speed?: string;
    stack_preference?: string;
  };
  maintenance_scaling?: {
    bug_fixing?: string;
    update_frequency?: string;
    support_level?: string;
    scaling_plan?: string;
    monitoring_logging?: string;
  };
  performance_requirements?: {
    page_speed?: string;
    realtime_response?: string;
    uptime_sla?: string;
    optimization_level?: string;
  };
  business_model_impact?: {
    business_model?: string;
  };
  product_type?: {
    product_type?: string;
  };
  notes?: string;
}

export interface ExecutiveDashboard {
  idea_expansion: string;
  key_insight: string;
  innovation_score: number;
  market_opportunity: string;
  complexity_level: 'Low' | 'Medium' | 'High' | 'Very High';
  recommended_strategy: string;
  idea_expansion_breakdown?: string[];
  market_opportunity_signals?: string[];
  recommended_strategy_actions?: string[];
  score_rationale?: string;
}

export interface StrategicProblem {
  id: string;
  title: string;
  deep_description: string;
  detailed_description?: string;
  description?: string;
  root_cause?: string;
  affected_users?: string;
  current_solutions?: string;
  gaps_in_market?: string;
  why_existing_fails?: string;
  severity_score: number;
  frequency_score: number;
  business_impact?: string;
  technical_difficulty?: 'Low' | 'Medium' | 'High';
  evidence_examples?: string[];
  severity?: string;
  category?: string;
  consequence_of_inaction?: string;
}

export interface StrategicFeature {
  id: string;
  name: string;
  title?: string;
  category: 'core' | 'advanced' | 'optional' | 'futuristic' | string;
  detailed_description: string;
  description?: string;
  why_needed?: string;
  linked_problems?: string[];
  mapped_problem_ids?: string[];
  user_value?: string;
  business_value?: string;
  implementation_strategy?: string[];
  technical_requirements?: string[];
  dependencies?: string[];
  complexity: 'Low' | 'Medium' | 'High' | 'Simple' | 'Complex' | string;
  estimated_dev_time?: string;
  estimated_hours?: number;
  priority?: 'High' | 'Medium' | 'Low';
  user_story?: string;
  acceptance_criteria?: string[];
}

export interface GapsOpportunities {
  market_lacks: string[];
  why_competitors_fail: string[];
  innovation_opportunities: string[];
  unfair_advantages: string[];
}

export interface UserPersona {
  name: string;
  description: string;
  goals?: string[];
  pain_points?: string[];
  user_journey?: string;
}

export interface UserStory {
  id?: string;
  persona: string;
  action: string;
  benefit: string;
  full_statement?: string;
  acceptance_criteria?: string[];
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
  product_overview?: {
    product_name?: string;
    one_line_summary?: string;
    problem_statement?: string;
    vision?: string;
  };
  objectives_goals?: {
    business_goals?: string[];
    user_goals?: string[];
    kpis?: string[];
  };
  target_users_personas?: {
    user_segments?: string[];
    personas?: UserPersona[];
    key_pain_points?: string[];
  };
  problem_statement_structured?: string;
  scope?: {
    in_scope?: string[];
    out_of_scope?: string[];
  };
  features_requirements?: {
    functional_requirements?: string[];
    non_functional_requirements?: {
      performance?: string[];
      security?: string[];
      scalability?: string[];
      reliability?: string[];
    };
  };
  user_flow_journey?: Array<{
    entry_point?: string;
    actions?: string[];
    outcome?: string;
  }>;
  wireframes_mockups?: {
    screens?: Array<{
      name?: string;
      purpose?: string;
      key_elements?: string[];
    }>;
    navigation?: string[];
    layout_ideas?: string[];
  };
  timeline_milestones?: Array<{
    milestone?: string;
    target_date?: string;
    description?: string;
  }>;
  release_plan?: {
    phases?: Array<{
      name?: string;
      scope?: string[];
      exit_criteria?: string[];
    }>;
    rollout_strategy?: string;
  };
  constraints?: string[];
  compliance_legal?: string[];
  stakeholders?: Array<{
    name_or_role?: string;
    interest?: string;
    responsibility?: string;
  }>;
  open_questions?: string[];
  appendix?: {
    research_assumptions?: string[];
    competitor_notes?: string[];
    references?: string[];
  };
  vision?: string;
  mission?: string;
  problem_statement?: string;
  target_users?: string[];
  personas?: UserPersona[];
  user_journey?: string;
  goals_short_term?: string[];
  goals_long_term?: string[];
  non_goals?: string[];
  feature_requirements?: string[];
  user_stories?: UserStory[];
  acceptance_criteria?: AcceptanceCriterion[];
  success_metrics?: string[];
  risk_analysis?: RiskItem[];
  risks?: string[];
  assumptions?: string[];
  compliance?: string[];
  dependencies?: string[];
}

export interface SystemComponent {
  name: string;
  type?: 'frontend' | 'backend' | 'database' | 'service' | 'infrastructure';
  description?: string;
  technologies?: string[];
  responsibilities?: string[];
  dependencies?: string[];
  scalability_considerations?: string;
}

export interface APIEndpoint {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description?: string;
  request_body?: string;
  response?: string;
}

export interface DatabaseSchema {
  table_name: string;
  description?: string;
  columns?: string[];
  relationships?: string[];
}

export interface StrategicSystemDesign {
  architecture_overview?: string;
  frontend_components?: SystemComponent[];
  backend_services?: SystemComponent[];
  database_design?: DatabaseSchema[];
  apis?: APIEndpoint[];
  ai_integration?: string;
  data_flow?: string;
  scalability_strategy?: string;
  security_considerations?: string[];
  core_components?: SystemComponent[];
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

export interface StrategicTask {
  id: string;
  title: string;
  detailed_steps?: string[];
  type: 'frontend' | 'backend' | 'ai' | 'devops' | 'design' | 'testing' | 'database';
  tech_stack?: string[];
  dependencies?: string[];
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  estimated_time?: string;
  estimated_hours?: number;
  expected_output?: string;
  description?: string;
  category?: string;
  complexity?: string;
}

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

export interface TeamRole {
  role: string;
  count: number;
  skill_level?: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal';
  responsibilities?: string[];
  skills_required?: string[];
}

export interface TeamCost {
  role: string;
  count: number;
  monthly_cost_inr: number;
  seniority?: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal' | 'Director' | string;
  responsibilities?: string[];
  skills_required?: string[];
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
  team_composition?: TeamCost[];
  hiring_plan?: string;
  total_monthly_cost_inr?: number;
  total_team_size?: number;
  roles_rationale?: Array<{
    role: string;
    why_needed: string;
    must_have?: boolean;
    hiring_phase?: string;
  }>;
  hiring_phases?: Array<{
    phase: string;
    timeline: string;
    roles: string[];
    notes?: string;
  }>;
  team_options?: {
    lean_team?: TeamCost[];
    startup_team?: TeamCost[];
    scale_team?: TeamCost[];
  };
  assumptions?: string[];
}

export interface ResourceItem {
  name: string;
  category?: 'cloud' | 'api' | 'tool' | 'hardware' | 'software' | 'dataset' | string;
  description?: string;
  provider?: string;
  estimated_cost?: string;
}

export interface InfrastructureCost {
  service: string;
  purpose?: string;
  monthly_cost_inr?: number;
  scaling_factor?: string;
}

export interface ThirdPartyService {
  service?: string;
  name?: string;
  category?: 'api' | 'tool' | 'cloud' | string;
  description?: string;
  provider?: string;
  estimated_cost?: string;
  purpose?: string;
  monthly_cost_inr?: number;
}

export interface ResourcePlan {
  tools_needed?: ResourceItem[];
  third_party_services?: ThirdPartyService[];
  hardware_software?: ResourceItem[];
  datasets?: ResourceItem[];
  infrastructure_costs?: InfrastructureCost[];
  total_monthly_infrastructure_cost_inr?: number;
}

export interface CostBreakdownItem {
  category: string;
  items: {
    name: string;
    monthly_cost?: number;
    annual_cost?: number;
  }[];
  subtotal_monthly?: number;
  subtotal_annual?: number;
}

export interface BudgetVersion {
  name?: string;
  description?: string;
  monthly_cost?: number;
  annual_cost?: number;
  breakdown?: CostBreakdownItem[];
}

export interface DevelopmentPhaseCost {
  mvp?: number;
  growth?: number;
  scale?: number;
}

export interface OperationalCostsMonthly {
  team?: number;
  infrastructure?: number;
  marketing?: number;
  others?: number;
}

export interface CostPlan {
  development_phase_cost_inr?: DevelopmentPhaseCost;
  operational_costs_monthly_inr?: OperationalCostsMonthly;
  total_first_year_cost_inr?: number;
  break_even_analysis?: string;
  funding_requirements?: string;
  budget_scenarios?: {
    lean_startup?: {
      total_cost_inr?: number;
      runway_months?: number;
      team_size?: number | string;
      description?: string;
    };
    standard_startup?: {
      total_cost_inr?: number;
      runway_months?: number;
      team_size?: number | string;
      description?: string;
    };
    well_funded?: {
      total_cost_inr?: number;
      runway_months?: number;
      team_size?: number | string;
      description?: string;
    };
  };
  monthly_cost_infra_apis?: number;
  development_cost?: number;
  operational_cost?: number;
  engineers_cost?: number;
  cloud_cost?: number;
  ai_api_cost?: number;
  tools_cost?: number;
  low_budget_version?: BudgetVersion;
  startup_version?: BudgetVersion;
  scale_version?: BudgetVersion;
  total_first_year?: number;
  assumptions?: string[];
  cost_drivers?: Array<{
    driver: string;
    selected_option?: string;
    impact_level?: 'Low' | 'Medium' | 'High' | string;
    notes?: string;
  }>;
  budget_ranges?: {
    currency?: string;
    mvp?: { min: number; max: number };
    startup?: { min: number; max: number };
    scale?: { min: number; max: number };
  };
  team_implications?: string[];
  infra_implications?: string[];
  maintenance_implications?: string[];
  confidence_level?: 'Low' | 'Medium' | 'High' | string;
  uncertainty_notes?: string[];
  break_even_months?: number;
}

export interface FeatureTimeEstimate {
  feature_name: string;
  estimated_weeks?: number;
  dependencies?: string[];
}

export interface TimeMilestone {
  name?: string;
  target_week?: number;
  deliverables?: string[];
  week?: number;
  milestone?: string;
}

export interface TimePlan {
  mvp_timeline?: any;
  full_product_timeline?: string;
  per_feature_estimates?: FeatureTimeEstimate[];
  total_weeks?: number;
  milestones?: TimeMilestone[];
  critical_path?: string[];
  phases?: Array<{
    phase_name: string;
    duration: string;
    goals: string[];
    deliverables: string[];
    dependencies: string[];
    risks: string[];
    staffing_assumptions: string[];
  }>;
  mvp_vs_post_mvp?: {
    mvp_focus?: string[];
    post_mvp_focus?: string[];
  };
  assumptions?: string[];
}

export interface ImpactAnalysis {
  user_impact?: string;
  user_impact_score?: number;
  business_impact?: string;
  business_impact_score?: number;
  revenue_potential?: string;
  scalability_potential?: string;
  confidence_score?: number;
  time_to_value?: string;
  affected_user_percentage?: number;
  revenue_impact?: string;
  retention_impact?: string;
  market_impact?: string;
  competitive_advantage?: string;
  long_term_vision?: string;
}

export interface AnalysisMetadata {
  analysis_id: string;
  created_at: string;
  processing_time_ms: number;
  model_used: string;
  input_length: number;
  fallback_mode?: boolean;
  fallback_reason?: string;
  extracted_context?: unknown;
  provider?: string;
  generated_sections?: StrategySectionId[];
  section_providers?: Partial<Record<StrategySectionId, string>>;
  source_input?: string;
  project_name?: string;
  project_context?: string;
  cost_intake?: CostIntakeSelections;
  detail_level?: string;
  saved_analysis_id?: string;
  [key: string]: unknown;
}

export interface ComprehensiveStrategyResult {
  executive_dashboard: ExecutiveDashboard;
  problem_analysis: StrategicProblem[];
  feature_system: StrategicFeature[];
  gaps_opportunities: GapsOpportunities;
  prd: ComprehensivePRD;
  system_design: StrategicSystemDesign;
  development_tasks: StrategicTask[];
  execution_roadmap: ExecutionRoadmap;
  manpower_planning: ManpowerPlan;
  resource_requirements: ResourcePlan;
  cost_estimation: CostPlan;
  cost_planning: CostPlan;
  time_estimation: TimePlan;
  time_planning?: TimePlan;
  impact_analysis: ImpactAnalysis;
  metadata: AnalysisMetadata;
}

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
