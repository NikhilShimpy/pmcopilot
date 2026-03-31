import { NextRequest } from 'next/server';
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleError, successResponse } from '@/lib/errorHandler';
import { feedbackService } from '@/services/feedback.service';
import { CreateFeedbackRequest } from '@/types';
import { SUCCESS_MESSAGES } from '@/utils/constants';

/**
 * GET /api/feedback/[id]
 * Get a specific feedback
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;
    logger.apiRequest('GET', `/api/feedback/${feedbackId}`);

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Fetch feedback
    const feedback = await feedbackService.getFeedbackById(
      supabase,
      user,
      feedbackId
    );

    logger.apiResponse('GET', `/api/feedback/${feedbackId}`, 200);

    return successResponse(feedback);
  } catch (error) {
    const { id } = await params;
    logger.apiResponse('GET', `/api/feedback/${id}`, 500);
    return handleError(error);
  }
}

/**
 * DELETE /api/feedback/[id]
 * Delete a feedback
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;
    logger.apiRequest('DELETE', `/api/feedback/${feedbackId}`);

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Delete feedback
    await feedbackService.deleteFeedback(supabase, user, feedbackId);

    logger.apiResponse('DELETE', `/api/feedback/${feedbackId}`, 200);

    return successResponse(
      { id: feedbackId },
      SUCCESS_MESSAGES.FEEDBACK_DELETED
    );
  } catch (error) {
    const { id } = await params;
    logger.apiResponse('DELETE', `/api/feedback/${id}`, 500);
    return handleError(error);
  }
}

/**
 * PATCH /api/feedback/[id]
 * Update feedback fields/status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;
    logger.apiRequest('PATCH', `/api/feedback/${feedbackId}`);

    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    const body: Partial<CreateFeedbackRequest> = await request.json();

    const feedback = await feedbackService.updateFeedback(
      supabase,
      user,
      feedbackId,
      body
    );

    logger.apiResponse('PATCH', `/api/feedback/${feedbackId}`, 200);

    return successResponse(feedback, SUCCESS_MESSAGES.FEEDBACK_UPDATED);
  } catch (error) {
    const { id } = await params;
    logger.apiResponse('PATCH', `/api/feedback/${id}`, 500);
    return handleError(error);
  }
}
