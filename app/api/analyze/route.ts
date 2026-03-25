/**
 * PMCopilot - Comprehensive Analysis API with Streaming Progress
 *
 * POST /api/analyze - Run comprehensive AI feedback analysis with live updates
 * GET /api/analyze - Get analysis history
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient, getUserOrAnonymous } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  handleError,
  successResponse,
  validateRequired,
  throwValidationError,
} from '@/lib/errorHandler';
import { analysisEngineService } from '@/services/analysis-engine.service';
import { runComprehensiveStrategyAnalysis } from '@/lib/comprehensiveStrategyEngine';
import { AnalyzeRequest, PipelineContext } from '@/types/analysis';
import { SUCCESS_MESSAGES, DB_TABLES, VALIDATION } from '@/utils/constants';
import { isValidUUID } from '@/utils/helpers';

/**
 * POST /api/analyze
 * Run comprehensive feedback analysis with streaming progress updates
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.apiRequest('POST', '/api/analyze');

    // Parse request body
    let body: AnalyzeRequest;
    try {
      body = await request.json();
    } catch {
      throwValidationError('Invalid JSON in request body');
      return;
    }

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

    // Get server client and user (works with or without auth)
    const supabase = await createServerSupabaseClient();
    const user = await getUserOrAnonymous();
    const isAuthenticated = user.id !== 'anonymous';

    // Build pipeline context
    const pipelineContext: PipelineContext = {
      project_id: body.project_id,
      project_name: body.context?.project_name,
      project_context: body.context?.project_context,
      user_persona: body.context?.user_persona,
      industry: body.context?.industry,
      product_type: body.context?.product_type,
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

    const detailLevel = body.detail_level || 'comprehensive';

    logger.info('Starting comprehensive analysis', {
      feedbackLength: body.feedback.length,
      hasContext: !!body.context,
      hasProjectId: !!body.project_id,
      isAuthenticated,
      detailLevel,
    });

    // Run comprehensive analysis
    const comprehensiveResult = await runComprehensiveStrategyAnalysis(
      body.feedback,
      pipelineContext
    );

    if (!comprehensiveResult.success || !comprehensiveResult.result) {
      logger.error('Analysis failed', {
        error: comprehensiveResult.error,
      });

      return successResponse(
        {
          success: false,
          error: comprehensiveResult.error || 'Analysis failed',
        },
        'Analysis failed',
        500
      );
    }

    // Save analysis if authenticated
    let savedAnalysisId: string | null = null;
    if (isAuthenticated && body.project_id) {
      const saveResult = await analysisEngineService.saveAnalysis(
        supabase,
        body.project_id,
        comprehensiveResult.result
      );

      if (saveResult) {
        savedAnalysisId = saveResult.id;
        logger.info('Analysis saved', { analysisId: savedAnalysisId });
      }
    }

    const processingTime = Date.now() - startTime;

    logger.apiResponse('POST', '/api/analyze', 200, {
      analysisId: comprehensiveResult.result.metadata?.analysis_id,
      savedId: savedAnalysisId,
      problemsFound: comprehensiveResult.result.problem_analysis?.length || 0,
      featuresGenerated: comprehensiveResult.result.feature_system?.length || 0,
      tasksCreated: comprehensiveResult.result.development_tasks?.length || 0,
      provider: comprehensiveResult.provider,
      processingTime,
    });

    // Build response
    const response = {
      ...comprehensiveResult.result,
      saved_id: savedAnalysisId,
      provider: comprehensiveResult.provider,
      api_processing_time_ms: processingTime,
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
