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
import { analysisEngineService } from '@/services/analysis-engine.service';
import { generateOverviewAnalysis } from '@/lib/sectionedStrategyEngine';
import { assertGeminiFreeTierConfig, config } from '@/lib/config';
import { PipelineContext } from '@/types/analysis';
import { SUCCESS_MESSAGES, DB_TABLES, VALIDATION } from '@/utils/constants';
import { isValidUUID } from '@/utils/helpers';

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

function getMetadataInputHash(result: any): string | undefined {
  return result?.metadata?.input_hash;
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
        .from(DB_TABLES.ANALYSES)
        .select('id, result, created_at')
        .eq('project_id', body.project_id as string)
        .order('created_at', { ascending: false })
        .limit(5);

      const cached = (candidates || []).find((candidate: any) => {
        const candidateResult = candidate?.result || {};
        const metadata = candidateResult?.metadata || {};
        const candidateHash = getMetadataInputHash(candidateResult);
        const hasOverview = Boolean(
          candidateResult?.executive_dashboard ||
            (Array.isArray(candidateResult?.problem_analysis) &&
              candidateResult.problem_analysis.length > 0) ||
            (Array.isArray(candidateResult?.feature_system) &&
              candidateResult.feature_system.length > 0)
        );
        const sameDepth = (metadata.detail_level || 'medium') === depthLevel;

        if (!hasOverview || !sameDepth) {
          return false;
        }

        if (candidateHash && candidateHash === inputHash) {
          return true;
        }

        const candidateInput = metadata.source_input || '';
        return candidateInput ? normalizeInput(candidateInput) === normalizedFeedback : false;
      });

      if (cached) {
        const cachedResult = cached.result || {};
        const processingTime = Date.now() - startTime;

        logger.info('Reusing cached overview analysis', {
          requestId,
          cachedAnalysisId: cached.id,
          depthLevel,
        });

        return successResponse(
          {
            ...cachedResult,
            saved_id: cached.id,
            provider: cachedResult?.metadata?.provider || 'gemini',
            api_processing_time_ms: processingTime,
            depth_level: depthLevel,
            generation_mode: 'cached-overview',
            metadata: {
              ...cachedResult.metadata,
              input_hash: cachedResult.metadata?.input_hash || inputHash,
              saved_analysis_id: cached.id,
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
      logger.error('Overview analysis failed', {
        requestId,
        error: errorMessage,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          provider: 'gemini',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Save analysis if authenticated
    let savedAnalysisId: string | null = null;
    if (isAuthenticated && body.project_id) {
      const saveResult = await analysisEngineService.saveAnalysis(
        supabase,
        body.project_id,
        overviewResult.result
      );

      if (saveResult) {
        savedAnalysisId = saveResult.id;
        logger.info('Analysis saved', { requestId, analysisId: savedAnalysisId });
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

    // Build query
    let query = supabase
      .from(DB_TABLES.ANALYSES)
      .select('id, project_id, result, created_at, projects!inner(user_id, name)')
      .eq('projects.user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: analyses, error } = await query;

    if (error) {
      logger.error('Failed to fetch analyses', { error: error.message });
      throw error;
    }

    // Get total count
    let countQuery = supabase
      .from(DB_TABLES.ANALYSES)
      .select('*, projects!inner(user_id)', { count: 'exact', head: true })
      .eq('projects.user_id', user.id);

    if (projectId) {
      countQuery = countQuery.eq('project_id', projectId);
    }

    const { count } = await countQuery;

    // Transform results
    const transformedAnalyses = (analyses || []).map((analysis: any) => ({
      id: analysis.id,
      project_id: analysis.project_id,
      project_name: analysis.projects?.name,
      created_at: analysis.created_at,
      result: analysis.result, // Include full result for output page
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
