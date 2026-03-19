/**
 * PMCopilot - Comprehensive Analysis API
 *
 * POST /api/analyze - Run comprehensive AI feedback analysis
 * GET /api/analyze - Get analysis history
 * GET /api/analyze/[id] - Get specific analysis
 */

import { NextRequest } from 'next/server';
import { supabase, requireAuth } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import {
  handleError,
  successResponse,
  validateRequired,
  throwValidationError,
} from '@/lib/errorHandler';
import { analysisEngineService } from '@/services/analysis-engine.service';
import { runEnhancedAnalysisPipeline } from '@/lib/enhancedAnalysisPipeline';
import { runComprehensiveStrategyAnalysis } from '@/lib/comprehensiveStrategyEngine';
import { AnalyzeRequest, PipelineContext } from '@/types/analysis';
import { SUCCESS_MESSAGES, DB_TABLES, VALIDATION } from '@/utils/constants';
import { isValidUUID } from '@/utils/helpers';

/**
 * POST /api/analyze
 * Run comprehensive feedback analysis with multi-stage AI pipeline
 *
 * Input:
 * {
 *   "project_id": string (optional),
 *   "feedback": string (required),
 *   "detail_level": "standard" | "enhanced" (optional, default: "standard"),
 *   "context": {
 *     "project_name": string,
 *     "project_context": string,
 *     "user_persona": string,
 *     "industry": string,
 *     "product_type": string
 *   } (optional)
 * }
 *
 * Output:
 * {
 *   "success": true,
 *   "data": {
 *     "problems": [...],
 *     "features": [...],
 *     "prd": {...},
 *     "tasks": [...],
 *     "impact": {...},
 *     "explainability": {...},
 *     "executive_summary": string,
 *     "key_findings": [...],
 *     "immediate_actions": [...]
 *   },
 *   "message": "Analysis completed successfully"
 * }
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
      return; // TypeScript flow control
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

    // Get authenticated user (optional - can work without auth)
    let user = null;
    try {
      user = await requireAuth(supabase);
    } catch {
      // Allow unauthenticated analysis for demo purposes
      logger.info('Running analysis without authentication');
    }

    // Build pipeline context
    const pipelineContext: PipelineContext = {
      project_id: body.project_id,
      project_name: body.context?.project_name,
      project_context: body.context?.project_context,
      user_persona: body.context?.user_persona,
      industry: body.context?.industry,
      product_type: body.context?.product_type,
    };

    // If project_id is provided and user is authenticated, fetch project details
    if (user && body.project_id) {
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
        // Continue without project context
        logger.warn('Could not fetch project details');
      }
    }

    // Determine analysis type
    const detailLevel = body.detail_level || 'comprehensive';
    const useEnhanced = detailLevel === 'enhanced';
    const useComprehensive = detailLevel === 'comprehensive';

    logger.info('Starting comprehensive analysis', {
      feedbackLength: body.feedback.length,
      hasContext: !!body.context,
      hasProjectId: !!body.project_id,
      isAuthenticated: !!user,
      detailLevel,
      useEnhanced,
      useComprehensive,
    });

    // Run comprehensive analysis (standard, enhanced, or comprehensive)
    let analysisResult: any;

    if (useComprehensive) {
      // Use comprehensive strategy engine for full 13-section output
      const comprehensiveResult = await runComprehensiveStrategyAnalysis(
        body.feedback,
        pipelineContext
      );

      if (comprehensiveResult.success && comprehensiveResult.result) {
        analysisResult = {
          success: true,
          data: comprehensiveResult.result,
          provider: comprehensiveResult.provider,
        };
      } else {
        analysisResult = {
          success: false,
          error: comprehensiveResult.error || 'Comprehensive analysis failed',
        };
      }
    } else if (useEnhanced) {
      // Use enhanced pipeline for detailed analysis
      const enhancedResult = await runEnhancedAnalysisPipeline(
        body.feedback,
        pipelineContext
      );

      // Transform enhanced result to standard format
      if (enhancedResult.success && enhancedResult.result) {
        analysisResult = {
          success: true,
          data: enhancedResult.result,
          provider: enhancedResult.provider,
        };
      } else {
        analysisResult = {
          success: false,
          error: enhancedResult.error || 'Enhanced analysis failed',
        };
      }
    } else {
      // Use standard pipeline
      analysisResult = await analysisEngineService.analyzeFeedback(
        body.feedback,
        pipelineContext
      );
    }

    // Handle analysis failure
    if (!analysisResult.success || !analysisResult.data) {
      logger.error('Analysis failed', {
        error: analysisResult.error,
        errorCode: analysisResult.error_code,
      });

      logger.apiResponse('POST', '/api/analyze', 500, {
        error: analysisResult.error,
        duration: Date.now() - startTime,
      });

      return successResponse(
        {
          success: false,
          error: analysisResult.error || 'Analysis failed',
        },
        'Analysis failed',
        500
      );
    }

    // If user is authenticated and project_id is provided, save the analysis
    let savedAnalysisId: string | null = null;
    if (user && body.project_id) {
      const saveResult = await analysisEngineService.saveAnalysis(
        supabase,
        body.project_id,
        analysisResult.data
      );

      if (saveResult) {
        savedAnalysisId = saveResult.id;
        logger.info('Analysis saved to database', {
          analysisId: savedAnalysisId,
          projectId: body.project_id,
        });
      } else {
        logger.warn('Failed to save analysis to database');
        // Don't fail the request if saving fails
      }
    }

    const processingTime = Date.now() - startTime;

    logger.apiResponse('POST', '/api/analyze', 200, {
      analysisId: analysisResult.data.analysis_id || analysisResult.data.metadata?.analysis_id,
      savedId: savedAnalysisId,
      problemsFound: analysisResult.data.problems?.length || analysisResult.data.problem_analysis?.length || 0,
      featuresGenerated: analysisResult.data.features?.length || analysisResult.data.feature_system?.length || 0,
      tasksCreated: analysisResult.data.tasks?.length || analysisResult.data.development_tasks?.length || 0,
      provider: analysisResult.provider,
      processingTime,
    });

    // Build response
    const response = {
      ...analysisResult.data,
      saved_id: savedAnalysisId,
      provider: analysisResult.provider,
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
 *
 * Query Parameters:
 * - project_id: Filter by project
 * - limit: Number of results (default: 20, max: 100)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/analyze');

    // Require authentication
    const user = await requireAuth(supabase);

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

    // Filter by project if specified
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

    // Transform results for response
    const transformedAnalyses = (analyses || []).map((analysis: any) => ({
      id: analysis.id,
      project_id: analysis.project_id,
      project_name: analysis.projects?.name,
      created_at: analysis.created_at,
      // Include summary data only for list view
      summary: {
        problems_count: analysis.result?.problems?.length || 0,
        features_count: analysis.result?.features?.length || 0,
        tasks_count: analysis.result?.tasks?.length || 0,
        executive_summary: analysis.result?.executive_summary,
        confidence_score: analysis.result?.impact?.confidence_score,
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
