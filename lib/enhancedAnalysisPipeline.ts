/**
 * PMCopilot - Enhanced Analysis Pipeline Runner
 * Orchestrates all AI stages to produce comprehensive product intelligence
 */

import { logger } from './logger';
import { callAI } from './aiEngine';
import {
  getEnhancedProblemDiscoveryPrompt,
  getEnhancedFeatureGenerationPrompt,
  getEnhancedPRDPrompt,
  getEnhancedTaskGenerationPrompt,
  getManpowerEstimationPrompt,
  getResourceCostEstimationPrompt,
} from './enhancedAIEngine';
import {
  EnhancedAnalysisResult,
  EnhancedProblem,
  EnhancedFeature,
  EnhancedPRD,
  ManpowerEstimation,
  ResourceEstimation,
  TimelineEstimation,
  CostBreakdown,
  GapAnalysis,
  ExecutionPlan,
  SystemDesign,
} from '@/types/enhanced-analysis';
import { PipelineContext } from '@/types/analysis';

// ============================================
// HELPER: Extract JSON from AI response
// ============================================

function extractJSON(content: string): string {
  // Try to find JSON object in the content
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // Try to find JSON array
  const arrayMatch = content.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return content;
}

function safeParseJSON<T>(content: string, fallback: T): T {
  try {
    const extracted = extractJSON(content);
    return JSON.parse(extracted) as T;
  } catch (error) {
    logger.warn('Failed to parse JSON, using fallback', { error: error instanceof Error ? error.message : 'Unknown' });
    return fallback;
  }
}

// ============================================
// STAGE 1: ENHANCED PROBLEM DISCOVERY
// ============================================

async function runProblemDiscoveryStage(
  feedback: string,
  context?: PipelineContext
): Promise<{
  problems: EnhancedProblem[];
  problem_themes: string[];
  systemic_issues: string[];
  market_context: string;
}> {
  logger.info('Starting Enhanced Problem Discovery Stage');

  const messages = getEnhancedProblemDiscoveryPrompt(feedback, context);
  const { content } = await callAI(messages, {
    temperature: 0.7,
    max_tokens: 8000,
  });

  const result = safeParseJSON<{
    problems: EnhancedProblem[];
    problem_themes: string[];
    systemic_issues: string[];
    market_context: string;
  }>(content, {
    problems: [],
    problem_themes: [],
    systemic_issues: [],
    market_context: '',
  });

  // Ensure IDs are set
  result.problems = result.problems.map((p, i) => ({
    ...p,
    id: p.id || `PROB-${String(i + 1).padStart(3, '0')}`,
  }));

  logger.info('Problem Discovery Stage Complete', {
    problemCount: result.problems.length,
  });

  return result;
}

// ============================================
// STAGE 2: ENHANCED FEATURE GENERATION
// ============================================

async function runFeatureGenerationStage(
  problems: EnhancedProblem[],
  context?: PipelineContext
): Promise<{
  features: EnhancedFeature[];
  feature_themes: string[];
  innovation_opportunities: string[];
}> {
  logger.info('Starting Enhanced Feature Generation Stage');

  const messages = getEnhancedFeatureGenerationPrompt(problems, context);
  const { content } = await callAI(messages, {
    temperature: 0.8,
    max_tokens: 8000,
  });

  const result = safeParseJSON<{
    features: EnhancedFeature[];
    feature_themes: string[];
    innovation_opportunities: string[];
  }>(content, {
    features: [],
    feature_themes: [],
    innovation_opportunities: [],
  });

  // Ensure IDs are set
  result.features = result.features.map((f, i) => ({
    ...f,
    id: f.id || `FEAT-${String(i + 1).padStart(3, '0')}`,
  }));

  logger.info('Feature Generation Stage Complete', {
    featureCount: result.features.length,
  });

  return result;
}

// ============================================
// STAGE 3: ENHANCED PRD GENERATION
// ============================================

async function runPRDGenerationStage(
  problems: EnhancedProblem[],
  features: EnhancedFeature[],
  context?: PipelineContext
): Promise<EnhancedPRD> {
  logger.info('Starting Enhanced PRD Generation Stage');

  const messages = getEnhancedPRDPrompt(problems, features, context);
  const { content } = await callAI(messages, {
    temperature: 0.7,
    max_tokens: 8000,
  });

  const result = safeParseJSON<{ prd: EnhancedPRD }>(content, {
    prd: {
      title: 'Product Requirements Document',
      vision: '',
      problem_statement: '',
      solution_overview: '',
      goals: [],
      non_goals: [],
      target_users: [],
      user_personas: [],
      user_stories: [],
      acceptance_criteria: [],
      success_metrics: [],
      market_analysis: {
        market_size: '',
        growth_rate: '',
        competitors: [],
        competitive_advantages: [],
      },
      technical_architecture: {
        high_level_design: '',
        tech_stack: [],
        scalability_considerations: [],
        security_requirements: [],
      },
      risks: [],
      dependencies: [],
    },
  });

  logger.info('PRD Generation Stage Complete');

  return result.prd;
}

// ============================================
// STAGE 4: ENHANCED TASK GENERATION
// ============================================

async function runTaskGenerationStage(
  features: EnhancedFeature[],
  prd: EnhancedPRD
): Promise<any[]> {
  logger.info('Starting Enhanced Task Generation Stage');

  const messages = getEnhancedTaskGenerationPrompt(features, prd);
  const { content } = await callAI(messages, {
    temperature: 0.6,
    max_tokens: 8000,
  });

  const result = safeParseJSON<{ tasks: any[] }>(content, { tasks: [] });

  // Ensure IDs are set
  result.tasks = result.tasks.map((t, i) => ({
    ...t,
    id: t.id || `TASK-${String(i + 1).padStart(3, '0')}`,
  }));

  logger.info('Task Generation Stage Complete', {
    taskCount: result.tasks.length,
  });

  return result.tasks;
}

// ============================================
// STAGE 5: MANPOWER ESTIMATION
// ============================================

async function runManpowerEstimationStage(
  features: EnhancedFeature[],
  tasks: any[],
  context?: PipelineContext
): Promise<ManpowerEstimation> {
  logger.info('Starting Manpower Estimation Stage');

  const messages = getManpowerEstimationPrompt(features, tasks, context);
  const { content } = await callAI(messages, {
    temperature: 0.5,
    max_tokens: 6000,
  });

  const result = safeParseJSON<{ manpower: ManpowerEstimation }>(content, {
    manpower: {
      total_people: 0,
      total_person_weeks: 0,
      by_phase: {
        phase_1_mvp: [],
        phase_2_scale: [],
        phase_3_advanced: [],
      },
      by_function: {
        engineering: [],
        product_management: [],
        design: [],
        qa_testing: [],
        devops_infrastructure: [],
      },
      organizational_structure: {
        team_composition: '',
        reporting_structure: '',
        collaboration_model: '',
      },
    },
  });

  logger.info('Manpower Estimation Stage Complete');

  return result.manpower;
}

// ============================================
// STAGE 6: RESOURCE & COST ESTIMATION
// ============================================

async function runResourceCostEstimationStage(
  manpower: ManpowerEstimation,
  systemDesign: SystemDesign
): Promise<{ resources: ResourceEstimation; cost_breakdown: CostBreakdown }> {
  logger.info('Starting Resource & Cost Estimation Stage');

  const messages = getResourceCostEstimationPrompt(manpower, systemDesign);
  const { content } = await callAI(messages, {
    temperature: 0.4,
    max_tokens: 6000,
  });

  const result = safeParseJSON<{
    resources: ResourceEstimation;
    cost_breakdown: CostBreakdown;
  }>(content, {
    resources: {
      technical: {
        infrastructure: { category: '', items: [] },
        software_licenses: { category: '', items: [] },
        third_party_services: { category: '', items: [] },
      },
      operational: {
        equipment: [],
        training_development: { description: '', estimated_cost_usd: 0 },
      },
      contingency: { percentage: 20, amount_usd: 0, rationale: '' },
    },
    cost_breakdown: {
      development: {
        engineering: 0,
        design: 0,
        product_management: 0,
        qa_testing: 0,
        total: 0,
      },
      infrastructure: {
        cloud_services: 0,
        software_licenses: 0,
        third_party_apis: 0,
        total: 0,
      },
      operational: {
        office_equipment: 0,
        training: 0,
        miscellaneous: 0,
        total: 0,
      },
      contingency: 0,
      grand_total: 0,
      breakdown_by_phase: {
        phase_1_mvp: 0,
        phase_2_scale: 0,
        phase_3_advanced: 0,
      },
      monthly_burn_rate: 0,
    },
  });

  logger.info('Resource & Cost Estimation Stage Complete');

  return result;
}

// ============================================
// HELPER: Generate System Design
// ============================================

function generateSystemDesign(
  features: EnhancedFeature[],
  prd: EnhancedPRD
): SystemDesign {
  // Extract tech stack from PRD
  const techStack = prd.technical_architecture?.tech_stack || [];

  return {
    architecture: prd.technical_architecture?.high_level_design || 'Microservices architecture with API gateway',
    components: [
      {
        name: 'Frontend Application',
        type: 'frontend',
        description: 'User-facing web/mobile application',
        technologies: techStack.filter(t => t.toLowerCase().includes('react') || t.toLowerCase().includes('next')),
        responsibilities: ['User interface', 'User experience', 'Client-side logic'],
        interfaces: ['REST API', 'WebSocket'],
      },
      {
        name: 'Backend API',
        type: 'backend',
        description: 'Core business logic and data processing',
        technologies: techStack.filter(t => t.toLowerCase().includes('node') || t.toLowerCase().includes('python')),
        responsibilities: ['Business logic', 'Data validation', 'API endpoints'],
        interfaces: ['REST API', 'GraphQL'],
      },
      {
        name: 'Database',
        type: 'database',
        description: 'Data persistence layer',
        technologies: techStack.filter(t => t.toLowerCase().includes('postgres') || t.toLowerCase().includes('mongo')),
        responsibilities: ['Data storage', 'Query optimization', 'Data integrity'],
        interfaces: ['SQL', 'Connection pooling'],
      },
    ],
    data_flow: 'User request → API Gateway → Backend Services → Database → Response',
    scalability: {
      horizontal_scaling: 'Stateless services with load balancing',
      vertical_scaling: 'Database read replicas and caching',
      load_balancing: 'Round-robin with health checks',
      caching_strategy: 'Redis for session and API response caching',
    },
    security: {
      authentication: 'JWT-based authentication with refresh tokens',
      authorization: 'Role-based access control (RBAC)',
      data_encryption: 'AES-256 at rest, TLS 1.3 in transit',
      api_security: 'Rate limiting, API keys, OAuth 2.0',
      compliance: ['GDPR', 'SOC 2', 'HIPAA (if health data)'],
    },
    monitoring_observability: {
      logging: 'Structured logging with ELK stack',
      metrics: 'Prometheus + Grafana dashboards',
      alerting: 'PagerDuty integration for critical alerts',
      tracing: 'Distributed tracing with Jaeger',
    },
  };
}

// ============================================
// HELPER: Generate Gap Analysis
// ============================================

function generateGapAnalysis(
  problems: EnhancedProblem[],
  features: EnhancedFeature[]
): GapAnalysis {
  const criticalProblems = problems.filter(p => p.severity_score >= 7);

  return {
    current_state: {
      what_exists: ['Basic functionality', 'Manual workarounds', 'Limited features'],
      current_capabilities: problems.flatMap(p => p.current_solutions?.split(',') || []).slice(0, 5),
      current_limitations: criticalProblems.map(p => p.title),
    },
    desired_state: {
      target_capabilities: features.filter(f => f.priority === 'High').map(f => f.name),
      success_criteria: [
        'All high-severity problems addressed',
        'Core features implemented',
        'Positive user feedback',
      ],
    },
    gaps: criticalProblems.map((problem, i) => ({
      gap_id: `GAP-${String(i + 1).padStart(3, '0')}`,
      category: 'technical' as const,
      description: problem.gaps || problem.title,
      severity: problem.severity_score >= 8 ? ('critical' as const) : ('high' as const),
      impact: problem.why_it_matters || 'High user impact',
      remediation: `Implement features: ${features.filter(f => f.linked_problems.includes(problem.id)).map(f => f.name).join(', ')}`,
      priority: i + 1,
    })),
    bridging_strategy: {
      quick_wins: features.filter(f => f.priority === 'High' && f.complexity === 'Simple').map(f => f.name),
      medium_term: features.filter(f => f.priority === 'High' && f.complexity === 'Medium').map(f => f.name),
      long_term: features.filter(f => f.priority === 'Medium' || f.complexity === 'Complex').map(f => f.name),
    },
  };
}

// ============================================
// HELPER: Generate Execution Plan
// ============================================

function generateExecutionPlan(
  features: EnhancedFeature[],
  tasks: any[],
  manpower: ManpowerEstimation
): ExecutionPlan {
  const highPriorityFeatures = features.filter(f => f.priority === 'High');
  const mediumPriorityFeatures = features.filter(f => f.priority === 'Medium');

  return {
    phase_1_mvp: {
      phase_name: 'Phase 1: MVP Development',
      duration_weeks: 8,
      objectives: [
        'Build core features addressing high-severity problems',
        'Establish technical foundation',
        'Validate problem-solution fit with beta users',
      ],
      key_deliverables: highPriorityFeatures.slice(0, 5).map(f => f.name),
      success_metrics: [
        'Core features functional',
        '80% of critical bugs resolved',
        'Beta user feedback score > 7/10',
      ],
      tasks: tasks.filter(t => t.priority === 'Critical' || t.priority === 'High').slice(0, 10),
      risks: [
        {
          risk: 'Technical complexity underestimated',
          probability: 'medium' as const,
          impact: 'high' as const,
          mitigation: 'Buffer time in schedule, technical spikes for complex features',
        },
      ],
      team_composition: manpower.by_phase.phase_1_mvp,
    },
    phase_2_scale: {
      phase_name: 'Phase 2: Scale & Optimize',
      duration_weeks: 6,
      objectives: [
        'Scale infrastructure for production traffic',
        'Optimize performance and user experience',
        'Add medium-priority features',
      ],
      key_deliverables: mediumPriorityFeatures.slice(0, 5).map(f => f.name),
      success_metrics: [
        '1000+ active users',
        'System uptime > 99.5%',
        'Page load time < 2s',
      ],
      tasks: tasks.filter(t => t.priority === 'Medium').slice(0, 8),
      risks: [
        {
          risk: 'Scalability issues under load',
          probability: 'medium' as const,
          impact: 'high' as const,
          mitigation: 'Load testing, auto-scaling configuration',
        },
      ],
      team_composition: manpower.by_phase.phase_2_scale,
    },
    phase_3_advanced: {
      phase_name: 'Phase 3: Advanced Features & Innovation',
      duration_weeks: 4,
      objectives: [
        'Implement innovative, differentiated features',
        'Establish competitive moat',
        'Prepare for market expansion',
      ],
      key_deliverables: features.filter(f => f.category === 'futuristic').map(f => f.name),
      success_metrics: [
        'Advanced features live',
        'Competitive differentiation established',
        'Ready for Series A fundraising',
      ],
      tasks: tasks.filter(t => t.linked_feature && features.find(f => f.id === t.linked_feature && f.category === 'futuristic')).slice(0, 6),
      risks: [
        {
          risk: 'Market timing for advanced features',
          probability: 'low' as const,
          impact: 'medium' as const,
          mitigation: 'Phased rollout, A/B testing',
        },
      ],
      team_composition: manpower.by_phase.phase_3_advanced,
    },
    overall_strategy: 'Agile development with 2-week sprints, continuous delivery, rapid iteration based on user feedback',
    success_criteria: [
      'All planned features delivered',
      'User satisfaction > 8/10',
      'System performs at scale',
      'Technical debt < 15%',
    ],
    key_assumptions: [
      'Team can be hired within 4 weeks',
      'Technical stack viable for requirements',
      'Market demand validated',
    ],
  };
}

// ============================================
// HELPER: Generate Timeline
// ============================================

function generateTimeline(executionPlan: ExecutionPlan): TimelineEstimation {
  const totalWeeks = executionPlan.phase_1_mvp.duration_weeks +
    executionPlan.phase_2_scale.duration_weeks +
    executionPlan.phase_3_advanced.duration_weeks;

  const launchDate = new Date();
  launchDate.setDate(launchDate.getDate() + totalWeeks * 7);

  return {
    total_duration_weeks: totalWeeks,
    phases: [
      {
        phase: 'Phase 1: MVP',
        duration_weeks: executionPlan.phase_1_mvp.duration_weeks,
        start_week: 0,
        end_week: executionPlan.phase_1_mvp.duration_weeks,
        milestones: [
          {
            name: 'Technical Foundation Complete',
            week: 2,
            deliverables: ['Database schema', 'API structure', 'Auth system'],
            dependencies: [],
            risk_level: 'medium' as const,
          },
          {
            name: 'Core Features Beta',
            week: 5,
            deliverables: ['Beta version deployed', 'Core features functional'],
            dependencies: ['Technical Foundation Complete'],
            risk_level: 'high' as const,
          },
          {
            name: 'MVP Launch',
            week: 8,
            deliverables: ['Public launch', 'All MVP features live'],
            dependencies: ['Core Features Beta'],
            risk_level: 'medium' as const,
          },
        ],
        critical_path: ['Technical Foundation', 'Core Features', 'MVP Launch'],
      },
      {
        phase: 'Phase 2: Scale',
        duration_weeks: executionPlan.phase_2_scale.duration_weeks,
        start_week: executionPlan.phase_1_mvp.duration_weeks,
        end_week: executionPlan.phase_1_mvp.duration_weeks + executionPlan.phase_2_scale.duration_weeks,
        milestones: [
          {
            name: 'Infrastructure Scaled',
            week: executionPlan.phase_1_mvp.duration_weeks + 3,
            deliverables: ['Auto-scaling configured', 'Load testing passed'],
            dependencies: ['MVP Launch'],
            risk_level: 'medium' as const,
          },
          {
            name: 'Scale Features Complete',
            week: executionPlan.phase_1_mvp.duration_weeks + 6,
            deliverables: ['Medium-priority features live', 'Performance optimized'],
            dependencies: ['Infrastructure Scaled'],
            risk_level: 'low' as const,
          },
        ],
        critical_path: ['Infrastructure Scaling', 'Performance Optimization'],
      },
      {
        phase: 'Phase 3: Advanced',
        duration_weeks: executionPlan.phase_3_advanced.duration_weeks,
        start_week: executionPlan.phase_1_mvp.duration_weeks + executionPlan.phase_2_scale.duration_weeks,
        end_week: totalWeeks,
        milestones: [
          {
            name: 'Advanced Features Launch',
            week: totalWeeks,
            deliverables: ['Innovative features live', 'Market differentiation'],
            dependencies: ['Scale Features Complete'],
            risk_level: 'low' as const,
          },
        ],
        critical_path: ['Advanced Features Development'],
      },
    ],
    parallel_tracks: ['Frontend Development', 'Backend Development', 'Infrastructure Setup'],
    dependencies_map: {
      'Core Features': ['Technical Foundation'],
      'MVP Launch': ['Core Features', 'Testing Complete'],
      'Infrastructure Scaled': ['MVP Launch'],
      'Advanced Features': ['Scale Features Complete'],
    },
    buffer_weeks: Math.ceil(totalWeeks * 0.15),
    estimated_launch_date: launchDate.toISOString().split('T')[0],
  };
}

// ============================================
// MAIN: RUN ENHANCED ANALYSIS PIPELINE
// ============================================

export async function runEnhancedAnalysisPipeline(
  rawFeedback: string,
  context?: PipelineContext
): Promise<{
  success: boolean;
  result?: EnhancedAnalysisResult;
  error?: string;
  provider?: string;
}> {
  const pipelineStart = Date.now();
  const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  logger.info('🚀 Starting ENHANCED Analysis Pipeline', {
    analysisId,
    feedbackLength: rawFeedback.length,
    hasContext: !!context,
  });

  try {
    // ========== STAGE 1: PROBLEM DISCOVERY ==========
    const problemStage = await runProblemDiscoveryStage(rawFeedback, context);

    if (problemStage.problems.length === 0) {
      throw new Error('No problems identified in feedback');
    }

    // ========== STAGE 2: FEATURE GENERATION ==========
    const featureStage = await runFeatureGenerationStage(problemStage.problems, context);

    if (featureStage.features.length === 0) {
      throw new Error('No features generated');
    }

    // ========== STAGE 3: PRD GENERATION ==========
    const prd = await runPRDGenerationStage(problemStage.problems, featureStage.features, context);

    // ========== STAGE 4: TASK GENERATION ==========
    const tasks = await runTaskGenerationStage(featureStage.features, prd);

    // ========== STAGE 5: SYSTEM DESIGN (Generated) ==========
    const systemDesign = generateSystemDesign(featureStage.features, prd);

    // ========== STAGE 6: MANPOWER ESTIMATION ==========
    const manpower = await runManpowerEstimationStage(featureStage.features, tasks, context);

    // ========== STAGE 7: RESOURCE & COST ESTIMATION ==========
    const { resources, cost_breakdown } = await runResourceCostEstimationStage(manpower, systemDesign);

    // ========== STAGE 8: GAP ANALYSIS (Generated) ==========
    const gap_analysis = generateGapAnalysis(problemStage.problems, featureStage.features);

    // ========== STAGE 9: EXECUTION PLAN (Generated) ==========
    const execution_plan = generateExecutionPlan(featureStage.features, tasks, manpower);

    // ========== STAGE 10: TIMELINE (Generated) ==========
    const timeline = generateTimeline(execution_plan);

    // ========== BUILD ENHANCED RESULT ==========
    const processingTime = Date.now() - pipelineStart;

    const topProblem = problemStage.problems[0];
    const topFeature = featureStage.features[0];

    // Calculate impact scores before building result
    const userImpactScore = Math.min(10, Math.round(problemStage.problems.reduce((sum, p) => sum + p.severity_score, 0) / problemStage.problems.length));
    const businessImpactScore = Math.min(10, featureStage.features.filter(f => f.priority === 'High').length);

    const result: EnhancedAnalysisResult = {
      // Metadata
      analysis_id: analysisId,
      created_at: new Date().toISOString(),
      processing_time_ms: processingTime,
      model_used: 'Groq Llama 3.1 70B (Enhanced)',
      total_feedback_items: 1,

      // Enhanced Executive Summary
      executive_summary_detailed: {
        expanded_problem_space: problemStage.market_context || 'Market analysis pending',
        key_insight: `Primary challenge: ${topProblem.title}. Opportunity: ${topFeature.name}`,
        opportunity_score: Math.min(10, Math.round((topProblem.severity_score + featureStage.features.length) / 2)),
        innovation_angle: featureStage.innovation_opportunities.join('; ') || 'Multiple innovation opportunities identified',
        market_opportunity: `${problemStage.problems.length} problems identified with ${featureStage.features.length} solution opportunities`,
      },

      // Core Enhanced Results
      problems: problemStage.problems,
      features: featureStage.features,
      prd: prd,
      tasks: tasks,

      // New Comprehensive Sections
      gap_analysis,
      execution_plan,
      system_design: systemDesign,
      manpower,
      resources,
      timeline,
      cost_breakdown,

      // Enhanced Impact
      impact: {
        user_impact: `Addresses ${problemStage.problems.length} critical user pain points`,
        user_impact_score: Math.min(10, Math.round(problemStage.problems.reduce((sum, p) => sum + p.severity_score, 0) / problemStage.problems.length)),
        business_impact: `${featureStage.features.filter(f => f.priority === 'High').length} high-priority features with significant business value`,
        business_impact_score: Math.min(10, featureStage.features.filter(f => f.priority === 'High').length),
        confidence_score: 0.85,
        time_to_value: `${timeline.phases[0].duration_weeks} weeks for MVP`,
        affected_user_percentage: 75,
        revenue_impact: 'Increase' as const,
        retention_impact: 'Positive' as const,
      },

      impact_detailed: {
        user_impact: `Addresses ${problemStage.problems.length} critical user pain points`,
        user_impact_score: Math.min(10, Math.round(problemStage.problems.reduce((sum, p) => sum + p.severity_score, 0) / problemStage.problems.length)),
        business_impact: `${featureStage.features.filter(f => f.priority === 'High').length} high-priority features with significant business value`,
        business_impact_score: Math.min(10, featureStage.features.filter(f => f.priority === 'High').length),
        confidence_score: 0.85,
        time_to_value: `${timeline.phases[0].duration_weeks} weeks for MVP`,
        affected_user_percentage: 75,
        revenue_impact: 'Increase' as const,
        retention_impact: 'Positive' as const,
        market_size_estimate: 'To be determined based on TAM/SAM analysis',
        roi_projection: {
          year_1: `Investment phase: -$${Math.round(cost_breakdown.grand_total / 1.5)}`,
          year_2: 'Break-even + early growth',
          year_3: `Estimated profit: $${Math.round(cost_breakdown.grand_total * 1.5)}`,
        },
        break_even_analysis: `Expected break-even at month ${Math.ceil(timeline.total_duration_weeks / 4) + 6}`,
      },

      // Explainability
      explainability: {
        methodology: 'Enhanced multi-stage AI pipeline: Problem Discovery → Feature Generation → PRD → Tasks → Manpower → Resources → Cost → Timeline',
        data_quality_score: 0.9,
        confidence_factors: [
          `Analyzed ${problemStage.problems.length} distinct problems`,
          `Generated ${featureStage.features.length} comprehensive feature suggestions`,
          `Created ${tasks.length} detailed development tasks`,
          `Estimated ${manpower.total_people} team members over ${timeline.total_duration_weeks} weeks`,
          `Total project cost: $${cost_breakdown.grand_total.toLocaleString()}`,
        ],
        limitations: [
          'Analysis based on provided feedback only',
          'Cost estimates are projections based on industry averages',
          'Timeline assumes team availability and no major blockers',
          'Market size estimates require additional research',
        ],
        recommendations: [
          'Validate problem-solution fit with user interviews',
          'Start with Phase 1 MVP to test market response',
          'Hire core team (2-3 engineers + PM) within first 4 weeks',
          'Set up infrastructure and CI/CD in week 1',
          'Plan for 20% contingency buffer in budget and timeline',
        ],
      },

      // Summary
      executive_summary: `Analysis identified ${problemStage.problems.length} distinct problems. Most critical: "${topProblem.title}" (severity: ${topProblem.severity_score}/10). Generated ${featureStage.features.length} features, with "${topFeature.name}" as highest priority. Estimated ${manpower.total_people} team members, ${timeline.total_duration_weeks} weeks, $${cost_breakdown.grand_total.toLocaleString()} total cost. Expected impact: ${userImpactScore}/10 user, ${businessImpactScore}/10 business. Confidence: 85%.`,

      key_findings: [
        ...problemStage.problems.slice(0, 3).map(p => `Problem: "${p.title}" - Severity: ${p.severity_score}/10`),
        `${featureStage.features.filter(f => f.priority === 'High').length} high-priority features identified`,
        `Estimated team: ${manpower.total_people} people over ${timeline.total_duration_weeks} weeks`,
        `Total investment: $${cost_breakdown.grand_total.toLocaleString()} (burn rate: $${cost_breakdown.monthly_burn_rate.toLocaleString()}/month)`,
      ],

      immediate_actions: [
        'Review and validate top 3 problems with target users',
        `Prioritize quick wins: ${gap_analysis.bridging_strategy.quick_wins.slice(0, 2).join(', ')}`,
        `Begin hiring: ${manpower.by_phase.phase_1_mvp.slice(0, 2).map(r => r.role).join(', ')}`,
        'Set up development infrastructure (repos, CI/CD, cloud accounts)',
        'Create detailed project plan for Phase 1 MVP',
      ],
    };

    logger.info('✅ ENHANCED Analysis Pipeline Complete', {
      analysisId,
      processingTime,
      problemsFound: problemStage.problems.length,
      featuresGenerated: featureStage.features.length,
      tasksCreated: tasks.length,
      estimatedCost: cost_breakdown.grand_total,
      estimatedWeeks: timeline.total_duration_weeks,
    });

    return {
      success: true,
      result,
      provider: 'groq-enhanced',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('❌ ENHANCED Analysis Pipeline Failed', {
      analysisId,
      error: errorMessage,
      processingTime: Date.now() - pipelineStart,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export default runEnhancedAnalysisPipeline;
