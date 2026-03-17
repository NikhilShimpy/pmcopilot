import { NextRequest } from 'next/server';
import { supabase, requireAuth } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import { handleError, successResponse } from '@/lib/errorHandler';
import { feedbackService } from '@/services/feedback.service';
import { SUCCESS_MESSAGES } from '@/utils/constants';

/**
 * GET /api/feedback/[id]
 * Get a specific feedback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feedbackId = params.id;
    logger.apiRequest('GET', `/api/feedback/${feedbackId}`);

    // Require authentication
    const user = await requireAuth(supabase);

    // Fetch feedback
    const feedback = await feedbackService.getFeedbackById(
      supabase,
      user,
      feedbackId
    );

    logger.apiResponse('GET', `/api/feedback/${feedbackId}`, 200);

    return successResponse(feedback);
  } catch (error) {
    logger.apiResponse('GET', `/api/feedback/${params.id}`, 500);
    return handleError(error);
  }
}

/**
 * DELETE /api/feedback/[id]
 * Delete a feedback
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const feedbackId = params.id;
    logger.apiRequest('DELETE', `/api/feedback/${feedbackId}`);

    // Require authentication
    const user = await requireAuth(supabase);

    // Delete feedback
    await feedbackService.deleteFeedback(supabase, user, feedbackId);

    logger.apiResponse('DELETE', `/api/feedback/${feedbackId}`, 200);

    return successResponse(
      { id: feedbackId },
      SUCCESS_MESSAGES.FEEDBACK_DELETED
    );
  } catch (error) {
    logger.apiResponse('DELETE', `/api/feedback/${params.id}`, 500);
    return handleError(error);
  }
}
