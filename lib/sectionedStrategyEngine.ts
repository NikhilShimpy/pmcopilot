import { AI_CONFIG } from '@/utils/constants';
import { generateGeminiContent, GeminiMessage } from './geminiSectionClient';
import { logger } from './logger';
import { config } from './config';
import {
  AnalysisMetadata,
  CostIntakeSelections,
  ComprehensiveStrategyResult,
  StrategySectionId,
} from '@/types/comprehensive-strategy';
import { PipelineContext } from '@/types/analysis';

export type PartialStrategyResult = Partial<ComprehensiveStrategyResult> & {
  metadata: AnalysisMetadata;
  time_planning?: any;
  overview_summary?: {
    product_name?: string;
    one_line_summary?: string;
    core_value_props?: string[];
    critical_unknowns?: string[];
  };
  feature_strategy?: {
    core_features_reasoning?: string[];
    advanced_features_reasoning?: string[];
    optional_future_features_reasoning?: string[];
    why_these_features_matter?: string;
  };
};

type OutputDepth = 'short' | 'medium' | 'long' | 'extra-long';
export type DeferredStrategySection = Exclude<
  StrategySectionId,
  'overview' | 'executive-dashboard'
>;

type GenerationContext = PipelineContext & {
  depth?: string;
  timeout?: number;
  analysisId?: string;
  inputHash?: string;
};

export const OVERVIEW_SECTION_IDS: StrategySectionId[] = [
  'overview',
  'executive-dashboard',
];

export const DEFERRED_STRATEGY_SECTIONS: DeferredStrategySection[] = [
  'problem-analysis',
  'feature-system',
  'gaps-opportunities',
  'prd',
  'system-design',
  'development-tasks',
  'execution-roadmap',
  'manpower-planning',
  'resources',
  'cost-estimation',
  'timeline',
  'impact-analysis',
];

const SECTION_MAX_TOKENS: Record<OutputDepth, Record<string, number>> = {
  short: {
    overview: 700,
    'problem-analysis': 1250,
    'feature-system': 1400,
    'gaps-opportunities': 850,
    prd: 2100,
    'system-design': 900,
    'development-tasks': 1500,
    'execution-roadmap': 900,
    'manpower-planning': 1000,
    resources: 850,
    'cost-estimation': 1200,
    timeline: 1000,
    'impact-analysis': 850,
  },
  medium: {
    overview: 900,
    'problem-analysis': 1700,
    'feature-system': 2200,
    'gaps-opportunities': 1100,
    prd: 3200,
    'system-design': 1200,
    'development-tasks': 2200,
    'execution-roadmap': 1200,
    'manpower-planning': 1300,
    resources: 1050,
    'cost-estimation': 1500,
    timeline: 1400,
    'impact-analysis': 1050,
  },
  long: {
    overview: 1100,
    'problem-analysis': 2200,
    'feature-system': 3000,
    'gaps-opportunities': 1300,
    prd: 3800,
    'system-design': 1500,
    'development-tasks': 3000,
    'execution-roadmap': 1450,
    'manpower-planning': 1500,
    resources: 1250,
    'cost-estimation': 1900,
    timeline: 1700,
    'impact-analysis': 1250,
  },
  'extra-long': {
    overview: 1300,
    'problem-analysis': 2600,
    'feature-system': 3600,
    'gaps-opportunities': 1600,
    prd: 4000,
    'system-design': 1800,
    'development-tasks': 3600,
    'execution-roadmap': 1750,
    'manpower-planning': 1700,
    resources: 1450,
    'cost-estimation': 2300,
    timeline: 2000,
    'impact-analysis': 1450,
  },
};

const SECTION_INPUT_CHAR_LIMIT: Record<string, number> = {
  overview: 4200,
  'problem-analysis': 4200,
  'feature-system': 4200,
  'gaps-opportunities': 3600,
  prd: 4200,
  'system-design': 3400,
  'development-tasks': 4200,
  'execution-roadmap': 3200,
  'manpower-planning': 3000,
  resources: 3000,
  'cost-estimation': 3200,
  timeline: 3000,
  'impact-analysis': 3200,
};

function normalizeInput(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function trimText(value: string | undefined, maxChars: number): string {
  const cleaned = (value || '').trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars)}...` : cleaned;
}

function trimArray<T>(values: T[] | undefined, maxItems: number): T[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values.slice(0, maxItems);
}

function extractJSON(content: string): string {
  let cleaned = content.trim();

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] || cleaned.trim();
}

function repairTruncatedJSON(json: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = 0; index < json.length; index++) {
    const char = json[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (
      (char === '}' || char === ']') &&
      stack.length > 0 &&
      stack[stack.length - 1] === char
    ) {
      stack.pop();
    }
  }

  let repaired = json.replace(/,\s*$/, '');

  if (inString) {
    repaired += '"';
  }

  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

function safeParseJSON<T>(content: string): T {
  const cleaned = extractJSON(content);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return JSON.parse(repairTruncatedJSON(cleaned)) as T;
  }
}

function uniqSections(sections: Array<StrategySectionId | undefined>): StrategySectionId[] {
  return Array.from(new Set(sections.filter(Boolean))) as StrategySectionId[];
}

function getDepth(context?: GenerationContext): OutputDepth {
  if (
    context?.depth === 'short' ||
    context?.depth === 'medium' ||
    context?.depth === 'long' ||
    context?.depth === 'extra-long'
  ) {
    return context.depth;
  }
  return 'medium';
}

function getSectionTokenBudget(section: StrategySectionId, context?: GenerationContext): number {
  const depth = getDepth(context);
  return SECTION_MAX_TOKENS[depth][section] || 1200;
}

function getInputCharLimit(section: StrategySectionId): number {
  return SECTION_INPUT_CHAR_LIMIT[section] || 3200;
}

function createBaseMetadata(
  rawFeedback: string,
  context?: GenerationContext,
  analysisId?: string
): AnalysisMetadata {
  return {
    analysis_id:
      analysisId || `strategy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    created_at: new Date().toISOString(),
    processing_time_ms: 0,
    model_used: `${config.gemini.model} (Gemini free-tier sectioned)`,
    input_length: rawFeedback.length,
    provider: 'gemini',
    generated_sections: [],
    section_providers: {},
    source_input: rawFeedback,
    project_name: context?.project_name,
    project_context: context?.project_context,
    detail_level: context?.depth,
    input_hash: context?.inputHash,
    stale_sections: [],
    section_input_hashes: {},
  };
}

function createEmptyResult(
  rawFeedback: string,
  context?: GenerationContext,
  analysisId?: string
): PartialStrategyResult {
  return {
    metadata: createBaseMetadata(rawFeedback, context, analysisId),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getCostIntakeFromMetadata(
  result: PartialStrategyResult
): CostIntakeSelections | undefined {
  const value = result.metadata?.cost_intake;
  return isRecord(value) ? (value as CostIntakeSelections) : undefined;
}

function getOverviewPrompt(rawFeedback: string, context?: GenerationContext): GeminiMessage[] {
  const depth = getDepth(context);
  const input = trimText(rawFeedback, getInputCharLimit('overview'));

  const system = `You are a senior product strategist.

Generate ONLY a lightweight overview payload for PMCopilot's "All Sections" page.
Do NOT generate detailed PRD/features/tasks/manpower/cost data here.

Return valid JSON with exactly this schema:
{
  "executive_dashboard": {
    "idea_expansion": string,
    "key_insight": string,
    "innovation_score": number,
    "market_opportunity": string,
    "complexity_level": "Low" | "Medium" | "High" | "Very High",
    "recommended_strategy": string,
    "idea_expansion_breakdown": string[],
    "market_opportunity_signals": string[],
    "recommended_strategy_actions": string[],
    "score_rationale": string
  },
  "overview_summary": {
    "product_name": string,
    "one_line_summary": string,
    "core_value_props": string[],
    "critical_unknowns": string[]
  }
}

Rules:
- Keep output tight and relevant to the exact input idea.
- Do not include filler text.
- Keep executive_dashboard sections meaningfully detailed and idea-specific.
- innovation_score must be on a 0-10 scale (decimals allowed), never 0-100.
- Keep core_value_props and critical_unknowns to 3-5 bullets each.
- Output JSON only.`;

  const user = `Idea or input:
${input}

Context:
- Project name: ${trimText(context?.project_name, 120) || 'Not provided'}
- Industry: ${trimText(context?.industry, 80) || 'Not provided'}
- Product type: ${trimText(context?.product_type, 80) || 'Not provided'}
- Target users: ${trimText(context?.user_persona, 120) || 'Not provided'}
- Additional context: ${trimText(context?.project_context, 280) || 'None'}
- Depth: ${depth}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

function buildSeedContext(section: DeferredStrategySection, result: PartialStrategyResult) {
  const seed: Record<string, unknown> = {
    executive_dashboard: result.executive_dashboard || null,
    overview_summary: result.overview_summary || null,
  };
  const costIntake = getCostIntakeFromMetadata(result);

  if (section !== 'problem-analysis') {
    seed.problem_analysis = trimArray(result.problem_analysis, 8);
  }

  if (section !== 'feature-system') {
    seed.feature_system = trimArray(result.feature_system, 10);
  }

  if (section !== 'gaps-opportunities') {
    seed.gaps_opportunities = result.gaps_opportunities || null;
  }

  if (
    section === 'system-design' ||
    section === 'development-tasks' ||
    section === 'execution-roadmap' ||
    section === 'manpower-planning' ||
    section === 'resources' ||
    section === 'cost-estimation' ||
    section === 'timeline' ||
    section === 'impact-analysis'
  ) {
    seed.prd = result.prd || null;
  }

  if (
    section === 'execution-roadmap' ||
    section === 'timeline' ||
    section === 'cost-estimation' ||
    section === 'impact-analysis'
  ) {
    seed.development_tasks = trimArray(result.development_tasks, 16);
  }

  if (
    section === 'resources' ||
    section === 'cost-estimation' ||
    section === 'development-tasks'
  ) {
    seed.system_design = result.system_design || null;
    seed.manpower_planning = result.manpower_planning || null;
  }

  if (
    section === 'development-tasks' ||
    section === 'timeline' ||
    section === 'manpower-planning' ||
    section === 'cost-estimation'
  ) {
    seed.time_estimation = result.time_estimation || result.time_planning || null;
    seed.execution_roadmap = result.execution_roadmap || null;
  }

  if (
    costIntake &&
    (section === 'cost-estimation' ||
      section === 'timeline' ||
      section === 'manpower-planning')
  ) {
    seed.cost_intake = costIntake;
  }

  return seed;
}

function getDeferredSectionPrompt(
  section: DeferredStrategySection,
  rawFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
): GeminiMessage[] {
  const depth = getDepth(context);
  const trimmedInput = trimText(rawFeedback, getInputCharLimit(section));
  const seed = JSON.stringify(buildSeedContext(section, existingResult), null, 2);

  const sharedContext = `Original product input:
${trimmedInput}

Project context:
- Project name: ${trimText(context?.project_name, 120) || 'Not provided'}
- Industry: ${trimText(context?.industry, 80) || 'Not provided'}
- Product type: ${trimText(context?.product_type, 80) || 'Not provided'}
- Target users: ${trimText(context?.user_persona, 120) || 'Not provided'}
- Depth: ${depth}

Already generated context:
${seed}`;

  const sectionInstructions: Record<DeferredStrategySection, string> = {
    'problem-analysis': `Return valid JSON:
{
  "problem_analysis": [
    {
      "id": "PROB-001",
      "title": string,
      "deep_description": string,
      "detailed_description": string,
      "root_cause": string,
      "affected_users": string,
      "business_impact": string,
      "severity_score": number,
      "frequency_score": number
    }
  ]
}

Rules:
- Generate 10-14 idea-specific problems for meaningful inputs.
- Every problem must have unique title, clear root cause, affected users, and business impact.
- Avoid repeated points and generic filler.`,
    'feature-system': `Return valid JSON:
{
  "feature_system": [
    {
      "id": "FEAT-001",
      "name": string,
      "title": string,
      "category": "core" | "advanced" | "optional",
      "detailed_description": string,
      "why_needed": string,
      "linked_problems": string[],
      "mapped_problem_ids": string[],
      "user_value": string,
      "business_value": string,
      "complexity": "Low" | "Medium" | "High",
      "estimated_dev_time": string
    }
  ],
  "feature_strategy": {
    "core_features_reasoning": string[],
    "advanced_features_reasoning": string[],
    "optional_future_features_reasoning": string[],
    "why_these_features_matter": string
  }
}

Rules:
- For meaningful product inputs, generate 10-16 features (never below 10).
- Split features across core/advanced/optional categories.
- Keep every feature tied to concrete user problems from this idea.
- Avoid generic filler.`,
    'gaps-opportunities': `Return valid JSON:
{
  "gaps_opportunities": {
    "market_lacks": string[],
    "why_competitors_fail": string[],
    "innovation_opportunities": string[],
    "unfair_advantages": string[]
  }
}

Generate practical, idea-specific points only.`,
    prd: `Return valid JSON:
{
  "prd": {
    "product_overview": {
      "product_name": string,
      "one_line_summary": string,
      "problem_statement": string,
      "vision": string
    },
    "objectives_goals": {
      "business_goals": string[],
      "user_goals": string[],
      "kpis": string[]
    },
    "target_users_personas": {
      "user_segments": string[],
      "personas": [
        {
          "name": string,
          "description": string,
          "goals": string[],
          "pain_points": string[]
        }
      ],
      "key_pain_points": string[]
    },
    "problem_statement_structured": string,
    "scope": {
      "in_scope": string[],
      "out_of_scope": string[]
    },
    "features_requirements": {
      "functional_requirements": string[],
      "non_functional_requirements": {
        "performance": string[],
        "security": string[],
        "scalability": string[],
        "reliability": string[]
      }
    },
    "user_stories": [
      {
        "id": string,
        "story": string,
        "benefit": string
      }
    ],
    "user_flow_journey": [
      {
        "entry_point": string,
        "actions": string[],
        "outcome": string
      }
    ],
    "wireframes_mockups": {
      "screens": [
        {
          "name": string,
          "purpose": string,
          "key_elements": string[]
        }
      ],
      "navigation": string[],
      "layout_ideas": string[]
    },
    "acceptance_criteria": [
      {
        "id": string,
        "given": string,
        "when": string,
        "then": string
      }
    ],
    "success_metrics": [
      {
        "metric": string,
        "target": string,
        "measurement_window": string
      }
    ],
    "risks_assumptions": {
      "risks": [
        {
          "risk": string,
          "impact": "High" | "Medium" | "Low",
          "mitigation": string
        }
      ],
      "assumptions": string[]
    },
    "dependencies": [
      {
        "dependency": string,
        "type": string,
        "owner": string,
        "notes": string
      }
    ],
    "timeline_milestones": [
      {
        "milestone": string,
        "target_date": string,
        "description": string
      }
    ],
    "release_plan": {
      "phases": [
        {
          "name": string,
          "scope": string[],
          "exit_criteria": string[]
        }
      ],
      "rollout_strategy": string
    },
    "constraints": string[],
    "compliance_legal": string[],
    "stakeholders": [
      {
        "name_or_role": string,
        "interest": string,
        "responsibility": string
      }
    ],
    "open_questions": string[],
    "appendix": {
      "research_assumptions": string[],
      "competitor_notes": string[],
      "references": string[]
    }
  }
}

Rules:
- Include all 20 PRD sections above.
- Do not omit any section even when output is tight.
- Ensure each section has non-empty content tied to the product input.
- Keep it practical and implementation-ready.
- Keep bullets concise for token safety.
- Ensure every section is specific to the product input.`,
    'system-design': `Return valid JSON:
{
  "system_design": {
    "architecture_overview": string,
    "technology_stack": {
      "frontend": string[],
      "backend": string[],
      "database": string[],
      "infrastructure": string[],
      "third_party": string[]
    },
    "data_flow": string,
    "scalability_strategy": string,
    "security_considerations": string[]
  }
}`,
    'development-tasks': `Return valid JSON:
{
  "development_tasks": [
    {
      "id": "TASK-001",
      "title": string,
      "description": string,
      "why_this_task_matters": string,
      "type": "frontend" | "backend" | "ai" | "devops" | "design" | "testing" | "database" | "data" | "security" | "product",
      "owner_role": string,
      "priority": "Critical" | "High" | "Medium" | "Low",
      "estimated_time": string,
      "tech_stack": string[],
      "linked_features": string[],
      "section_dependencies": string[],
      "dependencies": string[],
      "detailed_steps": string[],
      "deliverables": string[],
      "done_criteria": string[],
      "expected_output": string
    }
  ]
}

Rules:
- Generate 18-32 implementation-ready tasks for meaningful product inputs (never below 16).
- Build a real execution plan, not a generic setup checklist.
- Cover architecture/discovery, data modeling, backend services, frontend workflows, AI/recommendation logic, integrations, analytics, testing/QA, security, deployment/monitoring, and post-launch optimization (when relevant).
- Every task must include: why_this_task_matters, owner_role, linked_features, section_dependencies, dependencies, deliverables, and done_criteria.
- Use linked_features values from generated feature IDs/titles where possible.
- Keep dependencies realistic and sequenced for delivery teams.`,
    'execution-roadmap': `Return valid JSON:
{
  "execution_roadmap": {
    "phase_1_mvp": { "duration": string, "key_features": string[], "goals": string[] },
    "phase_2_growth": { "duration": string, "key_features": string[], "goals": string[] },
    "phase_3_scale": { "duration": string, "key_features": string[], "goals": string[] }
  }
}`,
    'manpower-planning': `Return valid JSON:
{
  "manpower_planning": {
    "team_composition": [
      {
        "role": string,
        "seniority": string,
        "count": number,
        "monthly_cost_inr": number,
        "responsibilities": string[],
        "skills_required": string[],
        "hiring_phase": string,
        "must_have": boolean,
        "why_needed": string
      }
    ],
    "total_team_size": number,
    "total_monthly_cost_inr": number,
    "hiring_plan": string,
    "hiring_phases": [
      { "phase": string, "timeline": string, "roles": string[], "notes": string }
    ],
    "team_options": {
      "lean_team": [{ "role": string, "count": number, "monthly_cost_inr": number }],
      "startup_team": [{ "role": string, "count": number, "monthly_cost_inr": number }],
      "scale_team": [{ "role": string, "count": number, "monthly_cost_inr": number }]
    },
    "assumptions": string[]
  }
}

Rules:
- Tie role count and seniority to actual feature complexity, timeline, and dependencies from existing context.
- Explain why each role is needed (no generic team templates).
- Include lean/startup/scale staffing variants.`,
    resources: `Return valid JSON:
{
  "resource_requirements": {
    "infrastructure_costs": [
      {
        "service": string,
        "purpose": string,
        "monthly_cost_inr": number,
        "scaling_factor": string
      }
    ],
    "third_party_services": [
      {
        "service": string,
        "purpose": string,
        "monthly_cost_inr": number
      }
    ],
    "total_monthly_infrastructure_cost_inr": number
  }
}`,
    'cost-estimation': `Return valid JSON:
{
  "cost_estimation": {
    "development_cost": number,
    "engineers_cost": number,
    "cloud_cost": number,
    "ai_api_cost": number,
    "tools_cost": number,
    "operational_cost": number,
    "total_first_year": number,
    "total_first_year_cost_inr": number,
    "break_even_analysis": string,
    "low_budget_version": { "description": string, "annual_cost": number },
    "startup_version": { "description": string, "annual_cost": number },
    "scale_version": { "description": string, "annual_cost": number },
    "assumptions": string[],
    "cost_drivers": [
      {
        "driver": string,
        "selected_option": string,
        "impact_level": "Low" | "Medium" | "High",
        "notes": string
      }
    ],
    "budget_ranges": {
      "currency": "INR",
      "mvp": { "min": number, "max": number },
      "startup": { "min": number, "max": number },
      "scale": { "min": number, "max": number }
    },
    "team_implications": string[],
    "infra_implications": string[],
    "maintenance_implications": string[],
    "confidence_level": "Low" | "Medium" | "High",
    "uncertainty_notes": string[]
  }
}

Rules:
- Use the provided cost_intake selections when available; do not ignore them.
- Use feature scope, technical complexity, integrations, and timeline context.
- Keep estimates realistic for Indian market startup execution.
- Prefer range-based, assumption-aware estimates over inflated single-point numbers.
- Use INR and keep numbers internally consistent.`,
    timeline: `Return valid JSON:
{
  "time_estimation": {
    "total_weeks": number,
    "mvp_timeline": {
      "total_weeks": number,
      "key_milestones": [
        { "week": number, "milestone": string }
      ]
    },
    "critical_path": string[],
    "phases": [
      {
        "phase_name": string,
        "duration": string,
        "goals": string[],
        "deliverables": string[],
        "dependencies": string[],
        "risks": string[],
        "staffing_assumptions": string[]
      }
    ],
    "mvp_vs_post_mvp": {
      "mvp_focus": string[],
      "post_mvp_focus": string[]
    },
    "assumptions": string[]
  }
}

Rules:
- Derive timeline from user idea + generated problems + features + PRD + manpower assumptions.
- Include discovery, design, MVP build, testing, launch, and post-launch iteration.
- Make dependencies, risks, and staffing assumptions explicit and project-specific.`,
    'impact-analysis': `Return valid JSON:
{
  "impact_analysis": {
    "user_impact": string,
    "user_impact_score": number,
    "business_impact": string,
    "business_impact_score": number,
    "confidence_score": number,
    "time_to_value": string,
    "competitive_advantage": string,
    "long_term_vision": string
  }
}

Use confidence_score as a 0-1 decimal.`,
  };

  return [
    {
      role: 'system',
      content: `Generate exactly one product-analysis section.
${sectionInstructions[section]}
Output JSON only.`,
    },
    {
      role: 'user',
      content: sharedContext,
    },
  ];
}

function stampMetadata(
  result: PartialStrategyResult,
  generatedSections: StrategySectionId[],
  provider: string,
  processingTime: number
): PartialStrategyResult {
  result.metadata = {
    ...result.metadata,
    provider,
    model_used: `${config.gemini.model} (Gemini free-tier sectioned)`,
    processing_time_ms: processingTime,
    generated_sections: uniqSections([
      ...(result.metadata.generated_sections || []),
      ...generatedSections,
    ]),
    section_providers: {
      ...(result.metadata.section_providers || {}),
      ...Object.fromEntries(generatedSections.map((section) => [section, provider])),
    },
  };

  return result;
}

const MIN_RICH_PROBLEM_COUNT = 10;
const MIN_RICH_FEATURE_COUNT = 10;
const MIN_RICH_TASK_COUNT = 16;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  for (const item of value) {
    if (!isNonEmptyString(item)) {
      continue;
    }
    seen.add(normalizeWhitespace(item));
  }
  return Array.from(seen);
}

function ensureStringList(
  value: unknown,
  fallback: string[],
  minItems = 1,
  maxItems = 8
): string[] {
  const list = toStringArray(value).slice(0, maxItems);
  for (const candidate of fallback) {
    if (list.length >= minItems) {
      break;
    }
    if (!isNonEmptyString(candidate)) {
      continue;
    }
    if (!list.some((item) => item.toLowerCase() === candidate.toLowerCase())) {
      list.push(normalizeWhitespace(candidate));
    }
  }
  return list;
}

function clampScore(value: unknown, fallback = 6): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(1, Math.min(10, Math.round(numeric)));
}

function normalizeTenPointScore(value: unknown, fallback = 6.5): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  if (numeric <= 10) {
    return Number(Math.max(0, Math.min(10, numeric)).toFixed(1));
  }

  if (numeric <= 100) {
    return Number((numeric / 10).toFixed(1));
  }

  return 10;
}

function normalizeConfidenceScore(value: unknown, fallback = 0.68): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  if (numeric <= 1) {
    return Number(Math.max(0, Math.min(1, numeric)).toFixed(2));
  }

  if (numeric <= 100) {
    return Number((numeric / 100).toFixed(2));
  }

  return 1;
}

function normalizeId(
  idValue: unknown,
  prefix: 'PROB' | 'FEAT',
  fallbackIndex: number
): string {
  if (isNonEmptyString(idValue)) {
    return normalizeWhitespace(idValue).toUpperCase();
  }
  return `${prefix}-${String(fallbackIndex + 1).padStart(3, '0')}`;
}

function stripIdPrefix(value: string): string {
  return value.replace(/^([A-Z]{2,8}-\d+\s*[:\-]\s*)/i, '').trim();
}

type IdeaContext = {
  productName: string;
  targetUsers: string;
  oneLineSummary: string;
  topProblemTitles: string[];
  topFeatureTitles: string[];
  projectType: string;
};

function deriveIdeaContext(
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
): IdeaContext {
  const existingPrd = existingResult.prd as any;
  const productName =
    trimText(context?.project_name, 90) ||
    trimText(existingResult.overview_summary?.product_name, 90) ||
    trimText(existingPrd?.product_overview?.product_name, 90) ||
    'the product';

  const targetUsers =
    trimText(context?.user_persona, 140) ||
    trimText(existingPrd?.target_users_personas?.user_segments?.[0], 140) ||
    trimText(existingPrd?.target_users?.[0], 140) ||
    'target users from the project input';

  const oneLineSummary =
    trimText(existingResult.overview_summary?.one_line_summary, 220) ||
    trimText(existingPrd?.product_overview?.one_line_summary, 220) ||
    trimText(normalizedFeedback, 220) ||
    `${productName} for ${targetUsers}`;

  const topProblemTitles = trimArray(existingResult.problem_analysis, 6)
    .map((problem) => normalizeWhitespace(problem?.title || ''))
    .filter(Boolean);

  const topFeatureTitles = trimArray(existingResult.feature_system, 6)
    .map((feature) =>
      normalizeWhitespace((feature?.name || feature?.title || '').toString())
    )
    .filter(Boolean);

  return {
    productName,
    targetUsers,
    oneLineSummary,
    topProblemTitles,
    topFeatureTitles,
    projectType: trimText(context?.product_type, 80) || 'product platform',
  };
}

function selectionIncludes(value: string | undefined, keywords: string[]): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function scoreFromSelection(
  value: string | undefined,
  weightedMatchers: Array<{ keywords: string[]; score: number }>,
  fallback: number
): number {
  if (!value) {
    return fallback;
  }

  const normalized = value.toLowerCase();
  for (const matcher of weightedMatchers) {
    if (matcher.keywords.some((keyword) => normalized.includes(keyword))) {
      return matcher.score;
    }
  }

  return fallback;
}

function getRoleMonthlyCost(role: string, seniority: string | undefined): number {
  const normalizedRole = role.toLowerCase();
  const normalizedSeniority = (seniority || 'mid').toLowerCase();

  const seniorityMultiplier = selectionIncludes(normalizedSeniority, ['junior'])
    ? 0.78
    : selectionIncludes(normalizedSeniority, ['lead', 'principal', 'staff', 'architect'])
    ? 1.35
    : selectionIncludes(normalizedSeniority, ['senior'])
    ? 1.2
    : 1;

  const base =
    selectionIncludes(normalizedRole, ['product manager']) ||
    selectionIncludes(normalizedRole, ['program manager'])
      ? 180000
      : selectionIncludes(normalizedRole, ['ai', 'ml', 'machine learning'])
      ? 220000
      : selectionIncludes(normalizedRole, ['devops', 'sre'])
      ? 190000
      : selectionIncludes(normalizedRole, ['designer', 'ux', 'ui'])
      ? 130000
      : selectionIncludes(normalizedRole, ['qa', 'test'])
      ? 110000
      : selectionIncludes(normalizedRole, ['backend'])
      ? 175000
      : selectionIncludes(normalizedRole, ['frontend'])
      ? 165000
      : 170000;

  return Math.round(base * seniorityMultiplier);
}

function estimateCostModel(
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
) {
  const intake = getCostIntakeFromMetadata(existingResult);
  const features = Array.isArray(existingResult.feature_system)
    ? existingResult.feature_system
    : [];
  const tasks = Array.isArray(existingResult.development_tasks)
    ? existingResult.development_tasks
    : [];

  const highComplexityFeatures = features.filter((feature: any) =>
    selectionIncludes(feature?.complexity, ['high', 'complex'])
  ).length;

  const featureScopeFactor = Math.max(0, features.length - 8) * 0.03;
  const taskScopeFactor = Math.max(0, tasks.length - 14) * 0.01;
  const complexitySignal =
    scoreFromSelection(
      intake?.technical_complexity?.backend_complexity,
      [
        { keywords: ['high', 'complex'], score: 1.24 },
        { keywords: ['medium'], score: 1.08 },
        { keywords: ['low', 'simple'], score: 0.92 },
      ],
      1.06
    ) *
    scoreFromSelection(
      intake?.feature_complexity?.advanced_features,
      [
        { keywords: ['many', 'extensive', 'high'], score: 1.2 },
        { keywords: ['moderate', 'medium'], score: 1.08 },
        { keywords: ['few', 'low', 'minimal'], score: 0.92 },
      ],
      1
    ) *
    scoreFromSelection(
      intake?.feature_complexity?.realtime_features,
      [
        { keywords: ['required', 'high', 'yes'], score: 1.15 },
        { keywords: ['some'], score: 1.08 },
        { keywords: ['none', 'no'], score: 0.95 },
      ],
      1
    );

  const teamMode = intake?.development_factors?.team_mode || 'small team';
  const seniority = intake?.development_factors?.seniority || 'mid';
  const deliverySpeed = intake?.development_factors?.delivery_speed || 'balanced';
  const hostingScale = intake?.infrastructure_hosting?.hosting_scale || 'mvp';
  const aiUsage = intake?.integrations_apis?.ai_apis || intake?.feature_complexity?.ai_features;
  const maintenanceLevel = intake?.maintenance_scaling?.support_level || 'standard';

  const baseTeamMonthly = scoreFromSelection(
    teamMode,
    [
      { keywords: ['solo', 'single'], score: 160000 },
      { keywords: ['small', 'lean'], score: 520000 },
      { keywords: ['full', 'cross-functional', 'scale'], score: 1180000 },
    ],
    520000
  );

  const seniorityMultiplier = scoreFromSelection(
    seniority,
    [
      { keywords: ['junior'], score: 0.82 },
      { keywords: ['mid'], score: 1 },
      { keywords: ['senior', 'lead', 'principal'], score: 1.28 },
    ],
    1
  );

  const speedMultiplier = scoreFromSelection(
    deliverySpeed,
    [
      { keywords: ['aggressive', 'fast'], score: 1.2 },
      { keywords: ['balanced'], score: 1 },
      { keywords: ['slow', 'steady'], score: 0.92 },
    ],
    1
  );

  const scopeMultiplier = Math.min(
    1.95,
    Math.max(0.88, 0.95 + featureScopeFactor + taskScopeFactor + highComplexityFeatures * 0.04)
  );

  const teamMonthlyCost = Math.round(
    baseTeamMonthly * seniorityMultiplier * speedMultiplier * complexitySignal * scopeMultiplier
  );

  const infraBaseMonthly = scoreFromSelection(
    hostingScale,
    [
      { keywords: ['mvp', 'small', 'starter'], score: 12000 },
      { keywords: ['growth', 'medium'], score: 42000 },
      { keywords: ['scale', 'high', 'enterprise'], score: 120000 },
    ],
    28000
  );

  const concurrencyMultiplier = scoreFromSelection(
    intake?.user_scale?.concurrent_users,
    [
      { keywords: ['low', '<1k', 'under 1k'], score: 0.92 },
      { keywords: ['1k', '5k', 'medium'], score: 1.05 },
      { keywords: ['10k', 'high', '50k', '100k'], score: 1.35 },
    ],
    1
  );

  const realtimeMultiplier = scoreFromSelection(
    intake?.performance_requirements?.realtime_response ||
      intake?.feature_complexity?.realtime_features,
    [
      { keywords: ['strict', 'high', 'realtime', 'sub-second'], score: 1.28 },
      { keywords: ['moderate'], score: 1.1 },
      { keywords: ['low', 'not required', 'none'], score: 0.94 },
    ],
    1
  );

  const infraMonthly = Math.round(
    infraBaseMonthly * concurrencyMultiplier * realtimeMultiplier
  );

  const aiApiMonthly = Math.round(
    scoreFromSelection(
      aiUsage,
      [
        { keywords: ['none', 'no'], score: 6000 },
        { keywords: ['basic', 'limited'], score: 18000 },
        { keywords: ['moderate', 'recommendation'], score: 35000 },
        { keywords: ['advanced', 'heavy', 'real-time'], score: 80000 },
      ],
      22000
    ) * Math.max(0.9, concurrencyMultiplier)
  );

  const toolsMonthly = Math.round(
    scoreFromSelection(
      intake?.integrations_apis?.communication,
      [
        { keywords: ['none', 'minimal'], score: 7000 },
        { keywords: ['email', 'sms'], score: 12000 },
        { keywords: ['multichannel', 'high'], score: 22000 },
      ],
      11000
    )
  );

  const maintenanceMonthly = Math.round(
    teamMonthlyCost *
      scoreFromSelection(
        maintenanceLevel,
        [
          { keywords: ['basic', 'minimal'], score: 0.12 },
          { keywords: ['standard'], score: 0.18 },
          { keywords: ['high', '24x7', 'premium'], score: 0.27 },
        ],
        0.18
      )
  );

  const developmentCost = Math.round(teamMonthlyCost * 7.5);
  const cloudCostYearly = infraMonthly * 12;
  const aiApiCostYearly = aiApiMonthly * 12;
  const toolsCostYearly = toolsMonthly * 12;
  const operationalCostYearly = maintenanceMonthly * 12;

  const totalFirstYearCost = Math.round(
    developmentCost + cloudCostYearly + aiApiCostYearly + toolsCostYearly + operationalCostYearly
  );

  const lowAnnual = Math.round(Math.max(900000, totalFirstYearCost * 0.68));
  const startupAnnual = Math.round(totalFirstYearCost);
  const scaleAnnual = Math.round(totalFirstYearCost * 1.82);

  const breakEvenMonths = Math.max(
    10,
    Math.min(
      36,
      Math.round(
        scoreFromSelection(
          intake?.business_model_impact?.business_model,
          [
            { keywords: ['subscription', 'saas'], score: 16 },
            { keywords: ['freemium'], score: 20 },
            { keywords: ['marketplace'], score: 18 },
            { keywords: ['internal', 'ops'], score: 24 },
            { keywords: ['ad'], score: 22 },
          ],
          18
        ) * scoreFromSelection(intake?.market_business?.competition_level, [
          { keywords: ['low'], score: 0.9 },
          { keywords: ['medium'], score: 1 },
          { keywords: ['high'], score: 1.15 },
        ], 1)
      )
    )
  );

  const idea = deriveIdeaContext(normalizedFeedback, existingResult, context);
  const assumptions = [
    `${idea.productName} is built with a staged rollout (MVP -> startup growth -> scale).`,
    `Engineering hiring follows a ${teamMode} model with ${seniority} talent bias.`,
    `Costing uses India-focused salary and cloud pricing baselines with a ${context?.depth || 'medium'} depth scope.`,
  ];

  const costDrivers = [
    {
      driver: 'Team model',
      selected_option: teamMode,
      impact_level: teamMonthlyCost > 900000 ? 'High' : teamMonthlyCost > 500000 ? 'Medium' : 'Low',
      notes: `Estimated engineering burn: ₹${Math.round(teamMonthlyCost / 1000)}K/month.`,
    },
    {
      driver: 'Technical complexity',
      selected_option:
        intake?.technical_complexity?.backend_complexity ||
        intake?.technical_complexity?.frontend_complexity ||
        'Medium',
      impact_level: complexitySignal >= 1.2 ? 'High' : complexitySignal >= 1.02 ? 'Medium' : 'Low',
      notes: `Feature and architecture complexity multiplier: ${complexitySignal.toFixed(2)}x.`,
    },
    {
      driver: 'Hosting and scale',
      selected_option: hostingScale,
      impact_level: infraMonthly >= 80000 ? 'High' : infraMonthly >= 30000 ? 'Medium' : 'Low',
      notes: `Infrastructure estimate: ₹${Math.round(infraMonthly / 1000)}K/month.`,
    },
    {
      driver: 'AI API usage',
      selected_option: aiUsage || 'Basic',
      impact_level: aiApiMonthly >= 70000 ? 'High' : aiApiMonthly >= 25000 ? 'Medium' : 'Low',
      notes: `AI API estimate: ₹${Math.round(aiApiMonthly / 1000)}K/month.`,
    },
  ];

  return {
    teamMonthlyCost,
    infraMonthly,
    aiApiMonthly,
    toolsMonthly,
    maintenanceMonthly,
    developmentCost,
    cloudCostYearly,
    aiApiCostYearly,
    toolsCostYearly,
    operationalCostYearly,
    totalFirstYearCost,
    lowAnnual,
    startupAnnual,
    scaleAnnual,
    breakEvenMonths,
    assumptions,
    costDrivers,
    intake,
  };
}

function normalizeExecutiveDashboard(
  dashboard: any,
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
) {
  const idea = deriveIdeaContext(normalizedFeedback, existingResult, context);
  const base = dashboard && typeof dashboard === 'object' ? { ...dashboard } : {};
  const ideaExpansion = normalizeWhitespace(base.idea_expansion || '') ||
    `${idea.productName} can become a focused ${idea.projectType} for ${idea.targetUsers} by reducing workflow friction and giving clear next actions.`;
  const marketOpportunity = normalizeWhitespace(base.market_opportunity || '') ||
    `The opportunity is strongest where existing tools fail to combine execution guidance, visibility, and measurable outcomes for ${idea.targetUsers}.`;
  const recommendedStrategy = normalizeWhitespace(base.recommended_strategy || '') ||
    `Launch with a narrow MVP for one high-value workflow, validate retention, then scale with automation and integrations.`;

  return {
    idea_expansion: ideaExpansion,
    key_insight:
      normalizeWhitespace(base.key_insight || '') ||
      `${idea.targetUsers} adopt faster when guided decisions are linked to measurable outcomes.`,
    innovation_score: normalizeTenPointScore(base.innovation_score, 7.2),
    market_opportunity: marketOpportunity,
    complexity_level:
      base.complexity_level === 'Low' ||
      base.complexity_level === 'Medium' ||
      base.complexity_level === 'High' ||
      base.complexity_level === 'Very High'
        ? base.complexity_level
        : 'Medium',
    recommended_strategy: recommendedStrategy,
    idea_expansion_breakdown: ensureStringList(base.idea_expansion_breakdown, [
      `Primary user outcome: help ${idea.targetUsers} complete critical workflows quickly.`,
      'Product direction: guided execution + adaptive recommendations + measurable progress.',
      'Commercial path: start with MVP utility, then layer monetizable intelligence.',
    ], 3, 6),
    market_opportunity_signals: ensureStringList(base.market_opportunity_signals, [
      'Current alternatives are fragmented and force manual coordination.',
      'Teams need tighter linkage between planning decisions and measurable impact.',
      'Users are willing to adopt tools that reduce time-to-value in first sessions.',
    ], 3, 6),
    recommended_strategy_actions: ensureStringList(base.recommended_strategy_actions, [
      'Define MVP scope around one measurable user workflow.',
      'Instrument activation, retention, and cycle-time KPIs from day one.',
      'Sequence integrations after MVP proof rather than before launch.',
    ], 3, 6),
    score_rationale:
      normalizeWhitespace(base.score_rationale || '') ||
      'Score reflects market novelty, defensibility potential, and implementation feasibility.',
  };
}

function normalizeTimelineEstimation(
  timeline: any,
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
) {
  const idea = deriveIdeaContext(normalizedFeedback, existingResult, context);
  const features = Array.isArray(existingResult.feature_system)
    ? existingResult.feature_system
    : [];
  const tasks = Array.isArray(existingResult.development_tasks)
    ? existingResult.development_tasks
    : [];
  const manpower = (existingResult.manpower_planning || {}) as any;
  const featureComplexityBoost = Math.min(6, features.filter((feature: any) =>
    selectionIncludes(feature?.complexity, ['high', 'complex'])
  ).length);

  const baseMvpWeeks = Math.max(
    8,
    Math.min(
      18,
      9 + Math.round(features.length / 4) + Math.round(tasks.length / 12) + featureComplexityBoost
    )
  );

  const discoveryWeeks = 1 + Math.min(2, Math.round(features.length / 10));
  const designWeeks = 2 + Math.min(2, Math.round(features.length / 8));
  const mvpBuildWeeks = Math.max(4, baseMvpWeeks - discoveryWeeks - designWeeks - 2);
  const testingWeeks = 2 + (featureComplexityBoost >= 3 ? 1 : 0);
  const launchWeeks = 1;
  const postLaunchWeeks = 4 + Math.min(4, Math.round(features.length / 6));

  const phases = [
    {
      phase_name: 'Discovery',
      duration: `${discoveryWeeks} week${discoveryWeeks > 1 ? 's' : ''}`,
      goals: [
        `Lock MVP scope for ${idea.productName}`,
        'Define KPIs, dependencies, and success gates',
      ],
      deliverables: [
        'Prioritized feature list',
        'Delivery risks and mitigation tracker',
      ],
      dependencies: ['Stakeholder alignment', 'User problem validation'],
      risks: ['Scope churn', 'Insufficient problem evidence'],
      staffing_assumptions: ['PM + Tech Lead + Designer'],
    },
    {
      phase_name: 'Design',
      duration: `${designWeeks} weeks`,
      goals: ['Finalize user flows and UX decisions', 'Prepare implementation-ready specs'],
      deliverables: ['Wireframes and key screen specs', 'Acceptance criteria for core journeys'],
      dependencies: ['Discovery outputs', 'Content and data model definitions'],
      risks: ['UX rework due to missing edge cases'],
      staffing_assumptions: ['Designer + PM + Frontend Lead'],
    },
    {
      phase_name: 'MVP Build',
      duration: `${mvpBuildWeeks} weeks`,
      goals: ['Build and integrate core workflows', 'Ship high-priority features first'],
      deliverables: ['Core frontend and backend modules', 'Instrumentation and baseline analytics'],
      dependencies: ['Stable architecture decisions', 'Third-party API readiness'],
      risks: ['Integration delays', 'Technical debt under speed pressure'],
      staffing_assumptions: [
        `${Math.max(2, Math.min(6, manpower?.total_team_size || 3))} engineering contributors`,
      ],
    },
    {
      phase_name: 'Testing',
      duration: `${testingWeeks} weeks`,
      goals: ['Stabilize quality and performance', 'Validate release readiness'],
      deliverables: ['QA sign-off report', 'Performance and security checklist'],
      dependencies: ['Feature-complete MVP build'],
      risks: ['Regression bugs', 'Underestimated non-functional fixes'],
      staffing_assumptions: ['QA + Engineering + PM'],
    },
    {
      phase_name: 'Launch',
      duration: `${launchWeeks} week`,
      goals: ['Release to pilot users', 'Monitor telemetry and incidents'],
      deliverables: ['Pilot launch runbook', 'Go/no-go decision log'],
      dependencies: ['Testing sign-off', 'Support playbooks'],
      risks: ['Unexpected production load', 'Adoption lag'],
      staffing_assumptions: ['On-call engineering + PM support'],
    },
    {
      phase_name: 'Post-launch Iteration',
      duration: `${postLaunchWeeks} weeks`,
      goals: ['Improve activation and retention', 'Prioritize growth features'],
      deliverables: ['Iteration backlog', 'MVP vs post-MVP transition plan'],
      dependencies: ['Pilot data and user feedback'],
      risks: ['Feature creep', 'Weak KPI ownership'],
      staffing_assumptions: ['Core product squad with part-time analytics'],
    },
  ];

  const mvpMilestones = [
    { week: discoveryWeeks, milestone: 'Discovery scope locked' },
    { week: discoveryWeeks + designWeeks, milestone: 'Design sign-off complete' },
    {
      week: discoveryWeeks + designWeeks + Math.max(2, Math.round(mvpBuildWeeks * 0.6)),
      milestone: 'Core MVP workflows integrated',
    },
    {
      week: discoveryWeeks + designWeeks + mvpBuildWeeks + testingWeeks,
      milestone: 'MVP ready for launch',
    },
  ];

  const totalWeeks = discoveryWeeks + designWeeks + mvpBuildWeeks + testingWeeks + launchWeeks + postLaunchWeeks;
  const mvpTotalWeeks = discoveryWeeks + designWeeks + mvpBuildWeeks + testingWeeks + launchWeeks;
  const base = timeline && typeof timeline === 'object' ? { ...timeline } : {};

  return {
    ...base,
    total_weeks: Number(base.total_weeks) || totalWeeks,
    mvp_timeline: {
      total_weeks: Number(base.mvp_timeline?.total_weeks) || mvpTotalWeeks,
      key_milestones: Array.isArray(base.mvp_timeline?.key_milestones) &&
        base.mvp_timeline.key_milestones.length > 0
        ? base.mvp_timeline.key_milestones
        : mvpMilestones,
    },
    critical_path: ensureStringList(base.critical_path, [
      'Finalize architecture and data model decisions',
      'Complete core backend APIs before full frontend integration',
      'Finish QA and performance checks before pilot launch',
    ], 3, 8),
    phases:
      Array.isArray(base.phases) && base.phases.length >= 4
        ? base.phases
        : phases,
    mvp_vs_post_mvp: {
      mvp_focus: ensureStringList(base.mvp_vs_post_mvp?.mvp_focus, [
        'Core user workflow completion',
        'Instrumentation for activation and retention metrics',
        'Reliable deployment and monitoring baseline',
      ], 3, 6),
      post_mvp_focus: ensureStringList(base.mvp_vs_post_mvp?.post_mvp_focus, [
        'Advanced automation and personalization',
        'Scale-oriented performance optimization',
        'Secondary integrations and growth loops',
      ], 3, 6),
    },
    assumptions: ensureStringList(base.assumptions, [
      'Dependencies are resolved within planned phase boundaries.',
      'Team availability is stable across MVP window.',
      'Scope control is enforced through milestone gates.',
    ], 3, 6),
  };
}

function normalizeManpowerPlanning(
  manpower: any,
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
) {
  const idea = deriveIdeaContext(normalizedFeedback, existingResult, context);
  const features = Array.isArray(existingResult.feature_system)
    ? existingResult.feature_system
    : [];
  const timeline = (existingResult.time_estimation || existingResult.time_planning || {}) as any;
  const intake = getCostIntakeFromMetadata(existingResult);
  const base = manpower && typeof manpower === 'object' ? { ...manpower } : {};

  const needsAI = selectionIncludes(
    intake?.feature_complexity?.ai_features ||
      intake?.technical_complexity?.ai_ml_level ||
      intake?.integrations_apis?.ai_apis,
    ['yes', 'required', 'advanced', 'moderate', 'high', 'recommendation', 'ai']
  ) || features.some((feature: any) =>
    selectionIncludes(feature?.name || feature?.title, ['ai', 'recommend', 'predict'])
  );

  const highScale = selectionIncludes(
    intake?.infrastructure_hosting?.hosting_scale || intake?.user_scale?.expected_users,
    ['scale', 'high', '10k', '50k', '100k']
  );

  const leanTeam = [
    { role: 'Product Manager', count: 1, seniority: 'Mid' },
    { role: 'Full-Stack Engineer', count: 2, seniority: 'Senior' },
    { role: 'UI/UX Designer', count: 1, seniority: 'Mid' },
    { role: 'QA Engineer', count: 1, seniority: 'Mid' },
  ];

  const startupTeam = [
    { role: 'Product Manager', count: 1, seniority: 'Senior' },
    { role: 'Frontend Engineer', count: 2, seniority: 'Senior' },
    { role: 'Backend Engineer', count: 2, seniority: 'Senior' },
    { role: 'UI/UX Designer', count: 1, seniority: 'Mid' },
    { role: 'QA Engineer', count: 1, seniority: 'Mid' },
    { role: 'DevOps Engineer', count: 1, seniority: 'Mid' },
  ];

  const scaleTeam = [
    ...startupTeam,
    { role: 'Data/Analytics Engineer', count: 1, seniority: 'Senior' },
    { role: 'Customer Success Lead', count: 1, seniority: 'Mid' },
  ];

  if (needsAI) {
    leanTeam.push({ role: 'AI/ML Engineer', count: 1, seniority: 'Senior' });
    startupTeam.push({ role: 'AI/ML Engineer', count: 1, seniority: 'Senior' });
    scaleTeam.push({ role: 'AI/ML Engineer', count: 2, seniority: 'Senior' });
  }

  if (highScale) {
    startupTeam.push({ role: 'SRE/DevOps Engineer', count: 1, seniority: 'Senior' });
    scaleTeam.push({ role: 'SRE/DevOps Engineer', count: 2, seniority: 'Senior' });
  }

  const teamMode = intake?.development_factors?.team_mode || '';
  const selectedTemplate = selectionIncludes(teamMode, ['solo', 'lean'])
    ? leanTeam
    : selectionIncludes(teamMode, ['full', 'scale'])
    ? scaleTeam
    : startupTeam;

  const teamComposition = selectedTemplate.map((member) => {
    const monthlyCost = getRoleMonthlyCost(member.role, member.seniority) * member.count;
    return {
      role: member.role,
      seniority: member.seniority,
      count: member.count,
      monthly_cost_inr: monthlyCost,
      responsibilities: ensureStringList([], [
        `Own ${member.role.toLowerCase()} delivery quality`,
        `Support ${idea.productName} milestone execution`,
      ], 2, 4),
      skills_required: ensureStringList([], [
        'Domain and delivery experience',
        'Collaboration across product and engineering',
      ], 2, 4),
      hiring_phase:
        member.role.includes('Product') || member.role.includes('Designer')
          ? 'Discovery + Design'
          : member.role.includes('QA')
          ? 'MVP Build + Testing'
          : 'MVP Build',
      must_have:
        member.role.includes('Product') ||
        member.role.includes('Engineer') ||
        member.role.includes('Designer'),
      why_needed:
        member.role.includes('AI')
          ? 'Needed to deliver AI/recommendation quality and model integration reliability.'
          : member.role.includes('DevOps') || member.role.includes('SRE')
          ? 'Needed to keep releases stable, observable, and scalable.'
          : `Needed to deliver core ${idea.projectType} workflows on timeline.`,
    };
  });

  const totalTeamSize = teamComposition.reduce((sum, member) => sum + (member.count || 0), 0);
  const totalMonthlyCost = teamComposition.reduce(
    (sum, member) => sum + (member.monthly_cost_inr || 0),
    0
  );

  const mvpWeeks = Number(timeline?.mvp_timeline?.total_weeks || timeline?.total_weeks || 12);

  const toCostOnly = (items: Array<{ role: string; count: number; seniority: string }>) =>
    items.map((item) => ({
      role: item.role,
      count: item.count,
      monthly_cost_inr: getRoleMonthlyCost(item.role, item.seniority) * item.count,
    }));

  return {
    ...base,
    team_composition: teamComposition,
    total_team_size: totalTeamSize,
    total_monthly_cost_inr: totalMonthlyCost,
    hiring_plan:
      normalizeWhitespace(base.hiring_plan || '') ||
      `Hire core MVP squad in first 2 weeks, expand with scale roles after week ${Math.max(
        6,
        Math.round(mvpWeeks * 0.65)
      )} once KPI signals are stable.`,
    roles_rationale: teamComposition.map((member) => ({
      role: member.role,
      why_needed: member.why_needed,
      must_have: member.must_have,
      hiring_phase: member.hiring_phase,
    })),
    hiring_phases: [
      {
        phase: 'Phase 1 - Discovery & Design',
        timeline: 'Weeks 1-3',
        roles: teamComposition
          .filter((member) => member.hiring_phase?.includes('Discovery'))
          .map((member) => member.role),
        notes: 'Lock requirements and UX direction early.',
      },
      {
        phase: 'Phase 2 - MVP Build',
        timeline: 'Weeks 3-10',
        roles: teamComposition
          .filter((member) => member.hiring_phase?.includes('MVP'))
          .map((member) => member.role),
        notes: 'Build priority workflows and integration backbone.',
      },
      {
        phase: 'Phase 3 - Stabilization & Launch',
        timeline: 'Weeks 10+',
        roles: teamComposition
          .filter((member) =>
            member.hiring_phase?.includes('Testing') ||
            member.role.includes('DevOps') ||
            member.role.includes('SRE')
          )
          .map((member) => member.role),
        notes: 'Focus on quality, reliability, and rollout readiness.',
      },
    ],
    team_options: {
      lean_team: toCostOnly(leanTeam),
      startup_team: toCostOnly(startupTeam),
      scale_team: toCostOnly(scaleTeam),
    },
    assumptions: ensureStringList(base.assumptions, [
      'Hiring pipeline can staff critical roles in planned windows.',
      'Role overlap is acceptable in early MVP stage.',
      'Scale roles are activated after MVP validation.',
    ], 3, 6),
  };
}

function normalizeCostEstimation(
  cost: any,
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
) {
  const model = estimateCostModel(normalizedFeedback, existingResult, context);
  const base = cost && typeof cost === 'object' ? { ...cost } : {};

  const clampToModelRange = (
    value: unknown,
    modelValue: number,
    lowerMultiplier = 0.5,
    upperMultiplier = 2.4
  ) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return modelValue;
    }
    const min = Math.round(modelValue * lowerMultiplier);
    const max = Math.round(modelValue * upperMultiplier);
    return Math.max(min, Math.min(max, Math.round(numeric)));
  };

  const developmentCost = clampToModelRange(base.development_cost, model.developmentCost, 0.55, 2.2);
  const engineersCost = clampToModelRange(base.engineers_cost, model.teamMonthlyCost * 12, 0.55, 2.3);
  const cloudCost = clampToModelRange(base.cloud_cost, model.cloudCostYearly, 0.45, 2.8);
  const aiApiCost = clampToModelRange(base.ai_api_cost, model.aiApiCostYearly, 0.4, 3);
  const toolsCost = clampToModelRange(base.tools_cost, model.toolsCostYearly, 0.45, 2.5);
  const operationalCost = clampToModelRange(base.operational_cost, model.operationalCostYearly, 0.45, 2.5);
  const modelTotal = Math.round(
    developmentCost + cloudCost + aiApiCost + toolsCost + operationalCost
  );
  const totalFirstYear = clampToModelRange(
    base.total_first_year || base.total_first_year_cost_inr,
    modelTotal,
    0.6,
    2.35
  );

  const lowAnnual = clampToModelRange(base.low_budget_version?.annual_cost, model.lowAnnual, 0.6, 2);
  const startupAnnual = clampToModelRange(base.startup_version?.annual_cost, model.startupAnnual, 0.6, 2.2);
  const scaleAnnual = clampToModelRange(
    base.scale_version?.annual_cost,
    Math.max(model.scaleAnnual, startupAnnual + model.infraMonthly * 12),
    0.65,
    2.4
  );
  const normalizedStartupAnnual = Math.max(startupAnnual, lowAnnual + 120000);
  const normalizedScaleAnnual = Math.max(scaleAnnual, normalizedStartupAnnual + 180000);

  const confidence = selectionIncludes(
    model.intake?.market_business?.target_market_size,
    ['unknown', 'unclear', 'not sure']
  )
    ? 'Low'
    : selectionIncludes(model.intake?.development_factors?.delivery_speed, ['aggressive'])
    ? 'Medium'
    : 'High';

  return {
    ...base,
    development_cost: developmentCost,
    engineers_cost: engineersCost,
    cloud_cost: cloudCost,
    ai_api_cost: aiApiCost,
    tools_cost: toolsCost,
    operational_cost: operationalCost,
    total_first_year: totalFirstYear,
    total_first_year_cost_inr: totalFirstYear,
    break_even_analysis:
      normalizeWhitespace(base.break_even_analysis || '') ||
      `With the selected scope and pricing assumptions, break-even is plausible in ${model.breakEvenMonths}-${model.breakEvenMonths + 4} months if activation and retention KPIs stay on target.`,
    low_budget_version: {
      description:
        base.low_budget_version?.description ||
        'Lean MVP with strict scope control and minimal integrations.',
      annual_cost: lowAnnual,
    },
    startup_version: {
      description:
        base.startup_version?.description ||
        'Balanced startup build with moderate integrations and quality guardrails.',
      annual_cost: normalizedStartupAnnual,
    },
    scale_version: {
      description:
        base.scale_version?.description ||
        'Scale-ready architecture with higher reliability, performance, and support coverage.',
      annual_cost: normalizedScaleAnnual,
    },
    assumptions: ensureStringList(base.assumptions, model.assumptions, 3, 8),
    cost_drivers:
      Array.isArray(base.cost_drivers) && base.cost_drivers.length > 0
        ? base.cost_drivers
        : model.costDrivers,
    budget_ranges: {
      currency: 'INR',
      mvp: {
        min: Math.round(lowAnnual * 0.82),
        max: Math.round(normalizedStartupAnnual * 0.92),
      },
      startup: {
        min: Math.round(normalizedStartupAnnual * 0.9),
        max: Math.round(normalizedStartupAnnual * 1.15),
      },
      scale: {
        min: Math.round(normalizedScaleAnnual * 0.9),
        max: Math.round(normalizedScaleAnnual * 1.2),
      },
      ...(base.budget_ranges || {}),
    },
    team_implications: ensureStringList(base.team_implications, [
      `Expected engineering burn is about ₹${Math.round(model.teamMonthlyCost / 1000)}K/month.`,
      'Higher seniority accelerates delivery but increases monthly burn.',
      'Role overlap is viable in MVP; specialization becomes necessary in growth phase.',
    ], 3, 6),
    infra_implications: ensureStringList(base.infra_implications, [
      `Infrastructure baseline is about ₹${Math.round(model.infraMonthly / 1000)}K/month before growth spikes.`,
      'Realtime and concurrency requirements are the biggest infra multipliers.',
      'Autoscaling and observability should be introduced before scale phase.',
    ], 3, 6),
    maintenance_implications: ensureStringList(base.maintenance_implications, [
      `Ongoing maintenance/support budget is roughly ₹${Math.round(model.maintenanceMonthly / 1000)}K/month.`,
      'Support intensity rises after launch and should be planned explicitly.',
      'Monitoring and incident response become critical once user scale grows.',
    ], 3, 6),
    confidence_level: (base.confidence_level || confidence) as string,
    uncertainty_notes: ensureStringList(base.uncertainty_notes, [
      'Final costs vary based on actual API usage and user growth pace.',
      'Hiring lead time and contractor mix can shift team cost by 10-20%.',
      'Compliance requirements can materially change infra and security spend.',
    ], 3, 6),
    break_even_months: Number(base.break_even_months) || model.breakEvenMonths,
  };
}

function getMinimumProblemCount(input: string): number {
  return normalizeInput(input).length >= 80 ? MIN_RICH_PROBLEM_COUNT : 8;
}

function getTargetProblemCount(input: string): number {
  const minimum = getMinimumProblemCount(input);
  return minimum >= MIN_RICH_PROBLEM_COUNT ? 12 : minimum;
}

function getMinimumFeatureCount(input: string): number {
  return normalizeInput(input).length >= 80 ? MIN_RICH_FEATURE_COUNT : 8;
}

function getTargetFeatureCount(input: string): number {
  const minimum = getMinimumFeatureCount(input);
  return minimum >= MIN_RICH_FEATURE_COUNT ? 12 : minimum;
}

function getMinimumTaskCount(
  input: string,
  existingResult: PartialStrategyResult
): number {
  const normalizedLength = normalizeInput(input).length;
  const featureCount = Array.isArray(existingResult.feature_system)
    ? existingResult.feature_system.length
    : 0;
  const base = normalizedLength >= 80 ? MIN_RICH_TASK_COUNT : 10;
  const scopeBoost = Math.min(8, Math.round(featureCount / 2));
  return Math.max(base, Math.min(32, base + scopeBoost));
}

function getTargetTaskCount(
  input: string,
  existingResult: PartialStrategyResult
): number {
  const minimum = getMinimumTaskCount(input, existingResult);
  const featureCount = Array.isArray(existingResult.feature_system)
    ? existingResult.feature_system.length
    : 0;
  const problemCount = Array.isArray(existingResult.problem_analysis)
    ? existingResult.problem_analysis.length
    : 0;
  const complexityBoost = Math.min(6, Math.round(problemCount / 4));
  return Math.max(
    minimum,
    Math.min(36, minimum + Math.round(featureCount * 0.65) + complexityBoost)
  );
}

function normalizeProblemItem(problem: any, index: number, idea: IdeaContext): any {
  const title =
    normalizeWhitespace(problem?.title || '') ||
    `Critical friction in ${idea.productName} workflow ${index + 1}`;

  const detail =
    normalizeWhitespace(
      problem?.deep_description ||
        problem?.detailed_description ||
        problem?.description ||
        ''
    ) ||
    `${idea.targetUsers} hit "${stripIdPrefix(
      title
    )}" while evaluating ${idea.productName}, slowing activation and reducing trust in the solution.`;

  const rootCause =
    normalizeWhitespace(problem?.root_cause || '') ||
    `The current ${idea.projectType} flow lacks a clear, guided path for ${idea.targetUsers}.`;

  const affectedUsers =
    normalizeWhitespace(problem?.affected_users || '') || idea.targetUsers;

  const businessImpact =
    normalizeWhitespace(problem?.business_impact || '') ||
    `Lower conversion and weaker retention because ${stripIdPrefix(
      title
    )} blocks consistent value delivery.`;

  return {
    ...problem,
    id: normalizeId(problem?.id, 'PROB', index),
    title,
    deep_description: detail,
    detailed_description: detail,
    description: detail,
    root_cause: rootCause,
    affected_users: affectedUsers,
    business_impact: businessImpact,
    severity_score: clampScore(problem?.severity_score, 7),
    frequency_score: clampScore(problem?.frequency_score, 6),
  };
}

function normalizeFeatureItem(feature: any, index: number, idea: IdeaContext): any {
  const title =
    normalizeWhitespace(feature?.name || feature?.title || '') ||
    `Feature ${index + 1} for ${idea.productName}`;

  const detail =
    normalizeWhitespace(feature?.detailed_description || feature?.description || '') ||
    `Deliver a focused capability in ${idea.productName} that removes friction for ${idea.targetUsers} and improves task completion speed.`;

  const linkedProblems = toStringArray(
    feature?.linked_problems || feature?.mapped_problem_ids || []
  );

  const normalizedCategory = normalizeWhitespace(feature?.category || '').toLowerCase();
  const category =
    normalizedCategory === 'core' ||
    normalizedCategory === 'advanced' ||
    normalizedCategory === 'optional'
      ? normalizedCategory
      : index < 4
      ? 'core'
      : index < 8
      ? 'advanced'
      : 'optional';

  return {
    ...feature,
    id: normalizeId(feature?.id, 'FEAT', index),
    name: title,
    title,
    category,
    detailed_description: detail,
    description: detail,
    why_needed:
      normalizeWhitespace(feature?.why_needed || '') ||
      `Needed to address user friction around ${stripIdPrefix(
        title
      )} and keep ${idea.productName} outcomes reliable.`,
    linked_problems: linkedProblems,
    mapped_problem_ids: linkedProblems,
    user_value:
      normalizeWhitespace(feature?.user_value || '') ||
      `Lets ${idea.targetUsers} reach outcomes with fewer manual steps.`,
    business_value:
      normalizeWhitespace(feature?.business_value || '') ||
      `Improves activation, retention, and monetization potential for ${idea.productName}.`,
    complexity:
      feature?.complexity === 'Low' ||
      feature?.complexity === 'Medium' ||
      feature?.complexity === 'High'
        ? feature.complexity
        : index % 3 === 0
        ? 'High'
        : index % 2 === 0
        ? 'Medium'
        : 'Low',
    estimated_dev_time:
      normalizeWhitespace(feature?.estimated_dev_time || '') ||
      (index % 3 === 0
        ? '2-3 weeks'
        : index % 2 === 0
        ? '1-2 weeks'
        : '4-7 days'),
  };
}

function normalizeTaskType(value: unknown): string {
  const normalized = normalizeWhitespace(String(value || '')).toLowerCase();
  const allowedTypes = new Set([
    'frontend',
    'backend',
    'ai',
    'devops',
    'design',
    'testing',
    'database',
    'data',
    'security',
    'product',
    'qa',
  ]);
  if (allowedTypes.has(normalized)) {
    return normalized === 'qa' ? 'testing' : normalized;
  }
  return 'backend';
}

function normalizeTaskPriority(value: unknown): 'Critical' | 'High' | 'Medium' | 'Low' {
  const normalized = normalizeWhitespace(String(value || '')).toLowerCase();
  if (normalized === 'critical') return 'Critical';
  if (normalized === 'high') return 'High';
  if (normalized === 'low') return 'Low';
  return 'Medium';
}

function getTaskOwnerRole(type: string): string {
  switch (type) {
    case 'frontend':
      return 'Frontend Engineer';
    case 'backend':
      return 'Backend Engineer';
    case 'ai':
      return 'AI/ML Engineer';
    case 'database':
    case 'data':
      return 'Data Engineer';
    case 'devops':
      return 'DevOps / SRE Engineer';
    case 'design':
      return 'Product Designer';
    case 'testing':
      return 'QA Engineer';
    case 'security':
      return 'Security Engineer';
    case 'product':
      return 'Product Manager';
    default:
      return 'Engineering Owner';
  }
}

function getTaskTechStack(type: string): string[] {
  switch (type) {
    case 'frontend':
      return ['Next.js', 'React', 'Tailwind CSS'];
    case 'backend':
      return ['Next.js Route Handlers', 'Supabase', 'TypeScript'];
    case 'ai':
      return ['Gemini API', 'Prompt orchestration', 'Evaluation harness'];
    case 'database':
    case 'data':
      return ['PostgreSQL', 'Supabase', 'SQL migrations'];
    case 'devops':
      return ['CI/CD', 'Monitoring', 'Runtime observability'];
    case 'design':
      return ['Figma', 'Design system', 'Usability testing'];
    case 'testing':
      return ['Integration testing', 'E2E testing', 'Regression checks'];
    case 'security':
      return ['RBAC policies', 'Audit logging', 'Threat modeling'];
    case 'product':
      return ['Roadmap planning', 'KPIs', 'Experiment design'];
    default:
      return ['TypeScript', 'Supabase', 'Gemini API'];
  }
}

function getDefaultTaskSteps(type: string, title: string, idea: IdeaContext): string[] {
  const generic = [
    `Define implementation scope for "${title}" with clear acceptance criteria.`,
    'Implement production-ready code path with validations and edge-case handling.',
    'Add automated tests and telemetry for success/failure paths.',
    `Document rollout notes and handoff details for ${idea.productName}.`,
  ];

  switch (type) {
    case 'frontend':
      return [
        `Design user flow and UI states for "${title}".`,
        'Implement responsive components and loading/error states.',
        'Connect frontend to typed APIs and track key interaction events.',
        'Verify accessibility, visual consistency, and edge-case behavior.',
      ];
    case 'backend':
      return [
        `Define service contracts and API schema for "${title}".`,
        'Implement endpoints, validation, and robust error handling.',
        'Add persistence/query optimizations and idempotency safeguards.',
        'Add integration tests and observability instrumentation.',
      ];
    case 'ai':
      return [
        `Define prompt strategy and ranking logic for "${title}".`,
        'Implement Gemini orchestration with deterministic fallback handling.',
        'Create evaluation dataset and quality checks for recommendation output.',
        'Instrument latency, token usage, and quality metrics.',
      ];
    case 'database':
    case 'data':
      return [
        `Design schema/events required for "${title}".`,
        'Create migrations, indexes, and retention strategy.',
        'Backfill/seed data and validate integrity constraints.',
        'Add monitoring for data quality and query performance.',
      ];
    case 'devops':
      return [
        `Define deployment and runtime requirements for "${title}".`,
        'Implement CI/CD checks, environment configuration, and secrets handling.',
        'Add logging, metrics, tracing, and alert thresholds.',
        'Run load/failure drills and document response playbooks.',
      ];
    case 'testing':
      return [
        `Define test matrix for "${title}" across happy and edge paths.`,
        'Implement automated API/UI/regression tests with stable fixtures.',
        'Execute manual exploratory tests for critical risk scenarios.',
        'Publish defect report and release sign-off criteria.',
      ];
    default:
      return generic;
  }
}

function normalizeTaskItem(
  task: any,
  index: number,
  idea: IdeaContext,
  featureTitles: string[]
): any {
  const type = normalizeTaskType(task?.type);
  const fallbackFeature = featureTitles[index % Math.max(featureTitles.length, 1)] || 'Core workflow';
  const title =
    normalizeWhitespace(task?.title || '') ||
    `Implement ${fallbackFeature} workflow`;
  const description =
    normalizeWhitespace(task?.description || '') ||
    `Build and validate "${title}" so ${idea.targetUsers} can achieve measurable outcomes in ${idea.productName}.`;
  const detailedSteps = ensureStringList(
    task?.detailed_steps,
    getDefaultTaskSteps(type, title, idea),
    4,
    8
  );
  const deliverables = ensureStringList(
    task?.deliverables,
    [
      `Production-ready implementation for ${title}`,
      'Automated tests and observability coverage',
      'Updated documentation and rollout checklist',
    ],
    2,
    6
  );
  const doneCriteria = ensureStringList(
    task?.done_criteria,
    [
      'Feature passes defined acceptance criteria',
      'No blocking defects in critical user flows',
      'Monitoring/alerts are configured for rollout',
    ],
    2,
    6
  );

  return {
    ...task,
    id:
      normalizeWhitespace(task?.id || '').toUpperCase() ||
      `TASK-${String(index + 1).padStart(3, '0')}`,
    title,
    description,
    why_this_task_matters:
      normalizeWhitespace(task?.why_this_task_matters || '') ||
      `This task directly impacts delivery confidence and user-perceived value for ${idea.productName}.`,
    type,
    owner_role:
      normalizeWhitespace(task?.owner_role || '') || getTaskOwnerRole(type),
    priority: normalizeTaskPriority(task?.priority),
    estimated_time:
      normalizeWhitespace(task?.estimated_time || '') ||
      (type === 'ai' || type === 'backend'
        ? '3-5 days'
        : type === 'frontend'
        ? '2-4 days'
        : '2-3 days'),
    tech_stack: ensureStringList(task?.tech_stack, getTaskTechStack(type), 2, 6),
    linked_features: ensureStringList(
      task?.linked_features,
      [fallbackFeature],
      1,
      5
    ),
    section_dependencies: ensureStringList(
      task?.section_dependencies,
      ['Feature System', 'PRD', 'Timeline', 'Manpower Planning'],
      2,
      6
    ),
    dependencies: ensureStringList(task?.dependencies, [], 0, 8),
    detailed_steps: detailedSteps,
    deliverables: deliverables,
    done_criteria: doneCriteria,
    expected_output:
      normalizeWhitespace(task?.expected_output || '') ||
      deliverables[0],
  };
}

function normalizePrdShape(prd: any): any {
  if (!prd || typeof prd !== 'object') {
    return prd;
  }

  const normalized = { ...prd };
  const productOverview = normalized.product_overview || {};
  const objectives = normalized.objectives_goals || {};
  const targetUsers = normalized.target_users_personas || {};
  const featureRequirements = normalized.features_requirements || {};
  const scope = normalized.scope || {};
  const risksAssumptions = normalized.risks_assumptions || {};

  if (!normalized.vision) {
    normalized.vision =
      productOverview.vision || productOverview.one_line_summary || '';
  }

  if (!normalized.mission) {
    normalized.mission = productOverview.one_line_summary || '';
  }

  if (!normalized.problem_statement) {
    normalized.problem_statement =
      productOverview.problem_statement ||
      normalized.problem_statement_structured ||
      '';
  }

  if (!Array.isArray(normalized.target_users)) {
    normalized.target_users = Array.isArray(targetUsers.user_segments)
      ? targetUsers.user_segments
      : [];
  }

  if (!Array.isArray(normalized.personas)) {
    normalized.personas = Array.isArray(targetUsers.personas)
      ? targetUsers.personas
      : [];
  }

  if (!Array.isArray(normalized.goals_short_term)) {
    normalized.goals_short_term = Array.isArray(objectives.user_goals)
      ? objectives.user_goals
      : [];
  }

  if (!Array.isArray(normalized.goals_long_term)) {
    normalized.goals_long_term = Array.isArray(objectives.business_goals)
      ? objectives.business_goals
      : [];
  }

  if (!Array.isArray(normalized.non_goals)) {
    normalized.non_goals = Array.isArray(scope.out_of_scope) ? scope.out_of_scope : [];
  }

  if (!Array.isArray(normalized.feature_requirements)) {
    normalized.feature_requirements = Array.isArray(
      featureRequirements.functional_requirements
    )
      ? featureRequirements.functional_requirements
      : [];
  }

  if (!Array.isArray(normalized.acceptance_criteria)) {
    const criteria = Array.isArray(prd.acceptance_criteria) ? prd.acceptance_criteria : [];
    normalized.acceptance_criteria = criteria.map((item: any, index: number) => ({
      id: item?.id || `AC-${String(index + 1).padStart(3, '0')}`,
      description:
        item?.description ||
        [item?.given, item?.when, item?.then].filter(Boolean).join(' / '),
      priority: item?.priority || 'Must',
      requirement: item?.then || item?.description || '',
    }));
  }

  if (!Array.isArray(normalized.success_metrics)) {
    const metrics = Array.isArray(prd.success_metrics) ? prd.success_metrics : [];
    normalized.success_metrics = metrics.map((item: any) =>
      typeof item === 'string'
        ? item
        : [item?.metric, item?.target].filter(Boolean).join(': ')
    );
  }

  if (!Array.isArray(normalized.risks)) {
    const riskItems = Array.isArray(risksAssumptions.risks)
      ? risksAssumptions.risks
      : [];
    normalized.risks = riskItems.map((item: any) =>
      [item?.risk, item?.mitigation].filter(Boolean).join(' | mitigation: ')
    );
  }

  if (!Array.isArray(normalized.assumptions)) {
    normalized.assumptions = Array.isArray(risksAssumptions.assumptions)
      ? risksAssumptions.assumptions
      : [];
  }

  if (!Array.isArray(normalized.dependencies)) {
    const dependencyItems = Array.isArray(prd.dependencies) ? prd.dependencies : [];
    normalized.dependencies = dependencyItems.map((item: any) =>
      typeof item === 'string'
        ? item
        : [item?.dependency, item?.type].filter(Boolean).join(' | ')
    );
  }

  return normalized;
}

function ensureMinimumProblemCount(
  problems: any[],
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
): any[] {
  const idea = deriveIdeaContext(normalizedFeedback, existingResult, context);
  const minimum = getMinimumProblemCount(normalizedFeedback);
  const desiredCount = Math.max(minimum, getTargetProblemCount(normalizedFeedback));

  const normalized = (Array.isArray(problems) ? problems : []).map((problem, index) =>
    normalizeProblemItem(problem, index, idea)
  );

  const unique = normalized.filter((problem, index, all) => {
    const key = problem.title.toLowerCase();
    return all.findIndex((item) => item.title.toLowerCase() === key) === index;
  });

  const fallbackBlueprints = [
    'Unclear first-run value for users',
    'Onboarding complexity slows adoption',
    'Core workflow hand-offs are fragmented',
    'Prioritization decisions lack evidence',
    'Retention drops after initial success',
    'Performance variability in high-load moments',
    'Cross-team collaboration is difficult',
    'Reporting does not prove business outcomes',
    'Integration dependencies block workflows',
    'Trust and compliance expectations are underspecified',
    'Pricing and value communication is ambiguous',
    'Operational alerts are reactive instead of preventive',
  ];

  let cursor = unique.length;
  while (unique.length < desiredCount) {
    const title = fallbackBlueprints[cursor % fallbackBlueprints.length];
    const item = normalizeProblemItem(
      {
        id: `PROB-${String(cursor + 1).padStart(3, '0')}`,
        title,
        deep_description: `${idea.targetUsers} experience "${title}" while using ${idea.productName}, reducing confidence and slowing outcomes.`,
        root_cause: `The current ${idea.projectType} flow does not provide enough guardrails and clarity.`,
        affected_users: idea.targetUsers,
        business_impact: 'Activation, retention, and delivery confidence degrade.',
        severity_score: 7,
        frequency_score: 6,
      },
      cursor,
      idea
    );

    if (!unique.some((problem) => problem.title.toLowerCase() === item.title.toLowerCase())) {
      unique.push(item);
    }
    cursor += 1;
  }

  return unique;
}

function ensureMinimumFeatureCount(
  features: any[],
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
): any[] {
  const idea = deriveIdeaContext(normalizedFeedback, existingResult, context);
  const minimum = getMinimumFeatureCount(normalizedFeedback);
  const desiredCount = Math.max(minimum, getTargetFeatureCount(normalizedFeedback));

  const normalized = (Array.isArray(features) ? features : []).map((feature, index) =>
    normalizeFeatureItem(feature, index, idea)
  );

  const unique = normalized.filter((feature, index, all) => {
    const key = (feature.name || '').toLowerCase();
    return all.findIndex((item) => (item.name || '').toLowerCase() === key) === index;
  });

  const normalizedProblems = ensureMinimumProblemCount(
    Array.isArray(existingResult.problem_analysis) ? existingResult.problem_analysis : [],
    normalizedFeedback,
    existingResult,
    context
  );
  const problemSeeds = normalizedProblems.slice(0, Math.max(desiredCount, 10));

  let cursor = unique.length;
  while (unique.length < desiredCount) {
    const seed = problemSeeds[cursor % problemSeeds.length];
    const baseTitle = stripIdPrefix(seed.title || `Problem ${cursor + 1}`);
    const category = cursor < 4 ? 'core' : cursor < 8 ? 'advanced' : 'optional';
    const generatedTitle =
      category === 'core'
        ? `${baseTitle} Workflow`
        : category === 'advanced'
        ? `${baseTitle} Intelligence`
        : `${baseTitle} Optimization`;

    const candidate = normalizeFeatureItem(
      {
        id: `FEAT-${String(cursor + 1).padStart(3, '0')}`,
        name: generatedTitle,
        title: generatedTitle,
        category,
        detailed_description: `Build ${idea.productName} capability to solve "${baseTitle}" for ${idea.targetUsers} with measurable throughput improvements.`,
        why_needed: `Directly addresses ${seed.id}: ${baseTitle}.`,
        linked_problems: [seed.id],
        mapped_problem_ids: [seed.id],
        user_value: `Reduces friction for ${idea.targetUsers} during critical workflows.`,
        business_value: `Improves activation, retention, and ROI clarity for ${idea.productName}.`,
        complexity: category === 'optional' ? 'Low' : category === 'advanced' ? 'High' : 'Medium',
        estimated_dev_time:
          category === 'advanced'
            ? '2-3 weeks'
            : category === 'core'
            ? '1-2 weeks'
            : '4-7 days',
      },
      cursor,
      idea
    );

    if (!unique.some((feature) => feature.name.toLowerCase() === candidate.name.toLowerCase())) {
      unique.push(candidate);
    }
    cursor += 1;
  }

  return unique;
}

function ensureMinimumDevelopmentTaskCount(
  tasks: any[],
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
): any[] {
  const idea = deriveIdeaContext(normalizedFeedback, existingResult, context);
  const normalizedFeatures = ensureMinimumFeatureCount(
    Array.isArray(existingResult.feature_system) ? existingResult.feature_system : [],
    normalizedFeedback,
    existingResult,
    context
  );
  const featureTitles = normalizedFeatures
    .slice(0, 20)
    .map((feature: any) =>
      normalizeWhitespace(
        `${feature?.id || ''} ${stripIdPrefix(feature?.name || feature?.title || '')}`
      )
    )
    .filter(Boolean);

  const minimum = getMinimumTaskCount(normalizedFeedback, existingResult);
  const desiredCount = Math.max(minimum, getTargetTaskCount(normalizedFeedback, existingResult));
  const normalized = (Array.isArray(tasks) ? tasks : []).map((task, index) =>
    normalizeTaskItem(task, index, idea, featureTitles)
  );

  const unique = normalized.filter((task, index, all) => {
    const key = (task.title || '').toLowerCase();
    return all.findIndex((item) => (item.title || '').toLowerCase() === key) === index;
  });

  const timeline = (existingResult.time_estimation || existingResult.time_planning || {}) as any;
  const phaseNames = Array.isArray(timeline?.phases)
    ? timeline.phases
        .map((phase: any) => normalizeWhitespace(phase?.phase_name || ''))
        .filter(Boolean)
    : [];

  const fallbackBlueprints = [
    { title: 'Finalize technical architecture and delivery boundaries', type: 'product', priority: 'Critical' },
    { title: 'Design canonical data model and migration plan', type: 'database', priority: 'Critical' },
    { title: 'Implement authentication, RBAC, and session hardening', type: 'security', priority: 'Critical' },
    { title: 'Build core backend APIs for {feature}', type: 'backend', priority: 'Critical' },
    { title: 'Implement frontend workflow for {feature}', type: 'frontend', priority: 'High' },
    { title: 'Build AI recommendation orchestration for {feature}', type: 'ai', priority: 'High' },
    { title: 'Implement job/market data ingestion and normalization', type: 'data', priority: 'High' },
    { title: 'Create integrations layer for external providers', type: 'backend', priority: 'High' },
    { title: 'Instrument product analytics and event taxonomy', type: 'data', priority: 'High' },
    { title: 'Implement experimentation and model-quality tracking', type: 'ai', priority: 'Medium' },
    { title: 'Add end-to-end and regression test coverage', type: 'testing', priority: 'High' },
    { title: 'Establish release pipeline and environment promotion', type: 'devops', priority: 'High' },
    { title: 'Implement observability, alerting, and incident runbooks', type: 'devops', priority: 'High' },
    { title: 'Perform security review, threat model, and remediation', type: 'security', priority: 'Medium' },
    { title: 'Run launch readiness, UAT, and rollback drills', type: 'testing', priority: 'Medium' },
    { title: 'Post-launch optimization for activation and retention', type: 'product', priority: 'Medium' },
  ];

  let cursor = unique.length;
  while (unique.length < desiredCount) {
    const blueprint = fallbackBlueprints[cursor % fallbackBlueprints.length];
    const featureRef =
      featureTitles[cursor % Math.max(featureTitles.length, 1)] || 'Core product workflow';
    const phaseRef = phaseNames[cursor % Math.max(phaseNames.length, 1)] || 'MVP Build';
    const id = `TASK-${String(cursor + 1).padStart(3, '0')}`;
    const dependencyId =
      cursor > 0 ? `TASK-${String(cursor).padStart(3, '0')}` : undefined;

    const title = blueprint.title.includes('{feature}')
      ? blueprint.title.replace('{feature}', stripIdPrefix(featureRef))
      : blueprint.title;

    const candidate = normalizeTaskItem(
      {
        id,
        title,
        type: blueprint.type,
        priority: blueprint.priority,
        linked_features: [featureRef],
        section_dependencies: ['Feature System', 'PRD', 'Timeline', 'Manpower Planning'],
        dependencies: dependencyId ? [dependencyId] : [],
        why_this_task_matters: `This work enables ${idea.productName} delivery in the ${phaseRef} phase without blocking downstream milestones.`,
      },
      cursor,
      idea,
      featureTitles
    );

    if (!unique.some((task) => task.title.toLowerCase() === candidate.title.toLowerCase())) {
      unique.push(candidate);
    }
    cursor += 1;
  }

  const withReindexedIds = unique.map((task, index) => ({
    ...task,
    __old_id: normalizeWhitespace(task.id || '').toUpperCase(),
    id: `TASK-${String(index + 1).padStart(3, '0')}`,
  }));

  const idMap = new Map<string, string>();
  const titleToIdMap = new Map<string, string>();

  for (const task of withReindexedIds) {
    if (task.__old_id) {
      idMap.set(task.__old_id, task.id);
    }
    titleToIdMap.set((task.title || '').toLowerCase(), task.id);
  }

  return withReindexedIds.map((task) => {
    const dependencies = ensureStringList(task.dependencies, [], 0, 8)
      .map((dependency) => {
        const normalizedDependency = normalizeWhitespace(dependency);
        const upperDependency = normalizedDependency.toUpperCase();
        if (idMap.has(upperDependency)) {
          return idMap.get(upperDependency) as string;
        }
        if (titleToIdMap.has(normalizedDependency.toLowerCase())) {
          return titleToIdMap.get(normalizedDependency.toLowerCase()) as string;
        }
        return upperDependency.startsWith('TASK-') ? upperDependency : normalizedDependency;
      })
      .filter((dependency, index, all) =>
        dependency && dependency !== task.id && all.indexOf(dependency) === index
      )
      .slice(0, 6);

    const normalizedTask = {
      ...task,
      dependencies,
      linked_features: ensureStringList(task.linked_features, featureTitles, 1, 5),
      section_dependencies: ensureStringList(
        task.section_dependencies,
        ['Feature System', 'PRD', 'Timeline', 'Manpower Planning'],
        2,
        6
      ),
    };
    delete (normalizedTask as any).__old_id;
    return normalizedTask;
  });
}

function ensurePrdCompleteness(
  prd: any,
  normalizedFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
): any {
  const idea = deriveIdeaContext(normalizedFeedback, existingResult, context);
  const problems = ensureMinimumProblemCount(
    Array.isArray(existingResult.problem_analysis) ? existingResult.problem_analysis : [],
    normalizedFeedback,
    existingResult,
    context
  );
  const features = ensureMinimumFeatureCount(
    Array.isArray(existingResult.feature_system) ? existingResult.feature_system : [],
    normalizedFeedback,
    existingResult,
    context
  );

  const base = prd && typeof prd === 'object' ? { ...prd } : {};
  const topProblems = problems.slice(0, 6);
  const topFeatures = features.slice(0, 8);
  const featureNames = topFeatures.map((feature) => stripIdPrefix(feature.name));

  const product_overview = {
    ...(base.product_overview || {}),
    product_name:
      normalizeWhitespace(base.product_overview?.product_name || '') || idea.productName,
    one_line_summary:
      normalizeWhitespace(base.product_overview?.one_line_summary || '') ||
      idea.oneLineSummary,
    problem_statement:
      normalizeWhitespace(base.product_overview?.problem_statement || '') ||
      topProblems[0]?.deep_description ||
      `Users need reliable execution support in ${idea.productName}.`,
    vision:
      normalizeWhitespace(base.product_overview?.vision || '') ||
      `Enable ${idea.targetUsers} to execute high-impact work confidently in ${idea.productName}.`,
  };

  const objectives_goals = {
    ...(base.objectives_goals || {}),
    business_goals: ensureStringList(
      base.objectives_goals?.business_goals,
      [
        `Grow active adoption for ${idea.productName}.`,
        'Improve retained weekly usage after onboarding.',
        'Increase delivery confidence with measurable KPI impact.',
      ],
      3
    ),
    user_goals: ensureStringList(
      base.objectives_goals?.user_goals,
      [
        'Complete key workflows with fewer manual steps.',
        'Get clear prioritization guidance from evidence.',
        'Track outcomes and next actions in one place.',
      ],
      3
    ),
    kpis: ensureStringList(
      base.objectives_goals?.kpis,
      [
        'Activation rate (7-day)',
        '8-week retention rate',
        'Median time-to-complete key workflow',
      ],
      3
    ),
  };

  const target_users_personas = {
    ...(base.target_users_personas || {}),
    user_segments: ensureStringList(
      base.target_users_personas?.user_segments,
      [idea.targetUsers, `Primary operators of ${idea.productName}`],
      2
    ),
    personas: (
      Array.isArray(base.target_users_personas?.personas)
        ? base.target_users_personas.personas
        : []
    )
      .map((persona: any, index: number) => ({
        name:
          normalizeWhitespace(persona?.name || '') || `${idea.targetUsers} Persona ${index + 1}`,
        description:
          normalizeWhitespace(persona?.description || '') ||
          `${idea.targetUsers} responsible for delivering outcomes via ${idea.productName}.`,
        goals: ensureStringList(persona?.goals, objectives_goals.user_goals, 2),
        pain_points: ensureStringList(
          persona?.pain_points,
          topProblems.slice(0, 3).map((problem) => stripIdPrefix(problem.title)),
          2
        ),
      }))
      .slice(0, 3),
    key_pain_points: ensureStringList(
      base.target_users_personas?.key_pain_points,
      topProblems.slice(0, 5).map((problem) => stripIdPrefix(problem.title)),
      3
    ),
  };

  if (target_users_personas.personas.length === 0) {
    target_users_personas.personas.push({
      name: `${idea.targetUsers} Power User`,
      description: `${idea.targetUsers} who needs predictable delivery outcomes.`,
      goals: objectives_goals.user_goals.slice(0, 3),
      pain_points: topProblems.slice(0, 3).map((problem) => stripIdPrefix(problem.title)),
    });
  }

  const scope = {
    ...(base.scope || {}),
    in_scope: ensureStringList(base.scope?.in_scope, featureNames.slice(0, 5), 3),
    out_of_scope: ensureStringList(
      base.scope?.out_of_scope,
      [
        'Custom enterprise edge flows not validated in MVP',
        'One-off integrations without repeatable demand',
      ],
      2
    ),
  };

  const features_requirements = {
    ...(base.features_requirements || {}),
    functional_requirements: ensureStringList(
      base.features_requirements?.functional_requirements,
      featureNames.slice(0, 6),
      4
    ),
    non_functional_requirements: {
      ...(base.features_requirements?.non_functional_requirements || {}),
      performance: ensureStringList(
        base.features_requirements?.non_functional_requirements?.performance,
        ['Primary actions complete under 2 seconds', 'Stable response under peak load'],
        2
      ),
      security: ensureStringList(
        base.features_requirements?.non_functional_requirements?.security,
        ['Role-based access control', 'Audit logs for critical actions'],
        2
      ),
      scalability: ensureStringList(
        base.features_requirements?.non_functional_requirements?.scalability,
        ['Support 5x usage growth', 'Background jobs handle burst traffic safely'],
        2
      ),
      reliability: ensureStringList(
        base.features_requirements?.non_functional_requirements?.reliability,
        ['Graceful retry and failure recovery', 'Production monitoring with alerting'],
        2
      ),
    },
  };

  const user_stories = (Array.isArray(base.user_stories) ? base.user_stories : [])
    .map((story: any, index: number) => ({
      id: normalizeWhitespace(story?.id || '') || `US-${String(index + 1).padStart(3, '0')}`,
      story:
        normalizeWhitespace(story?.story || story?.full_statement || '') ||
        `As a ${target_users_personas.user_segments[0]}, I want ${featureNames[index % featureNames.length] || 'a focused workflow'}, so that I can deliver outcomes faster.`,
      benefit:
        normalizeWhitespace(story?.benefit || '') ||
        `I can complete priority work with confidence in ${idea.productName}.`,
    }))
    .slice(0, 6);
  while (user_stories.length < 3) {
    user_stories.push({
      id: `US-${String(user_stories.length + 1).padStart(3, '0')}`,
      story: `As a ${target_users_personas.user_segments[0]}, I want ${
        featureNames[user_stories.length % Math.max(featureNames.length, 1)] || 'guided execution'
      }, so that I can hit goals consistently.`,
      benefit: 'Clear progress and reduced execution risk.',
    });
  }

  const user_flow_journey = (
    Array.isArray(base.user_flow_journey) ? base.user_flow_journey : []
  )
    .map((flow: any) => ({
      entry_point:
        normalizeWhitespace(flow?.entry_point || '') || 'User opens product dashboard',
      actions: ensureStringList(
        flow?.actions,
        ['Review priorities', 'Execute recommended action', 'Confirm outcome'],
        3
      ),
      outcome:
        normalizeWhitespace(flow?.outcome || '') || 'User reaches measurable outcome.',
    }))
    .slice(0, 5);
  while (user_flow_journey.length < 3) {
    user_flow_journey.push({
      entry_point: 'User starts a high-priority task',
      actions: ['Follow guided flow', 'Resolve blockers', 'Complete and review result'],
      outcome: 'Task is completed with tracked impact.',
    });
  }

  const wireframes_mockups = {
    ...(base.wireframes_mockups || {}),
    screens: (Array.isArray(base.wireframes_mockups?.screens)
      ? base.wireframes_mockups.screens
      : []
    )
      .map((screen: any, index: number) => ({
        name:
          normalizeWhitespace(screen?.name || '') ||
          `${featureNames[index % featureNames.length] || 'Core'} Screen`,
        purpose:
          normalizeWhitespace(screen?.purpose || '') ||
          `Help ${idea.targetUsers} execute ${idea.projectType} workflows.`,
        key_elements: ensureStringList(
          screen?.key_elements,
          ['Primary CTA', 'Context panel', 'Progress indicator'],
          3
        ),
      }))
      .slice(0, 6),
    navigation: ensureStringList(
      base.wireframes_mockups?.navigation,
      ['Dashboard -> Priorities -> Workflow -> Results', 'Results -> Follow-up'],
      2
    ),
    layout_ideas: ensureStringList(
      base.wireframes_mockups?.layout_ideas,
      ['Two-column workspace with contextual guidance', 'Card-based prioritized actions'],
      2
    ),
  };
  while (wireframes_mockups.screens.length < 3) {
    wireframes_mockups.screens.push({
      name: `${featureNames[wireframes_mockups.screens.length % Math.max(featureNames.length, 1)] || 'Core'} Screen`,
      purpose: `Support core execution for ${idea.targetUsers}.`,
      key_elements: ['Primary CTA', 'Context panel', 'Progress indicator'],
    });
  }

  const acceptance_criteria = (Array.isArray(base.acceptance_criteria)
    ? base.acceptance_criteria
    : []
  )
    .map((criterion: any, index: number) => ({
      id:
        normalizeWhitespace(criterion?.id || '') || `AC-${String(index + 1).padStart(3, '0')}`,
      given:
        normalizeWhitespace(criterion?.given || '') ||
        `a ${idea.targetUsers} user has valid access`,
      when:
        normalizeWhitespace(criterion?.when || '') ||
        `the user executes ${featureNames[index % featureNames.length] || 'a core action'}`,
      then:
        normalizeWhitespace(criterion?.then || criterion?.description || '') ||
        'the outcome is completed and visibly confirmed',
    }))
    .slice(0, 8);
  while (acceptance_criteria.length < 4) {
    acceptance_criteria.push({
      id: `AC-${String(acceptance_criteria.length + 1).padStart(3, '0')}`,
      given: `a ${idea.targetUsers} user is in the workflow`,
      when: 'the user completes the required steps',
      then: 'the expected result is persisted and recoverable',
    });
  }

  const success_metrics = (
    Array.isArray(base.success_metrics) ? base.success_metrics : []
  ).map((metric: any) =>
    typeof metric === 'string'
      ? { metric, target: 'Defined against baseline', measurement_window: 'First 90 days' }
      : {
          metric: normalizeWhitespace(metric?.metric || '') || 'Activation rate',
          target: normalizeWhitespace(metric?.target || '') || 'Improve by 20%',
          measurement_window:
            normalizeWhitespace(metric?.measurement_window || '') || 'First 90 days',
        }
  );
  while (success_metrics.length < 3) {
    success_metrics.push(
      [
        { metric: 'Activation rate (7-day)', target: '>= 55%', measurement_window: 'First 90 days' },
        { metric: '8-week retention', target: '>= 35%', measurement_window: 'Quarterly review' },
        { metric: 'Workflow completion time', target: 'Reduce by 30%', measurement_window: 'First 60 days' },
      ][success_metrics.length]
    );
  }

  const risks_assumptions = {
    ...(base.risks_assumptions || {}),
    risks: (
      Array.isArray(base.risks_assumptions?.risks) ? base.risks_assumptions.risks : []
    )
      .map((risk: any, index: number) => ({
        risk:
          normalizeWhitespace(risk?.risk || '') ||
          `Risk in ${stripIdPrefix(topProblems[index % topProblems.length]?.title || 'critical workflow')}`,
        impact:
          risk?.impact === 'High' || risk?.impact === 'Medium' || risk?.impact === 'Low'
            ? risk.impact
            : 'Medium',
        mitigation:
          normalizeWhitespace(risk?.mitigation || '') ||
          'Assign owner and monitor leading indicator weekly.',
      }))
      .slice(0, 6),
    assumptions: ensureStringList(
      base.risks_assumptions?.assumptions,
      [
        `${idea.targetUsers} will adopt guided workflows if onboarding is clear.`,
        'Core integration dependencies can be delivered in MVP timelines.',
        'Baseline metrics are available for KPI comparison.',
      ],
      3
    ),
  };
  while (risks_assumptions.risks.length < 3) {
    risks_assumptions.risks.push({
      risk: `Execution risk ${risks_assumptions.risks.length + 1}`,
      impact: risks_assumptions.risks.length === 0 ? 'High' : 'Medium',
      mitigation: 'Track risk in weekly delivery review.',
    });
  }

  const dependencies = (
    Array.isArray(base.dependencies) ? base.dependencies : []
  ).map((dependency: any, index: number) => ({
    dependency:
      normalizeWhitespace(typeof dependency === 'string' ? dependency : dependency?.dependency || '') ||
      `${featureNames[index % featureNames.length] || 'Core feature'} implementation`,
    type: normalizeWhitespace(typeof dependency === 'string' ? '' : dependency?.type || '') || 'Technical',
    owner: normalizeWhitespace(typeof dependency === 'string' ? '' : dependency?.owner || '') || 'Product + Engineering',
    notes: normalizeWhitespace(typeof dependency === 'string' ? '' : dependency?.notes || '') || 'Track readiness before milestone lock.',
  }));
  while (dependencies.length < 3) {
    dependencies.push(
      [
        { dependency: 'Auth and permission baseline', type: 'Platform', owner: 'Engineering', notes: 'Required for MVP launch.' },
        { dependency: 'Data ingestion pipeline', type: 'Data', owner: 'Engineering', notes: 'Needed for KPI instrumentation.' },
        { dependency: 'Monitoring and alerting setup', type: 'Operations', owner: 'DevOps', notes: 'Required for stable release.' },
      ][dependencies.length]
    );
  }

  const timeline_milestones = (
    Array.isArray(base.timeline_milestones) ? base.timeline_milestones : []
  ).map((milestone: any, index: number) => ({
    milestone:
      normalizeWhitespace(milestone?.milestone || '') ||
      ['Discovery complete', 'MVP ready', 'Pilot launch', 'General release'][index % 4],
    target_date: normalizeWhitespace(milestone?.target_date || '') || `Week ${2 + index * 2}`,
    description:
      normalizeWhitespace(milestone?.description || '') || 'Deliver and validate milestone outcomes.',
  }));
  while (timeline_milestones.length < 4) {
    timeline_milestones.push(
      [
        { milestone: 'Discovery complete', target_date: 'Week 2', description: 'Scope and KPI baseline finalized.' },
        { milestone: 'MVP ready', target_date: 'Week 6', description: 'Core flows complete with QA.' },
        { milestone: 'Pilot launch', target_date: 'Week 8', description: 'Pilot cohort live with monitoring.' },
        { milestone: 'General release', target_date: 'Week 12', description: 'Production rollout after validation.' },
      ][timeline_milestones.length]
    );
  }

  const release_plan = {
    ...(base.release_plan || {}),
    phases: (
      Array.isArray(base.release_plan?.phases) ? base.release_plan.phases : []
    ).map((phase: any, index: number) => ({
      name: normalizeWhitespace(phase?.name || '') || ['MVP', 'Growth', 'Scale'][index % 3],
      scope: ensureStringList(phase?.scope, featureNames.slice(index * 3, index * 3 + 3), 2),
      exit_criteria: ensureStringList(
        phase?.exit_criteria,
        ['Critical acceptance criteria pass', 'KPI telemetry is live'],
        2
      ),
    })),
    rollout_strategy:
      normalizeWhitespace(base.release_plan?.rollout_strategy || '') ||
      `Roll out ${idea.productName} in controlled waves: internal, pilot, then broad release.`,
  };
  while (release_plan.phases.length < 3) {
    release_plan.phases.push({
      name: ['MVP', 'Growth', 'Scale'][release_plan.phases.length],
      scope: featureNames.slice(release_plan.phases.length * 3, release_plan.phases.length * 3 + 3),
      exit_criteria: ['Critical acceptance criteria pass', 'Monitoring confirms stability'],
    });
  }

  const completed = {
    ...base,
    product_overview,
    objectives_goals,
    target_users_personas,
    problem_statement_structured:
      normalizeWhitespace(base.problem_statement_structured || '') ||
      `${idea.targetUsers} face ${stripIdPrefix(
        topProblems[0]?.title || 'critical execution blockers'
      )} because workflows are fragmented, leading to slower outcomes.`,
    scope,
    features_requirements,
    user_stories,
    user_flow_journey,
    wireframes_mockups,
    acceptance_criteria,
    success_metrics,
    risks_assumptions,
    dependencies,
    timeline_milestones,
    release_plan,
    constraints: ensureStringList(
      base.constraints,
      [
        'Gemini free-tier only for generation paths',
        'Section-on-demand generation only',
        'Per-section token budgets must remain bounded',
      ],
      3
    ),
    compliance_legal: ensureStringList(
      base.compliance_legal,
      [
        'Privacy and data retention requirements documented',
        'Terms, consent, and audit logging requirements documented',
      ],
      2
    ),
    stakeholders: (
      Array.isArray(base.stakeholders) ? base.stakeholders : []
    ).map((stakeholder: any, index: number) => ({
      name_or_role:
        normalizeWhitespace(stakeholder?.name_or_role || stakeholder?.name || '') ||
        ['Product Manager', 'Engineering Lead', 'Design Lead'][index % 3],
      interest:
        normalizeWhitespace(stakeholder?.interest || '') ||
        `Ensure ${idea.productName} delivers measurable user outcomes.`,
      responsibility:
        normalizeWhitespace(stakeholder?.responsibility || '') ||
        'Own delivery quality and release decisions.',
    })),
    open_questions: ensureStringList(
      base.open_questions,
      [
        `Which ${idea.targetUsers} segment should receive the first rollout?`,
        'Which KPI threshold should gate full launch?',
        'Which integrations are mandatory for phase one?',
      ],
      3
    ),
    appendix: {
      ...(base.appendix || {}),
      research_assumptions: ensureStringList(
        base.appendix?.research_assumptions,
        [
          `${idea.targetUsers} prioritize time-to-value over broad feature depth in MVP.`,
          'Onboarding clarity is a top predictor of retention in early cohorts.',
        ],
        2
      ),
      competitor_notes: ensureStringList(
        base.appendix?.competitor_notes,
        [
          'Competitors often provide fragmented workflows with weak prioritization support.',
          'Many alternatives lack strong KPI traceability for product teams.',
        ],
        2
      ),
      references: ensureStringList(
        base.appendix?.references,
        ['Project input provided by user', 'PMCopilot generated analysis context'],
        2
      ),
    },
  };

  if (!Array.isArray(completed.stakeholders) || completed.stakeholders.length < 3) {
    completed.stakeholders = [
      { name_or_role: 'Product Manager', interest: 'Outcome quality', responsibility: 'Define scope and KPIs' },
      { name_or_role: 'Engineering Lead', interest: 'Reliability', responsibility: 'Own technical delivery' },
      { name_or_role: 'Design Lead', interest: 'Usability', responsibility: 'Own journey quality' },
    ];
  }

  completed.vision = completed.vision || product_overview.vision;
  completed.mission = completed.mission || product_overview.one_line_summary;
  completed.problem_statement = completed.problem_statement || product_overview.problem_statement;
  completed.target_users = completed.target_users || target_users_personas.user_segments;
  completed.personas = completed.personas || target_users_personas.personas;
  completed.goals_short_term = completed.goals_short_term || objectives_goals.user_goals;
  completed.goals_long_term = completed.goals_long_term || objectives_goals.business_goals;
  completed.non_goals = completed.non_goals || scope.out_of_scope;
  completed.feature_requirements =
    completed.feature_requirements || features_requirements.functional_requirements;
  completed.risks =
    completed.risks ||
    risks_assumptions.risks.map((risk: any) => `${risk.risk} | mitigation: ${risk.mitigation}`);
  completed.assumptions = completed.assumptions || risks_assumptions.assumptions;
  completed.compliance = completed.compliance || completed.compliance_legal;

  return normalizePrdShape(completed);
}

function isPrdComplete(prd: any): boolean {
  if (!prd || typeof prd !== 'object') {
    return false;
  }

  const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;
  const hasText = (value: unknown) => isNonEmptyString(value);

  return Boolean(
    hasText(prd.product_overview?.product_name) &&
      hasText(prd.product_overview?.problem_statement) &&
      hasItems(prd.objectives_goals?.business_goals) &&
      hasItems(prd.target_users_personas?.user_segments) &&
      hasText(prd.problem_statement_structured) &&
      hasItems(prd.scope?.in_scope) &&
      hasItems(prd.features_requirements?.functional_requirements) &&
      hasItems(prd.user_stories) &&
      hasItems(prd.user_flow_journey) &&
      hasItems(prd.wireframes_mockups?.screens) &&
      hasItems(prd.acceptance_criteria) &&
      hasItems(prd.success_metrics) &&
      hasItems(prd.risks_assumptions?.risks) &&
      hasItems(prd.risks_assumptions?.assumptions) &&
      hasItems(prd.dependencies) &&
      hasItems(prd.timeline_milestones) &&
      hasItems(prd.release_plan?.phases) &&
      hasItems(prd.constraints) &&
      hasItems(prd.compliance_legal) &&
      hasItems(prd.stakeholders) &&
      hasItems(prd.open_questions) &&
      hasItems(prd.appendix?.research_assumptions) &&
      hasItems(prd.appendix?.competitor_notes) &&
      hasItems(prd.appendix?.references)
  );
}

function hasMinimumProblemQuality(result: PartialStrategyResult): boolean {
  const problems = Array.isArray(result.problem_analysis) ? result.problem_analysis : [];
  const minimum = getMinimumProblemCount(String(result.metadata?.source_input || ''));
  if (problems.length < minimum) {
    return false;
  }

  return problems.slice(0, minimum).every((problem) => {
    return (
      isNonEmptyString(problem?.title) &&
      isNonEmptyString(problem?.deep_description || problem?.description) &&
      isNonEmptyString(problem?.root_cause) &&
      isNonEmptyString(problem?.affected_users) &&
      isNonEmptyString(problem?.business_impact)
    );
  });
}

function hasMinimumFeatureQuality(result: PartialStrategyResult): boolean {
  const features = Array.isArray(result.feature_system) ? result.feature_system : [];
  const minimum = getMinimumFeatureCount(String(result.metadata?.source_input || ''));
  if (features.length < minimum) {
    return false;
  }

  return features.slice(0, minimum).every((feature) => {
    return (
      isNonEmptyString(feature?.name || feature?.title) &&
      isNonEmptyString(feature?.detailed_description || feature?.description) &&
      isNonEmptyString(feature?.why_needed) &&
      isNonEmptyString(feature?.user_value) &&
      isNonEmptyString(feature?.business_value)
    );
  });
}

export async function generateOverviewAnalysis(
  rawFeedback: string,
  context?: GenerationContext
): Promise<{ result: PartialStrategyResult; provider: 'gemini' }> {
  const startedAt = Date.now();
  const analysisId = context?.analysisId;
  const normalizedFeedback = normalizeInput(rawFeedback);
  const messages = getOverviewPrompt(normalizedFeedback, context);

  logger.info('Generating lightweight overview with Gemini', {
    analysisId,
    feedbackLength: normalizedFeedback.length,
    depth: getDepth(context),
    model: config.gemini.model,
  });

  const { content, provider } = await generateGeminiContent(messages, {
    jsonMode: true,
    maxTokens: getSectionTokenBudget('overview', context),
    timeout: context?.timeout || AI_CONFIG.GEMINI.TIMEOUT,
  });

  const parsed = safeParseJSON<any>(content);
  const result = createEmptyResult(normalizedFeedback, context, analysisId);

  result.executive_dashboard = normalizeExecutiveDashboard(
    parsed.executive_dashboard,
    normalizedFeedback,
    result,
    context
  );
  result.overview_summary = parsed.overview_summary || parsed.overview || null;

  stampMetadata(result, OVERVIEW_SECTION_IDS, provider, Date.now() - startedAt);

  if (context?.inputHash) {
    const sectionInputHashes = {
      ...(result.metadata.section_input_hashes as Record<string, string> | undefined),
      overview: context.inputHash,
      'executive-dashboard': context.inputHash,
    };
    result.metadata.section_input_hashes = sectionInputHashes;
    result.metadata.input_hash = context.inputHash;
  }

  return { result, provider };
}

export async function generateDeferredStrategySection(
  section: DeferredStrategySection,
  rawFeedback: string,
  existingResult: PartialStrategyResult,
  context?: GenerationContext
): Promise<{ result: PartialStrategyResult; provider: 'gemini' }> {
  const startedAt = Date.now();
  const normalizedFeedback = normalizeInput(rawFeedback);
  const messages = getDeferredSectionPrompt(
    section,
    normalizedFeedback,
    existingResult,
    context
  );
  const { content, provider } = await generateGeminiContent(messages, {
    jsonMode: true,
    maxTokens: getSectionTokenBudget(section, context),
    timeout: context?.timeout || AI_CONFIG.GEMINI.TIMEOUT,
  });

  const parsed = safeParseJSON<any>(content);
  const result: PartialStrategyResult = {
    ...existingResult,
    metadata: {
      ...existingResult.metadata,
      source_input: normalizedFeedback,
    },
  };

  switch (section) {
    case 'problem-analysis':
      result.problem_analysis = ensureMinimumProblemCount(
        parsed.problem_analysis || [],
        normalizedFeedback,
        existingResult,
        context
      );
      break;
    case 'feature-system':
      result.feature_system = ensureMinimumFeatureCount(
        parsed.feature_system || [],
        normalizedFeedback,
        existingResult,
        context
      );
      result.feature_strategy = parsed.feature_strategy || null;
      break;
    case 'gaps-opportunities':
      result.gaps_opportunities = parsed.gaps_opportunities;
      break;
    case 'prd':
      result.prd = ensurePrdCompleteness(
        normalizePrdShape(parsed.prd),
        normalizedFeedback,
        existingResult,
        context
      );
      break;
    case 'system-design':
      result.system_design = parsed.system_design;
      break;
    case 'development-tasks':
      result.development_tasks = ensureMinimumDevelopmentTaskCount(
        parsed.development_tasks || [],
        normalizedFeedback,
        result,
        context
      );
      break;
    case 'execution-roadmap':
      result.execution_roadmap = parsed.execution_roadmap;
      break;
    case 'manpower-planning':
      result.manpower_planning = normalizeManpowerPlanning(
        parsed.manpower_planning,
        normalizedFeedback,
        result,
        context
      );
      break;
    case 'resources':
      result.resource_requirements = parsed.resource_requirements;
      break;
    case 'cost-estimation':
      result.cost_estimation = normalizeCostEstimation(
        parsed.cost_estimation,
        normalizedFeedback,
        result,
        context
      );
      result.cost_planning = result.cost_estimation;
      break;
    case 'timeline':
      result.time_estimation = normalizeTimelineEstimation(
        parsed.time_estimation,
        normalizedFeedback,
        result,
        context
      );
      result.time_planning = result.time_estimation;
      break;
    case 'impact-analysis':
      result.impact_analysis = {
        ...(parsed.impact_analysis || {}),
        user_impact_score: normalizeTenPointScore(
          parsed.impact_analysis?.user_impact_score,
          7.2
        ),
        business_impact_score: normalizeTenPointScore(
          parsed.impact_analysis?.business_impact_score,
          7.1
        ),
        confidence_score: normalizeConfidenceScore(
          parsed.impact_analysis?.confidence_score,
          0.68
        ),
      };
      break;
  }

  stampMetadata(result, [section], provider, Date.now() - startedAt);

  if (context?.inputHash) {
    const sectionInputHashes = {
      ...(result.metadata.section_input_hashes as Record<string, string> | undefined),
      [section]: context.inputHash,
    };
    result.metadata.section_input_hashes = sectionInputHashes;
    result.metadata.input_hash = context.inputHash;
    const staleSections = Array.isArray(result.metadata.stale_sections)
      ? result.metadata.stale_sections
      : [];
    result.metadata.stale_sections = staleSections.filter(
      (staleSection: string) => staleSection !== section
    );
  }

  return { result, provider };
}

export function isSectionAlreadyGenerated(
  result: PartialStrategyResult | null | undefined,
  section: StrategySectionId
): boolean {
  if (!result) {
    return false;
  }

  if (section === 'overview') {
    return !!result.executive_dashboard || !!result.overview_summary;
  }

  if (section === 'executive-dashboard') {
    return !!result.executive_dashboard;
  }

  if (
    section === 'problem-analysis' &&
    Array.isArray(result.problem_analysis) &&
    result.problem_analysis.length > 0
  ) {
    return hasMinimumProblemQuality(result);
  }

  if (
    section === 'feature-system' &&
    Array.isArray(result.feature_system) &&
    result.feature_system.length > 0
  ) {
    return hasMinimumFeatureQuality(result);
  }

  if (section === 'prd' && result.prd) {
    return isPrdComplete(result.prd);
  }

  return !!result.metadata?.generated_sections?.includes(section);
}
