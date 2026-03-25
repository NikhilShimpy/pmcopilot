/**
 * PMCopilot - Comprehensive Product Strategy Engine v3.0
 *
 * PRODUCTION-READY AI PIPELINE
 * PRIMARY: Google Gemini API
 * FALLBACK: Groq (ONLY if Gemini fails)
 *
 * OUTPUT REQUIREMENTS (STRICT):
 * - MINIMUM 10 Problems (aim for 15)
 * - MINIMUM 15 Features (aim for 25)
 * - MINIMUM 25 Tasks (aim for 35)
 */

import { callAI } from './aiEngine';
import { logger } from './logger';
import { generateFallbackAnalysis } from './fallbackAnalysis';
import { AI_CONFIG } from '@/utils/constants';
import {
  ComprehensiveStrategyResult,
  StrategicProblem,
  StrategicFeature,
  StrategicTask,
  ExecutiveDashboard,
  GapsOpportunities,
  ComprehensivePRD,
  StrategicSystemDesign,
  ExecutionRoadmap,
  ManpowerPlan,
  ResourcePlan,
  CostPlan,
  TimePlan,
  ImpactAnalysis,
} from '@/types/comprehensive-strategy';
import { PipelineContext } from '@/types/analysis';

// ============================================
// EXTRACT JSON HELPER
// ============================================

function extractJSON(content: string): string {
  let cleaned = content.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try to find JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }
  return cleaned;
}

function safeParseJSON<T>(content: string, fallback: T): T {
  try {
    const cleanedContent = extractJSON(content.trim());
    return JSON.parse(cleanedContent);
  } catch (error) {
    logger.warn('Failed to parse JSON', { error, content: content.substring(0, 200) });
    return fallback;
  }
}

// ============================================
// COMPREHENSIVE STRATEGY PROMPT
// ============================================

export function getComprehensiveStrategyPrompt(
  feedback: string,
  context?: PipelineContext
): any[] {
  const systemPrompt = `You are an ELITE AI system composed of:
- Senior Product Manager (ex-Google, Meta, Amazon, Apple)
- Successful YC Founder (multiple exits)
- Technical Architect (15+ years system design)
- Business Analyst (McKinsey/BCG level)
- Financial Planner (VC/startup budgeting expert)
- Engineering Manager (built 100+ person teams)

You are NOT an assistant. You are a COMPLETE PRODUCT THINKING ENGINE.

----

## YOUR OBJECTIVE

Given ANY input (even a vague idea), generate a FULL PRODUCT STRATEGY SYSTEM.

This must be:
- EXTREMELY detailed (equivalent to 50+ page document)
- STRUCTURED into exactly 13 sections
- ACTIONABLE with specific steps
- NAVIGABLE with clear organization

----

## THINKING MODE (CRITICAL)

You MUST:
1. Expand vague input into multiple interpretations
2. Identify hidden problems users haven't considered
3. Think in layers: user pain → tech feasibility → business viability
4. Generate MULTIPLE approaches for each section
5. Compare and refine to best recommendations
6. Think like: CTO + PM + Investor simultaneously

⚠️ CRITICAL: MINIMUM OUTPUT REQUIREMENTS (MANDATORY - WILL BE REJECTED IF NOT MET):
- MINIMUM 10 problems (aim for 15)
- MINIMUM 15 features (aim for 25)
- MINIMUM 25 development tasks (aim for 35)

If you generate fewer than these minimums, the analysis will be rejected.

----

## OUTPUT STRUCTURE (EXTREMELY IMPORTANT)

Return a SINGLE JSON object with ALL 13 sections. Each section MUST be rich and detailed.

${context ? `
## CONTEXT PROVIDED:
- Project Name: ${context.project_name || 'Not specified'}
- Industry: ${context.industry || 'Technology'}
- Product Type: ${context.product_type || 'Software'}
- Target Users: ${context.user_persona || 'General users'}
- Additional Context: ${context.project_context || 'None'}
` : ''}

----

## REQUIRED OUTPUT FORMAT

{
  "executive_dashboard": {
    "idea_expansion": "DETAILED expansion of the input idea into a full product vision (300-500 words). What is this really about? What problem space does it address? What are the different interpretations?",
    "key_insight": "The single most important insight that makes this product valuable (100-150 words)",
    "innovation_score": <0-10>,
    "market_opportunity": "Market size, growth potential, timing (200-300 words)",
    "complexity_level": "Low" | "Medium" | "High" | "Very High",
    "recommended_strategy": "High-level strategic recommendation (150-200 words)"
  },

  "problem_analysis": [
    // ⚠️ CRITICAL: MINIMUM 10 problems, aim for 15
    {
      "id": "PROB-001",
      "title": "Concise problem title",
      "deep_description": "VERY DETAILED description (200-400 words). What exactly is the problem? How does it manifest? What pain does it cause?",
      "root_cause": "Why does this problem exist? What's the underlying systemic issue? (100-150 words)",
      "affected_users": "Who specifically suffers from this? Demographics, user types, use cases (100 words)",
      "current_solutions": "What do people do today? What alternatives exist?",
      "gaps_in_market": "What's missing in current solutions? Why haven't others solved this?",
      "why_existing_fails": "Specific reasons why current solutions are inadequate",
      "severity_score": <0-10>,
      "frequency_score": <0-10>,
      "business_impact": "Revenue, retention, growth impact (concrete if possible)",
      "technical_difficulty": "Low" | "Medium" | "High",
      "evidence_examples": ["Specific evidence or quotes that support this problem"]
    }
  ],

  "feature_system": [
    // ⚠️ CRITICAL: MINIMUM 15 features, aim for 25 - THIS IS MANDATORY
    {
      "id": "FEAT-001",
      "name": "Feature name (clear, compelling)",
      "category": "core" | "advanced" | "futuristic",
      "detailed_description": "Comprehensive feature description (200-300 words). What it does, how it works, user experience",
      "why_needed": "Why this feature is essential (link to problems)",
      "linked_problems": ["PROB-001", "PROB-003"],
      "user_value": "Specific value delivered to users",
      "business_value": "Revenue, retention, competitive advantage",
      "implementation_strategy": [
        "Step 1: Specific implementation step",
        "Step 2: Next step",
        "Step 3: Continue...",
        "... (5-10 steps)"
      ],
      "technical_requirements": ["Tech requirement 1", "Tech requirement 2", "..."],
      "dependencies": ["Other features or infrastructure needed"],
      "complexity": "Low" | "Medium" | "High",
      "estimated_dev_time": "Realistic time (e.g., '2-3 weeks')"
    }
  ],

  "gaps_opportunities": {
    "market_lacks": ["Specific things the market doesn't have (5-10 items)"],
    "why_competitors_fail": ["Reasons competitors haven't solved this (5-10 reasons)"],
    "innovation_opportunities": ["Unique innovation angles (5-10 opportunities)"],
    "unfair_advantages": ["What unfair advantages this product can build (3-5 items)"]
  },

  "prd": {
    "vision": "Compelling product vision (100-150 words)",
    "mission": "Clear mission statement (50-100 words)",
    "problem_statement": "Detailed problem statement (200-300 words)",
    "target_users": ["Primary user segment 1", "Secondary user segment 2", "..."],
    "personas": [
      // MINIMUM 3 personas
      {
        "name": "Persona Name (e.g., 'Alex the Healthcare Professional')",
        "description": "Detailed persona background (100-150 words)",
        "goals": ["Goal 1", "Goal 2", "Goal 3"],
        "pain_points": ["Pain 1", "Pain 2", "Pain 3"],
        "user_journey": "How they currently solve this problem (150-200 words)"
      }
    ],
    "user_journey": "Overall user journey from discovery to power user (300-400 words)",
    "goals_short_term": ["3-6 month goals (5-8 goals)"],
    "goals_long_term": ["1-3 year goals (5-8 goals)"],
    "non_goals": ["What we explicitly won't do (5-8 items)"],
    "feature_requirements": ["Detailed feature requirement 1", "... (10-15 items)"],
    "acceptance_criteria": [
      {
        "id": "AC-001",
        "requirement": "Specific requirement",
        "criteria": "Measurable success criteria",
        "testable": true,
        "priority": "Must" | "Should" | "Could"
      }
    ],
    "success_metrics": ["measurable success criteria"],
    "risks": ["potential risks and mitigations"],
    "dependencies": ["technical or business dependencies"]
  },

  "system_design": {
    "architecture_overview": "High-level system architecture (250-300 words)",
    "core_components": [
      {
        "name": "Component Name",
        "description": "What this component does",
        "technologies": ["Tech 1", "Tech 2"],
        "dependencies": ["Other components it needs"],
        "scalability_considerations": "How it scales"
      }
    ],
    "data_models": "Key data structures and relationships (150-200 words)",
    "api_design": "RESTful API structure and key endpoints (150-200 words)",
    "security_considerations": ["Security measure 1", "Security measure 2", "..."],
    "scalability_plan": "How the system scales to millions of users (200-250 words)",
    "technology_stack": {
      "frontend": ["Technology choices with reasoning"],
      "backend": ["Technology choices with reasoning"],
      "database": ["Technology choices with reasoning"],
      "infrastructure": ["Cloud services and tools"],
      "third_party": ["External APIs and services"]
    }
  },

  "development_tasks": [
    // ⚠️ CRITICAL: MINIMUM 25 tasks, aim for 35 - MANDATORY
    {
      "id": "TASK-001",
      "title": "Clear task title",
      "detailed_steps": [
        "Step 1: Specific action",
        "Step 2: Next action",
        "... (5-10 steps)"
      ],
      "type": "frontend" | "backend" | "ai" | "devops" | "design" | "testing" | "database",
      "tech_stack": ["Technology 1", "Technology 2"],
      "dependencies": ["TASK-002", "..."],
      "priority": "Critical" | "High" | "Medium" | "Low",
      "estimated_time": "X days/weeks",
      "expected_output": "What will be delivered"
    }
  ],

  "execution_roadmap": {
    "phase_1_mvp": {
      "duration": "X weeks",
      "key_features": ["Feature 1", "Feature 2", "..."],
      "success_criteria": ["Criterion 1", "Criterion 2"],
      "resources_needed": ["Resource type and count"]
    },
    "phase_2_growth": {
      "duration": "X weeks",
      "key_features": ["Feature 1", "Feature 2", "..."],
      "success_criteria": ["Criterion 1", "Criterion 2"],
      "resources_needed": ["Resource type and count"]
    },
    "phase_3_scale": {
      "duration": "X weeks",
      "key_features": ["Feature 1", "Feature 2", "..."],
      "success_criteria": ["Criterion 1", "Criterion 2"],
      "resources_needed": ["Resource type and count"]
    },
    "milestones": [
      {
        "name": "Milestone name",
        "date": "Target date",
        "deliverables": ["What will be completed"],
        "success_metrics": ["How success is measured"]
      }
    ]
  },

  "manpower_planning": {
    "team_composition": [
      {
        "role": "Role name (e.g., 'Senior React Developer')",
        "count": 2,
        "responsibilities": ["Responsibility 1", "Responsibility 2"],
        "skills_required": ["Skill 1", "Skill 2"],
        "seniority": "Junior" | "Mid" | "Senior" | "Lead",
        "monthly_cost_inr": 75000
      }
    ],
    "hiring_plan": "When and how to scale the team (150-200 words)",
    "total_monthly_cost_inr": 450000,
    "total_team_size": 6
  },

  "resource_planning": {
    "infrastructure_costs": [
      {
        "service": "Service name (e.g., 'AWS EC2')",
        "purpose": "What it's used for",
        "monthly_cost_inr": 15000,
        "scaling_factor": "How cost scales with usage"
      }
    ],
    "third_party_services": [
      {
        "service": "Service name",
        "purpose": "What it's used for",
        "monthly_cost_inr": 5000
      }
    ],
    "total_monthly_infrastructure_cost_inr": 50000
  },

  "cost_planning": {
    "development_phase_cost_inr": {
      "mvp": 2700000,
      "growth": 4500000,
      "scale": 6750000
    },
    "operational_costs_monthly_inr": {
      "team": 450000,
      "infrastructure": 50000,
      "marketing": 200000,
      "others": 100000
    },
    "total_first_year_cost_inr": 15000000,
    "break_even_analysis": "When the product becomes profitable (100-150 words)",
    "funding_requirements": "How much funding is needed and when (100-150 words)"
  },

  "time_planning": {
    "mvp_timeline": {
      "total_weeks": 12,
      "key_milestones": [
        {
          "week": 2,
          "milestone": "Architecture and setup complete"
        },
        {
          "week": 6,
          "milestone": "Core features implemented"
        },
        {
          "week": 10,
          "milestone": "Beta testing begins"
        },
        {
          "week": 12,
          "milestone": "MVP launch"
        }
      ]
    },
    "growth_phase_timeline": {
      "total_weeks": 24,
      "key_features_by_quarter": {
        "q1": ["Feature set 1"],
        "q2": ["Feature set 2"]
      }
    },
    "critical_path": ["Critical dependency 1", "Critical dependency 2"],
    "risk_buffers": "Built-in time buffers for unexpected issues (50-100 words)"
  },

  "impact_analysis": {
    "user_impact": "Qualitative description of user impact",
    "user_impact_score": <1-10>,
    "business_impact": "Qualitative description of business impact",
    "business_impact_score": <1-10>,
    "confidence_score": <0-1>,
    "time_to_value": "Estimated time to see impact",
    "affected_user_percentage": <0-100>,
    "revenue_impact": "Increase" | "Decrease" | "Neutral",
    "retention_impact": "Positive" | "Negative" | "Neutral",
    "market_impact": "How this affects the broader market (100-150 words)",
    "competitive_advantage": "Sustainable competitive advantages created (100-150 words)",
    "long_term_vision": "5-year vision and potential (150-200 words)"
  }
}

---

**CRITICAL OUTPUT REQUIREMENTS:**

1. Output ONLY valid JSON (no markdown, no code blocks, no explanation)
2. Be EXTREMELY detailed - this is NOT a summary
3. Every text field should be comprehensive (100-400 words where indicated)
4. Use specific numbers, metrics, and timelines
5. Think like you're writing a $500K McKinsey report

---

START NOW. Output ONLY the JSON object.`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Analyze this input and generate a COMPLETE PRODUCT STRATEGY:

${feedback}

⚠️ CRITICAL REQUIREMENTS - MUST BE MET OR ANALYSIS WILL BE REJECTED:
- MINIMUM 10 problems (aim for 15)
- MINIMUM 15 features (aim for 25)
- MINIMUM 25 development tasks (aim for 35)
- Generate ALL 13 sections with FULL detail
- Be comprehensive, not concise
- Output ONLY valid JSON

IF YOU GENERATE FEWER THAN THE MINIMUMS ABOVE, THE ANALYSIS WILL FAIL.`,
    },
  ];
}

// ============================================
// RUN COMPREHENSIVE STRATEGY ANALYSIS
// ============================================

export async function runComprehensiveStrategyAnalysis(
  rawFeedback: string,
  context?: PipelineContext
): Promise<{
  success: boolean;
  result?: ComprehensiveStrategyResult;
  error?: string;
  provider?: string;
}> {
  const analysisStart = Date.now();
  const analysisId = `strategy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  logger.info('Starting Comprehensive Strategy Analysis', {
    analysisId,
    feedbackLength: rawFeedback.length,
    hasContext: !!context,
  });

  // Set timeout to ensure reasonable response time
  const ANALYSIS_TIMEOUT = 55000; // 55 seconds

  try {
    // Race between AI analysis and timeout
    const analysisResult = await Promise.race([
      // AI Analysis
      (async () => {
        const messages = getComprehensiveStrategyPrompt(rawFeedback, context);

        const { content, provider } = await callAI(messages, {
          temperature: 0.7,
          max_tokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
          timeout: ANALYSIS_TIMEOUT - 5000, // Leave buffer
        });

        const rawResult = safeParseJSON<any>(content, null);

        if (!rawResult) {
          throw new Error('Failed to parse AI response as JSON');
        }

        return { rawResult, provider };
      })(),

      // Timeout fallback
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Analysis timeout - using fallback')), ANALYSIS_TIMEOUT);
      })
    ]);

    // Validate minimum requirements
    const problems = analysisResult.rawResult.problem_analysis || [];
    const features = analysisResult.rawResult.feature_system || [];
    const tasks = analysisResult.rawResult.development_tasks || [];

    // Log output metrics
    logger.info('AI analysis output metrics', {
      problems: problems.length,
      features: features.length,
      tasks: tasks.length,
      provider: analysisResult.provider,
    });

    // Warn but don't fail if slightly under minimums
    if (problems.length < 10) {
      logger.warn(`Only ${problems.length} problems generated (minimum 10 recommended)`);
    }
    if (features.length < 15) {
      logger.warn(`Only ${features.length} features generated (minimum 15 recommended)`);
    }
    if (tasks.length < 25) {
      logger.warn(`Only ${tasks.length} tasks generated (minimum 25 recommended)`);
    }

    // If output is too minimal, use fallback
    if (problems.length < 5 || features.length < 8 || tasks.length < 10) {
      logger.warn('AI output too minimal, using fallback analysis');
      throw new Error('Insufficient AI output quality');
    }

    // Ensure IDs are set
    analysisResult.rawResult.problem_analysis = problems.map((p: any, i: number) => ({
      ...p,
      id: p.id || `PROB-${String(i + 1).padStart(3, '0')}`,
    }));

    analysisResult.rawResult.feature_system = features.map((f: any, i: number) => ({
      ...f,
      id: f.id || `FEAT-${String(i + 1).padStart(3, '0')}`,
    }));

    analysisResult.rawResult.development_tasks = tasks.map((t: any, i: number) => ({
      ...t,
      id: t.id || `TASK-${String(i + 1).padStart(3, '0')}`,
    }));

    // Add metadata
    const processingTime = Date.now() - analysisStart;
    const result: ComprehensiveStrategyResult = {
      ...analysisResult.rawResult,
      metadata: {
        analysis_id: analysisId,
        created_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        model_used: `${analysisResult.provider || 'AI'} (Comprehensive Strategy)`,
        input_length: rawFeedback.length,
      },
    };

    logger.info('Comprehensive Strategy Analysis Complete', {
      analysisId,
      processingTime,
      provider: analysisResult.provider,
      problems: problems.length,
      features: features.length,
      tasks: tasks.length,
    });

    return {
      success: true,
      result,
      provider: analysisResult.provider
    };

  } catch (error) {
    const processingTime = Date.now() - analysisStart;

    logger.warn('AI analysis failed, using fallback system', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    });

    // Generate fallback analysis
    const fallbackResult = generateFallbackAnalysis(rawFeedback);

    // Update metadata
    fallbackResult.metadata = {
      ...fallbackResult.metadata,
      analysis_id: analysisId,
      processing_time_ms: processingTime,
    };

    logger.info('Fallback analysis generated successfully', {
      analysisId,
      problems: fallbackResult.problem_analysis?.length || 0,
      features: fallbackResult.feature_system?.length || 0,
      tasks: fallbackResult.development_tasks?.length || 0,
      processingTime
    });

    return {
      success: true,
      result: fallbackResult,
      provider: 'fallback',
    };
  }
}
