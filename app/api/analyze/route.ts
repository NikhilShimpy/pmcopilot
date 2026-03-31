/**
 * PMCopilot - Enhanced Comprehensive Analysis API
 *
 * POST /api/analyze - Run comprehensive AI feedback analysis
 * GET /api/analyze - Get analysis history
 *
 * Supports depth control: short, medium, long, extra-long
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { createServerSupabaseClient, getUserOrAnonymous } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  handleError,
  successResponse,
  validateRequired,
  throwValidationError,
} from '@/lib/errorHandler';
import { generateOverviewAnalysis } from '@/lib/sectionedStrategyEngine';
import { assertGeminiFreeTierConfig, config } from '@/lib/config';
import { PipelineContext } from '@/types/analysis';
import { SUCCESS_MESSAGES, DB_TABLES, VALIDATION } from '@/utils/constants';
import { isValidUUID } from '@/utils/helpers';
import {
  buildResultFromSections,
  ensureAnalysisSession,
  syncAnalysisSessionProgress,
  upsertAnalysisSectionsFromResult,
} from '@/lib/analysisSessionStore';

// Depth configuration for output control
type OutputDepth = 'short' | 'medium' | 'long' | 'extra-long';

const DEPTH_CONFIG: Record<OutputDepth, {
  minProblems: number;
  aimProblems: number;
  minFeatures: number;
  aimFeatures: number;
  minTasks: number;
  aimTasks: number;
  descriptionLength: string;
  timeout: number;
  maxTokens: number; // NEW: Control output token limit
}> = {
  short: {
    minProblems: 5,
    aimProblems: 8,
    minFeatures: 8,
    aimFeatures: 12,
    minTasks: 10,
    aimTasks: 15,
    descriptionLength: 'concise (50-100 words per section)',
    timeout: 45000,
    maxTokens: 1000,
  },
  medium: {
    minProblems: 8,
    aimProblems: 12,
    minFeatures: 12,
    aimFeatures: 18,
    minTasks: 18,
    aimTasks: 25,
    descriptionLength: 'balanced (100-200 words per section)',
    timeout: 60000,
    maxTokens: 1400,
  },
  long: {
    minProblems: 12,
    aimProblems: 18,
    minFeatures: 18,
    aimFeatures: 28,
    minTasks: 28,
    aimTasks: 40,
    descriptionLength: 'comprehensive (200-400 words per section)',
    timeout: 90000,
    maxTokens: 1800,
  },
  'extra-long': {
    minProblems: 15,
    aimProblems: 25,
    minFeatures: 25,
    aimFeatures: 40,
    minTasks: 40,
    aimTasks: 60,
    descriptionLength: 'MAXIMUM detail (400-800+ words per section, include examples, edge cases, and deep analysis)',
    timeout: 120000,
    maxTokens: 2200,
  },
};

// Extended request interface
interface EnhancedAnalyzeRequest {
  feedback: string;
  project_id?: string;
  detail_level?: OutputDepth;
  reuse_cached?: boolean;
  input_import_ids?: string[];
  input_sources?: Array<{
    source_type?: string;
    input_method?: string;
    label?: string;
    import_id?: string;
  }>;
  context?: {
    project_name?: string;
    project_context?: string;
    user_persona?: string;
    industry?: string;
    product_type?: string;
  };
}

function normalizeInput(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function getInputHash(input: string): string {
  return createHash('sha256').update(normalizeInput(input)).digest('hex');
}

/**
 * POST /api/analyze
 * Run comprehensive feedback analysis with depth control
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('X-Request-Id') || `server-${Date.now()}`;

  try {
    logger.apiRequest('POST', '/api/analyze');
    logger.info(`[Analyze API] Request received`, {
      requestId,
      timestamp: new Date().toISOString(),
    });

    // Parse request body
    let body: EnhancedAnalyzeRequest;
    try {
      body = await request.json();
    } catch {
      throwValidationError('Invalid JSON in request body');
      return;
    }

    logger.info(`[Analyze API] Request parsed`, {
      requestId,
      feedbackLength: body.feedback?.length || 0,
      detailLevel: body.detail_level,
      projectId: body.project_id,
    });

    // Validate required fields
    validateRequired(body, ['feedback']);

    // Validate feedback length
    if (
      body.feedback.length < VALIDATION.ANALYSIS_INPUT.MIN_LENGTH ||
      body.feedback.length > VALIDATION.ANALYSIS_INPUT.MAX_LENGTH
    ) {
      throwValidationError(
        `Feedback must be between ${VALIDATION.ANALYSIS_INPUT.MIN_LENGTH} and ${VALIDATION.ANALYSIS_INPUT.MAX_LENGTH} characters`
      );
    }

    // Validate project_id if provided
    if (body.project_id && !isValidUUID(body.project_id)) {
      throwValidationError('Invalid project_id format');
    }

    assertGeminiFreeTierConfig();
    const normalizedFeedback = normalizeInput(body.feedback);
    if (normalizedFeedback.length < VALIDATION.ANALYSIS_INPUT.MIN_LENGTH) {
      throwValidationError('Feedback must contain meaningful text after trimming whitespace');
    }
    const inputHash = getInputHash(normalizedFeedback);
    const inputImportIds = Array.isArray(body.input_import_ids)
      ? body.input_import_ids.filter((id): id is string => typeof id === 'string' && isValidUUID(id))
      : [];
    const inputSources = Array.isArray(body.input_sources)
      ? (body.input_sources
          .map((source) => {
            if (!source || typeof source !== 'object') {
              return null;
            }
            const sourceType = typeof source.source_type === 'string' ? source.source_type.slice(0, 60) : undefined;
            const inputMethod = typeof source.input_method === 'string' ? source.input_method.slice(0, 80) : undefined;
            const label = typeof source.label === 'string' ? source.label.slice(0, 140) : undefined;
            const importId =
              typeof source.import_id === 'string' && isValidUUID(source.import_id)
                ? source.import_id
                : undefined;

            if (!sourceType && !inputMethod && !label && !importId) {
              return null;
            }

            return {
              source_type: sourceType || 'unknown',
              input_method: inputMethod || 'unknown',
              label: label || sourceType || 'Imported input',
              ...(importId ? { import_id: importId } : {}),
            };
          })
          .filter(Boolean) as Array<{
          source_type: string;
          input_method: string;
          label: string;
          import_id?: string;
        }>)
      : [];

    // Get server client and user
    const supabase = await createServerSupabaseClient();
    const user = await getUserOrAnonymous();
    const isAuthenticated = user.id !== 'anonymous';

    // Determine depth level
    const depthLevel: OutputDepth = body.detail_level || 'medium';
    const depthConfig = DEPTH_CONFIG[depthLevel];

    // Build pipeline context with depth settings
    const pipelineContext: PipelineContext & { depth?: OutputDepth; depthConfig?: typeof depthConfig } = {
      project_id: body.project_id,
      project_name: body.context?.project_name,
      project_context: body.context?.project_context,
      user_persona: body.context?.user_persona,
      industry: body.context?.industry,
      product_type: body.context?.product_type,
      depth: depthLevel,
      depthConfig,
    };

    // Fetch project details if authenticated
    if (isAuthenticated && body.project_id) {
      try {
        const { data: project } = await supabase
          .from(DB_TABLES.PROJECTS)
          .select('name, description')
          .eq('id', body.project_id)
          .eq('user_id', user.id)
          .single();

        if (project) {
          pipelineContext.project_name = project.name;
          pipelineContext.project_context = project.description;
        }
      } catch {
        logger.warn('Could not fetch project details');
      }
    }

    logger.info('Starting Gemini overview analysis', {
      feedbackLength: normalizedFeedback.length,
      hasContext: !!body.context,
      hasProjectId: !!body.project_id,
      isAuthenticated,
      depthLevel,
      maxTokens: depthConfig.maxTokens,
      model: config.gemini.model,
      expectedProblems: `${depthConfig.minProblems}-${depthConfig.aimProblems}`,
      expectedFeatures: `${depthConfig.minFeatures}-${depthConfig.aimFeatures}`,
      expectedTasks: `${depthConfig.minTasks}-${depthConfig.aimTasks}`,
    });

    const canReuseCached = body.reuse_cached !== false && isAuthenticated && !!body.project_id;
    if (canReuseCached) {
      const { data: candidates } = await supabase
        .from('analysis_sessions')
        .select('id, title, prompt_hash, detail_level, metadata, created_at')
        .eq('project_id', body.project_id as string)
        .eq('user_id', user.id)
        .eq('prompt_hash', inputHash)
        .eq('detail_level', depthLevel)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (candidates?.id) {
        const { data: sectionRows } = await supabase
          .from('analysis_sections')
          .select('section_id, content')
          .eq('session_id', candidates.id);

        const cachedResult = buildResultFromSections(
          sectionRows || [],
          null,
          candidates.metadata || {}
        );
        const processingTime = Date.now() - startTime;

        logger.info('Reusing cached overview analysis', {
          requestId,
          cachedAnalysisId: candidates.id,
          depthLevel,
        });

        return successResponse(
          {
            ...cachedResult,
            saved_id: candidates.id,
            provider: cachedResult?.metadata?.provider || 'gemini',
            api_processing_time_ms: processingTime,
            depth_level: depthLevel,
            generation_mode: 'cached-overview',
            metadata: {
              ...cachedResult.metadata,
              input_hash: cachedResult.metadata?.input_hash || inputHash,
              saved_analysis_id: candidates.id,
              session_id: candidates.id,
              session_title: candidates.title || cachedResult.metadata?.session_title,
            },
          },
          SUCCESS_MESSAGES.ANALYSIS_COMPLETED,
          200
        );
      }
    }

    let overviewResult: Awaited<ReturnType<typeof generateOverviewAnalysis>>;
    try {
      overviewResult = await generateOverviewAnalysis(normalizedFeedback, {
        ...pipelineContext,
        timeout: Math.min(depthConfig.timeout, 60000),
        inputHash,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Overview generation failed';
      const typedError = error as Error & {
        isGeminiPoolExhausted?: boolean;
        keyPoolStatus?: unknown;
        isConfigError?: boolean;
      };
      logger.error('Overview analysis failed', {
        requestId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          provider: 'gemini',
          ...(typedError.isGeminiPoolExhausted
            ? { key_pool_status: typedError.keyPoolStatus || undefined }
            : {}),
        }),
        {
          status: typedError.isGeminiPoolExhausted ? 429 : 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Save analysis if authenticated
    let savedAnalysisId: string | null = null;
    let analysisSessionId: string | null = null;
    let analysisSessionTitle: string | null = null;
    if (isAuthenticated && body.project_id) {
      // Persist structured analysis session + section rows.
      const session = await ensureAnalysisSession(supabase as any, {
        userId: user.id,
        projectId: body.project_id,
        projectName: pipelineContext.project_name || 'Untitled Project',
        prompt: normalizedFeedback,
        detailLevel: depthLevel,
        provider: overviewResult.provider,
        model: overviewResult.result?.metadata?.model_used || config.gemini.model,
        result: overviewResult.result as Record<string, any>,
        legacyAnalysisId: null,
      });

      if (session?.id) {
        analysisSessionId = session.id;
        savedAnalysisId = session.id;
        analysisSessionTitle = session.title;
        await upsertAnalysisSectionsFromResult(supabase as any, {
          sessionId: session.id,
          userId: user.id,
          projectId: body.project_id,
          result: overviewResult.result as Record<string, any>,
          provider: overviewResult.provider,
          model: overviewResult.result?.metadata?.model_used || config.gemini.model,
          inputHash,
        });
        await syncAnalysisSessionProgress(supabase as any, {
          sessionId: session.id,
          result: overviewResult.result as Record<string, any>,
          metadata: {
            ...(overviewResult.result?.metadata || {}),
            saved_analysis_id: session.id,
            session_id: session.id,
            session_title: session.title,
            input_sources: inputSources,
            input_import_ids: inputImportIds,
          },
        });
        logger.info('Analysis session saved', { requestId, sessionId: session.id });

        if (inputImportIds.length > 0) {
          const { error: importsLinkError } = await supabase
            .from('analysis_input_imports')
            .update({
              analysis_session_id: session.id,
              updated_at: new Date().toISOString(),
            })
            .eq('project_id', body.project_id)
            .eq('user_id', user.id)
            .in('id', inputImportIds);

          if (importsLinkError && importsLinkError.code !== '42P01') {
            logger.warn('Failed to link input imports to analysis session', {
              requestId,
              sessionId: session.id,
              error: importsLinkError.message,
            });
          }
        }
      }
    }

    const processingTime = Date.now() - startTime;

    logger.apiResponse('POST', '/api/analyze', 200, {
      requestId,
      analysisId: overviewResult.result.metadata?.analysis_id,
      savedId: savedAnalysisId,
      problemsFound: overviewResult.result.problem_analysis?.length || 0,
      featuresGenerated: overviewResult.result.feature_system?.length || 0,
      tasksCreated: 0,
      provider: overviewResult.provider,
      processingTime,
      depthLevel,
    });

    // Build response
    const response = {
      ...overviewResult.result,
      saved_id: savedAnalysisId,
      provider: overviewResult.provider,
      api_processing_time_ms: processingTime,
      depth_level: depthLevel,
      generation_mode: 'section-on-demand-overview',
      metadata: {
        ...overviewResult.result.metadata,
        input_hash: overviewResult.result.metadata?.input_hash || inputHash,
        model_used: overviewResult.result.metadata?.model_used || config.gemini.model,
        saved_analysis_id: savedAnalysisId || undefined,
        session_id: analysisSessionId || undefined,
        session_title:
          analysisSessionTitle ||
          overviewResult.result.metadata?.session_title ||
          undefined,
        input_sources: inputSources,
        input_import_ids: inputImportIds,
      },
    };

    return successResponse(response, SUCCESS_MESSAGES.ANALYSIS_COMPLETED, 200);
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.apiResponse('POST', '/api/analyze', 500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: processingTime,
    });

    return handleError(error);
  }
}

/**
 * GET /api/analyze
 * Get analysis history for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/analyze');

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await getUserOrAnonymous();

    if (user.id === 'anonymous') {
      return successResponse(
        { analyses: [], total: 0, pagination: { limit: 20, offset: 0, total: 0, has_more: false } },
        'Authentication required for history',
        401
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

    // Validate project_id if provided
    if (projectId && !isValidUUID(projectId)) {
      throwValidationError('Invalid project_id format');
    }

    // Prefer structured sessions table when available. Fallback to legacy analyses blob table.
    let sessionsQuery = supabase
      .from('analysis_sessions')
      .select(
        'id, project_id, title, prompt, detail_level, completion_percentage, generated_sections, legacy_analysis_id, metadata, created_at, projects!inner(user_id, name)'
      )
      .eq('projects.user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectId) {
      sessionsQuery = sessionsQuery.eq('project_id', projectId);
    }

    const { data: sessions, error: sessionsError } = await sessionsQuery;

    if (!sessionsError) {
      let sessionCountQuery = supabase
        .from('analysis_sessions')
        .select('id, projects!inner(user_id)', { count: 'exact', head: true })
        .eq('projects.user_id', user.id);

      if (projectId) {
        sessionCountQuery = sessionCountQuery.eq('project_id', projectId);
      }

      const [{ count: sessionsCount }, { data: sections }] = await Promise.all([
        sessionCountQuery,
        sessions && sessions.length > 0
          ? supabase
              .from('analysis_sections')
              .select('session_id, section_id, content')
              .in(
                'session_id',
                sessions.map((session: any) => session.id)
              )
          : Promise.resolve({ data: [] as Array<any> }),
      ]);

      const legacyIds = (sessions || [])
        .map((session: any) => session.legacy_analysis_id)
        .filter((value: string | null) => Boolean(value));

      const { data: legacyAnalyses } =
        legacyIds.length > 0
          ? await supabase
              .from(DB_TABLES.ANALYSES)
              .select('id, result')
              .in('id', legacyIds)
          : { data: [] as Array<any> };

      const legacyById = new Map<string, any>(
        (legacyAnalyses || []).map((analysis: any) => [analysis.id, analysis.result || {}])
      );
      const sectionsBySession = new Map<string, Array<any>>();
      for (const section of sections || []) {
        const bucket = sectionsBySession.get(section.session_id) || [];
        bucket.push(section);
        sectionsBySession.set(section.session_id, bucket);
      }

      const transformedAnalyses = (sessions || []).map((session: any) => {
        const fallbackResult = session.legacy_analysis_id
          ? legacyById.get(session.legacy_analysis_id) || {}
          : {}
        const result = buildResultFromSections(
          sectionsBySession.get(session.id) || [],
          fallbackResult,
          session.metadata || {}
        )

        return {
          id: session.id,
          session_id: session.id,
          project_id: session.project_id,
          project_name: session.projects?.name,
          title: session.title,
          prompt: session.prompt,
          detail_level: session.detail_level,
          completion_percentage: session.completion_percentage,
          generated_sections: session.generated_sections || [],
          created_at: session.created_at,
          result,
          summary: {
            problems_count: result?.problem_analysis?.length || 0,
            features_count: result?.feature_system?.length || 0,
            tasks_count: result?.development_tasks?.length || 0,
          },
        }
      })

      logger.apiResponse('GET', '/api/analyze', 200, {
        count: transformedAnalyses.length,
        total: sessionsCount || 0,
      });

      return successResponse({
        analyses: transformedAnalyses,
        total: sessionsCount || 0,
        pagination: {
          limit,
          offset,
          total: sessionsCount || 0,
          has_more: offset + limit < (sessionsCount || 0),
        },
      });
    }

    const isMissingTable = sessionsError.message?.toLowerCase().includes('does not exist');
    if (!isMissingTable) {
      throw sessionsError;
    }

    // Legacy fallback path
    let legacyQuery = supabase
      .from(DB_TABLES.ANALYSES)
      .select('id, project_id, result, created_at, projects!inner(user_id, name)')
      .eq('projects.user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectId) {
      legacyQuery = legacyQuery.eq('project_id', projectId);
    }

    const { data: analyses, error } = await legacyQuery;

    if (error) {
      logger.error('Failed to fetch analyses', { error: error.message });
      throw error;
    }

    let countQuery = supabase
      .from(DB_TABLES.ANALYSES)
      .select('*, projects!inner(user_id)', { count: 'exact', head: true })
      .eq('projects.user_id', user.id);

    if (projectId) {
      countQuery = countQuery.eq('project_id', projectId);
    }

    const { count } = await countQuery;

    const transformedAnalyses = (analyses || []).map((analysis: any) => ({
      id: analysis.id,
      project_id: analysis.project_id,
      project_name: analysis.projects?.name,
      created_at: analysis.created_at,
      result: analysis.result,
      summary: {
        problems_count: analysis.result?.problem_analysis?.length || 0,
        features_count: analysis.result?.feature_system?.length || 0,
        tasks_count: analysis.result?.development_tasks?.length || 0,
      },
    }));

    logger.apiResponse('GET', '/api/analyze', 200, {
      count: transformedAnalyses.length,
      total: count,
    });

    return successResponse({
      analyses: transformedAnalyses,
      total: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: offset + limit < (count || 0),
      },
    });
  } catch (error) {
    logger.apiResponse('GET', '/api/analyze', 500);
    return handleError(error);
  }
}
