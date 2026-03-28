import { AI_CONFIG } from '@/utils/constants';
import { generateGeminiContent, GeminiMessage } from './geminiSectionClient';
import { logger } from './logger';
import { config } from './config';
import {
  AnalysisMetadata,
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
    'problem-analysis': 900,
    'feature-system': 950,
    'gaps-opportunities': 850,
    prd: 1300,
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
    'problem-analysis': 1200,
    'feature-system': 1350,
    'gaps-opportunities': 1100,
    prd: 1700,
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
    'problem-analysis': 1500,
    'feature-system': 1750,
    'gaps-opportunities': 1300,
    prd: 2200,
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
    'problem-analysis': 1800,
    'feature-system': 2100,
    'gaps-opportunities': 1600,
    prd: 2600,
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
    "recommended_strategy": string
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
      "root_cause": string,
      "affected_users": string,
      "business_impact": string,
      "severity_score": number,
      "frequency_score": number
    }
  ]
}

Rules:
- Generate 6-12 problems tied directly to the input idea.
- Keep each item specific and non-generic.`,
    'feature-system': `Return valid JSON:
{
  "feature_system": [
    {
      "id": "FEAT-001",
      "name": string,
      "category": "core" | "advanced" | "optional",
      "detailed_description": string,
      "why_needed": string,
      "linked_problems": string[],
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
- For meaningful product inputs, generate 10-16 features minimum.
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
        "monthly_cost_inr": number
      }
    ],
    "total_team_size": number,
    "total_monthly_cost_inr": number,
    "hiring_plan": string
  }
}`,
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
    "scale_version": { "description": string, "annual_cost": number }
  }
}

Use INR and keep numbers internally consistent.`,
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
    "critical_path": string[]
  }
}`,
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

function ensureMinimumFeatureCount(
  features: any[],
  normalizedFeedback: string,
  existingResult: PartialStrategyResult
): any[] {
  const current = Array.isArray(features) ? [...features] : [];
  const minimum = normalizedFeedback.length >= 120 ? 10 : 8;

  if (current.length >= minimum) {
    return current;
  }

  const problemSeeds = trimArray(existingResult.problem_analysis, minimum).map((problem) => ({
    title: problem.title || 'Critical user workflow issue',
    description: problem.deep_description || problem.description || '',
    id: problem.id || 'PROB',
  }));

  let cursor = current.length + 1;
  while (current.length < minimum) {
    const seed = problemSeeds[current.length % Math.max(problemSeeds.length, 1)] || {
      title: 'Core workflow gap',
      description: trimText(normalizedFeedback, 180),
      id: 'PROB',
    };

    current.push({
      id: `FEAT-${String(cursor).padStart(3, '0')}`,
      name: `Capability for ${seed.title.replace(/^([A-Z0-9-]+\s*[:\-]\s*)/i, '')}`,
      category: cursor <= 5 ? 'core' : cursor <= 10 ? 'advanced' : 'optional',
      detailed_description:
        seed.description ||
        `Implement targeted capability to solve: ${seed.title}.`,
      why_needed: `Directly addresses ${seed.id}: ${seed.title}.`,
      linked_problems: [seed.id],
      user_value: 'Reduces friction in critical user flow.',
      business_value: 'Improves activation and retention outcomes.',
      complexity: cursor % 3 === 0 ? 'High' : cursor % 2 === 0 ? 'Medium' : 'Low',
      estimated_dev_time:
        cursor % 3 === 0 ? '2-3 weeks' : cursor % 2 === 0 ? '1-2 weeks' : '4-7 days',
    });

    cursor += 1;
  }

  return current;
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
      result.problem_analysis = parsed.problem_analysis || [];
      break;
    case 'feature-system':
      result.feature_system = ensureMinimumFeatureCount(
        parsed.feature_system || [],
        normalizedFeedback,
        existingResult
      );
      result.feature_strategy = parsed.feature_strategy || null;
      break;
    case 'gaps-opportunities':
      result.gaps_opportunities = parsed.gaps_opportunities;
      break;
    case 'prd':
      result.prd = normalizePrdShape(parsed.prd);
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
    return true;
  }

  if (
    section === 'feature-system' &&
    Array.isArray(result.feature_system) &&
    result.feature_system.length > 0
  ) {
    return true;
  }

  return !!result.metadata?.generated_sections?.includes(section);
}
