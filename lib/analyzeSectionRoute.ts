import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { createServerSupabaseClient, getUserOrAnonymous } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { analysisEngineService } from '@/services/analysis-engine.service';
import { handleError, successResponse, throwValidationError } from '@/lib/errorHandler';
import {
  DEFERRED_STRATEGY_SECTIONS,
  generateDeferredStrategySection,
  isSectionAlreadyGenerated,
  PartialStrategyResult,
} from '@/lib/sectionedStrategyEngine';
import { DB_TABLES } from '@/utils/constants';
import { isValidUUID } from '@/utils/helpers';
import { StrategySectionId } from '@/types/comprehensive-strategy';

type DeferredRouteSection = (typeof DEFERRED_STRATEGY_SECTIONS)[number];

const VALID_SECTIONS: StrategySectionId[] = [
  'overview',
  'executive-dashboard',
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

const SECTION_ALIAS_MAP: Record<string, StrategySectionId> = {
  overview: 'overview',
  all: 'overview',
  'executive-dashboard': 'executive-dashboard',
  dashboard: 'executive-dashboard',
  'problem-analysis': 'problem-analysis',
  problems: 'problem-analysis',
  'feature-system': 'feature-system',
  features: 'feature-system',
  feature: 'feature-system',
  'gaps-opportunities': 'gaps-opportunities',
  gaps: 'gaps-opportunities',
  opportunities: 'gaps-opportunities',
  prd: 'prd',
  'product-requirements': 'prd',
  'product-requirements-document': 'prd',
  'system-design': 'system-design',
  architecture: 'system-design',
  'development-tasks': 'development-tasks',
  tasks: 'development-tasks',
  'execution-roadmap': 'execution-roadmap',
  roadmap: 'execution-roadmap',
  'manpower-planning': 'manpower-planning',
  manpower: 'manpower-planning',
  resources: 'resources',
  'cost-estimation': 'cost-estimation',
  cost: 'cost-estimation',
  timeline: 'timeline',
  'impact-analysis': 'impact-analysis',
  impact: 'impact-analysis',
};

function normalizeInput(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function getInputHash(input: string): string {
  return createHash('sha256').update(normalizeInput(input)).digest('hex');
}

function uniqSections(sections: StrategySectionId[]): StrategySectionId[] {
  return Array.from(new Set(sections));
}

function resolveSection(raw: unknown): StrategySectionId | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return SECTION_ALIAS_MAP[normalized] || null;
}

function getSectionData(result: PartialStrategyResult, section: StrategySectionId): unknown {
  switch (section) {
    case 'overview':
      return {
        executive_dashboard: result.executive_dashboard || null,
        overview_summary: (result as any).overview_summary || null,
      };
    case 'executive-dashboard':
      return result.executive_dashboard || null;
    case 'problem-analysis':
      return result.problem_analysis || [];
    case 'feature-system':
      return result.feature_system || [];
    case 'gaps-opportunities':
      return result.gaps_opportunities || null;
    case 'prd':
      return result.prd || null;
    case 'system-design':
      return result.system_design || null;
    case 'development-tasks':
      return result.development_tasks || [];
    case 'execution-roadmap':
      return result.execution_roadmap || null;
    case 'manpower-planning':
      return result.manpower_planning || null;
    case 'resources':
      return result.resource_requirements || null;
    case 'cost-estimation':
      return result.cost_estimation || null;
    case 'timeline':
      return result.time_estimation || result.time_planning || null;
    case 'impact-analysis':
      return result.impact_analysis || null;
    default:
      return null;
  }
}

function clearDeferredSectionData(result: PartialStrategyResult): PartialStrategyResult {
  const next: PartialStrategyResult = {
    ...result,
    metadata: {
      ...result.metadata,
    },
  };

  delete next.problem_analysis;
  delete next.feature_system;
  delete next.gaps_opportunities;
  delete next.prd;
  delete next.system_design;
  delete next.development_tasks;
  delete next.execution_roadmap;
  delete next.manpower_planning;
  delete next.resource_requirements;
  delete next.cost_estimation;
  delete next.cost_planning;
  delete next.time_estimation;
  delete next.time_planning;
  delete next.impact_analysis;
  delete (next as any).feature_strategy;

  return next;
}

function buildSuccessPayload(
  analysisId: string,
  section: StrategySectionId,
  provider: string,
  result: PartialStrategyResult,
  generated: boolean,
  fromCache: boolean
) {
  return {
    analysis_id: analysisId,
    section,
    provider,
    generated,
    from_cache: fromCache,
    section_data: getSectionData(result, section),
    result,
  };
}

type HandleSectionRouteOptions = {
  analysisIdFromPath?: string;
  routePath?: string;
};

export async function handleAnalyzeSectionRequest(
  request: NextRequest,
  options: HandleSectionRouteOptions = {}
) {
  const requestId = request.headers.get('X-Request-Id') || `section-${Date.now()}`;
  const routePath = options.routePath || '/api/analyze/[id]/section';

  try {
    logger.apiRequest('POST', routePath);

    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const analysisIdFromBody =
      typeof body.analysis_id === 'string' ? body.analysis_id.trim() : '';
    const analysisId = options.analysisIdFromPath || analysisIdFromBody;

    if (!analysisId || !isValidUUID(analysisId)) {
      throwValidationError('Invalid analysis ID format');
    }

    const section = resolveSection(body.section);
    if (!section || !VALID_SECTIONS.includes(section)) {
      throwValidationError('Invalid section requested');
    }

    const supabase = await createServerSupabaseClient();
    const user = await getUserOrAnonymous();

    if (user.id === 'anonymous') {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: analysis, error } = await supabase
      .from(DB_TABLES.ANALYSES)
      .select('id, project_id, result, projects!inner(user_id)')
      .eq('id', analysisId)
      .eq('projects.user_id', user.id)
      .single();

    if (error || !analysis) {
      return new Response(
        JSON.stringify({ success: false, error: 'Analysis not found or access denied' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let currentResult = (analysis.result || {}) as PartialStrategyResult;
    if (!currentResult.metadata) {
      currentResult.metadata = {
        analysis_id: analysisId,
        created_at: new Date().toISOString(),
        processing_time_ms: 0,
        model_used: 'gemini',
        input_length: 0,
      } as any;
    }

    const requestedFeedback =
      typeof body.feedback === 'string' ? normalizeInput(body.feedback) : '';
    const storedFeedback = normalizeInput(currentResult.metadata?.source_input || '');
    const rawFeedback = requestedFeedback || storedFeedback;

    if (!rawFeedback.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Original input not found for this analysis. Start a new analysis from the project input page.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const force = body.force === true;
    const inputHash = getInputHash(rawFeedback);
    const existingInputHash = currentResult.metadata?.input_hash as string | undefined;
    const inputChanged = !!existingInputHash && existingInputHash !== inputHash;

    if (inputChanged) {
      const previousGeneratedSections = Array.isArray(currentResult.metadata?.generated_sections)
        ? (currentResult.metadata.generated_sections as StrategySectionId[])
        : [];

      const staleDeferredSections = previousGeneratedSections.filter((item) =>
        DEFERRED_STRATEGY_SECTIONS.includes(item as DeferredRouteSection)
      );

      currentResult = clearDeferredSectionData(currentResult);
      currentResult.metadata = {
        ...currentResult.metadata,
        source_input: rawFeedback,
        input_hash: inputHash,
        stale_sections: uniqSections([
          ...((Array.isArray(currentResult.metadata?.stale_sections)
            ? (currentResult.metadata.stale_sections as StrategySectionId[])
            : []) || []),
          ...staleDeferredSections,
        ]),
        generated_sections: (currentResult.metadata?.generated_sections || []).filter(
          (item: string) => !DEFERRED_STRATEGY_SECTIONS.includes(item as DeferredRouteSection)
        ),
        section_input_hashes: {
          ...(currentResult.metadata?.section_input_hashes as
            | Record<string, string>
            | undefined),
        },
      };
    }

    const deferredSet = new Set<StrategySectionId>([...DEFERRED_STRATEGY_SECTIONS]);
    const isDeferred = deferredSet.has(section);

    if (!isDeferred) {
      if (inputChanged) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              'The project input changed. Please regenerate the overview from the main Generate action before requesting overview sections.',
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      logger.info('Returning cached non-deferred section', {
        requestId,
        analysisId,
        section,
      });

      return successResponse(
        buildSuccessPayload(
          analysisId,
          section,
          currentResult.metadata?.section_providers?.[section] ||
            currentResult.metadata?.provider ||
            'gemini',
          currentResult,
          false,
          true
        )
      );
    }

    const sectionInputHashes =
      (currentResult.metadata?.section_input_hashes as Record<string, string> | undefined) || {};
    const staleSections = Array.isArray(currentResult.metadata?.stale_sections)
      ? (currentResult.metadata.stale_sections as StrategySectionId[])
      : [];
    const sectionAlreadyFresh =
      isSectionAlreadyGenerated(currentResult, section) &&
      sectionInputHashes[section] === inputHash &&
      !staleSections.includes(section);

    if (!force && sectionAlreadyFresh) {
      logger.info('Returning cached deferred section', {
        requestId,
        analysisId,
        section,
      });

      return successResponse(
        buildSuccessPayload(
          analysisId,
          section,
          currentResult.metadata?.section_providers?.[section] ||
            currentResult.metadata?.provider ||
            'gemini',
          currentResult,
          false,
          true
        )
      );
    }

    logger.info('Generating deferred Gemini section', {
      requestId,
      analysisId,
      section,
      inputChanged,
      force,
    });

    const generated = await generateDeferredStrategySection(
      section as DeferredRouteSection,
      rawFeedback,
      currentResult,
      {
        project_id: analysis.project_id,
        project_name:
          (typeof body.context === 'object' &&
          body.context &&
          typeof (body.context as any).project_name === 'string'
            ? (body.context as any).project_name
            : undefined) || currentResult.metadata?.project_context,
        project_context:
          (typeof body.context === 'object' &&
          body.context &&
          typeof (body.context as any).project_context === 'string'
            ? (body.context as any).project_context
            : undefined) || currentResult.metadata?.project_context,
        user_persona:
          typeof body.context === 'object' && body.context
            ? (body.context as any).user_persona
            : undefined,
        industry:
          typeof body.context === 'object' && body.context
            ? (body.context as any).industry
            : undefined,
        product_type:
          typeof body.context === 'object' && body.context
            ? (body.context as any).product_type
            : undefined,
        depth:
          (typeof body.detail_level === 'string' ? body.detail_level : undefined) ||
          currentResult.metadata?.detail_level,
        timeout: 60000,
        inputHash,
      }
    );

    generated.result.metadata = {
      ...generated.result.metadata,
      saved_analysis_id: analysisId,
      source_input: rawFeedback,
      input_hash: inputHash,
      stale_sections: (
        Array.isArray(generated.result.metadata?.stale_sections)
          ? generated.result.metadata.stale_sections
          : []
      ).filter((stale: string) => stale !== section),
    };

    const updated = await analysisEngineService.updateAnalysisResult(
      supabase as any,
      analysisId,
      analysis.project_id,
      generated.result
    );

    if (!updated) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to persist generated section' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return successResponse(
      buildSuccessPayload(
        analysisId,
        section,
        generated.provider,
        generated.result,
        true,
        false
      )
    );
  } catch (error) {
    logger.apiResponse('POST', routePath, 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleError(error);
  }
}
