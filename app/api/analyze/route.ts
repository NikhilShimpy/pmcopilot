import { NextRequest } from 'next/server';
import { supabase, requireAuth } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import {
  handleError,
  successResponse,
  validateRequired,
} from '@/lib/errorHandler';
import { aiService } from '@/services/ai.service';
import { AnalyzeFeedbackRequest } from '@/types';
import { SUCCESS_MESSAGES, DB_TABLES } from '@/utils/constants';

/**
 * POST /api/analyze
 * Analyze feedback with AI
 */
export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/analyze');

    // Parse request body
    const body: AnalyzeFeedbackRequest = await request.json();

    // Validate required fields
    validateRequired(body, ['feedback']);

    // Get authenticated user (optional - can work without auth)
    let user = null;
    try {
      user = await requireAuth(supabase);
    } catch {
      // Allow unauthenticated analysis
      logger.info('Analyzing feedback without authentication');
    }

    // Analyze feedback
    const result = await aiService.analyzeFeedback(
      body.feedback,
      body.context
    );

    // If user is authenticated and project_id is provided, save the analysis
    if (user && body.project_id) {
      try {
        const { error } = await supabase.from(DB_TABLES.ANALYSES).insert({
          project_id: body.project_id,
          result: result,
        });

        if (error) {
          logger.warn('Failed to save analysis to database', {
            error: error.message,
          });
          // Don't fail the request if saving fails
        } else {
          logger.info('Analysis saved to database', {
            projectId: body.project_id,
          });
        }
      } catch (saveError) {
        logger.warn('Error saving analysis', {
          error:
            saveError instanceof Error ? saveError.message : 'Unknown error',
        });
        // Continue without failing
      }
    }

    logger.apiResponse('POST', '/api/analyze', 200);

    return successResponse(
      result,
      SUCCESS_MESSAGES.ANALYSIS_COMPLETED,
      200
    );
  } catch (error) {
    logger.apiResponse('POST', '/api/analyze', 500);
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

    // Require authentication
    const user = await requireAuth(supabase);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from(DB_TABLES.ANALYSES)
      .select('*, projects!inner(user_id, name)')
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

    logger.apiResponse('GET', '/api/analyze', 200, {
      count: analyses?.length,
      total: count,
    });

    return successResponse({
      analyses: analyses || [],
      total: count || 0,
      pagination: {
        limit,
        offset,
        total: count || 0,
      },
    });
  } catch (error) {
    logger.apiResponse('GET', '/api/analyze', 500);
    return handleError(error);
  }
}
