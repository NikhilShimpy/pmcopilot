import { NextRequest } from 'next/server';
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  handleError,
  successResponse,
  validateRequired,
} from '@/lib/errorHandler';
import { feedbackService } from '@/services/feedback.service';
import { CreateFeedbackRequest, FeedbackPriority, FeedbackStatus } from '@/types';
import { SUCCESS_MESSAGES } from '@/utils/constants';

/**
 * GET /api/feedback
 * Get feedback for authenticated user
 * Query params:
 *   - project_id: filter by project
 *   - limit: pagination limit
 *   - offset: pagination offset
 */
export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/feedback');

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as FeedbackStatus | null;
    const priority = searchParams.get('priority') as FeedbackPriority | null;
    const search = searchParams.get('search') || undefined;

    let result;

    // Fetch feedback by project or all user feedback
    if (projectId) {
      result = await feedbackService.getProjectFeedback(
        supabase,
        user,
        projectId,
        {
          limit,
          offset,
          status: status || undefined,
          priority: priority || undefined,
          search,
        }
      );
    } else {
      result = await feedbackService.getUserFeedback(supabase, user, {
        limit,
        offset,
        status: status || undefined,
        priority: priority || undefined,
        search,
      });
    }

    logger.apiResponse('GET', '/api/feedback', 200, {
      count: result.feedback.length,
      total: result.total,
    });

    return successResponse({
      feedback: result.feedback,
      total: result.total,
      pagination: {
        limit,
        offset,
        total: result.total,
      },
    });
  } catch (error) {
    logger.apiResponse('GET', '/api/feedback', 500);
    return handleError(error);
  }
}

/**
 * POST /api/feedback
 * Create new feedback
 */
export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/feedback');

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Parse request body
    const body: CreateFeedbackRequest = await request.json();

    // Validate required fields
    validateRequired(body, ['project_id', 'content']);

    // Create feedback
    const feedback = await feedbackService.createFeedback(
      supabase,
      user,
      body
    );

    logger.apiResponse('POST', '/api/feedback', 201, {
      feedbackId: feedback.id,
    });

    return successResponse(
      feedback,
      SUCCESS_MESSAGES.FEEDBACK_CREATED,
      201
    );
  } catch (error) {
    logger.apiResponse('POST', '/api/feedback', 500);
    return handleError(error);
  }
}
