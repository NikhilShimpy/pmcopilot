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
    'development-tasks': 1100,
    'execution-roadmap': 900,
    'manpower-planning': 850,
    resources: 850,
    'cost-estimation': 950,
    timeline: 850,
    'impact-analysis': 850,
  },
  medium: {
    overview: 900,
    'problem-analysis': 1700,
    'feature-system': 2200,
    'gaps-opportunities': 1100,
    prd: 3200,
    'system-design': 1200,
    'development-tasks': 1450,
    'execution-roadmap': 1200,
    'manpower-planning': 1050,
    resources: 1050,
    'cost-estimation': 1250,
    timeline: 1050,
    'impact-analysis': 1050,
  },
  long: {
    overview: 1100,
    'problem-analysis': 2200,
    'feature-system': 3000,
    'gaps-opportunities': 1300,
    prd: 3800,
    'system-design': 1500,
    'development-tasks': 1850,
    'execution-roadmap': 1450,
    'manpower-planning': 1250,
    resources: 1250,
    'cost-estimation': 1550,
    timeline: 1250,
    'impact-analysis': 1250,
  },
  'extra-long': {
    overview: 1300,
    'problem-analysis': 2600,
    'feature-system': 3600,
    'gaps-opportunities': 1600,
    prd: 4000,
    'system-design': 1800,
    'development-tasks': 2200,
    'execution-roadmap': 1750,
    'manpower-planning': 1450,
    resources: 1450,
    'cost-estimation': 1850,
    timeline: 1450,
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
  'development-tasks': 3400,
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

  if (section === 'resources' || section === 'cost-estimation') {
    seed.system_design = result.system_design || null;
    seed.manpower_planning = result.manpower_planning || null;
  }

  if (
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
      "type": "frontend" | "backend" | "ai" | "devops" | "design" | "testing" | "database",
      "priority": "Critical" | "High" | "Medium" | "Low",
      "estimated_time": string,
      "tech_stack": string[],
      "dependencies": string[],
      "detailed_steps": string[],
      "expected_output": string
    }
  ]
}

Generate 14-24 realistic tasks with clear sequencing.`,
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

  result.executive_dashboard = parsed.executive_dashboard;
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
      result.development_tasks = parsed.development_tasks || [];
      break;
    case 'execution-roadmap':
      result.execution_roadmap = parsed.execution_roadmap;
      break;
    case 'manpower-planning':
      result.manpower_planning = parsed.manpower_planning;
      break;
    case 'resources':
      result.resource_requirements = parsed.resource_requirements;
      break;
    case 'cost-estimation':
      result.cost_estimation = parsed.cost_estimation;
      result.cost_planning = parsed.cost_estimation;
      break;
    case 'timeline':
      result.time_estimation = parsed.time_estimation;
      result.time_planning = parsed.time_estimation;
      break;
    case 'impact-analysis':
      result.impact_analysis = parsed.impact_analysis;
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
