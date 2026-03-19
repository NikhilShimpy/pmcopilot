/**
 * PMCopilot - Individual Analysis API
 *
 * GET /api/analyze/[id] - Get specific analysis by ID
 * DELETE /api/analyze/[id] - Delete analysis
 */

import { NextRequest } from 'next/server';
import { supabase, requireAuth } from '@/lib/supabaseClient';
import { logger } from '@/lib/logger';
import {
  handleError,
  successResponse,
  throwValidationError,
  throwNotFoundError,
} from '@/lib/errorHandler';
import { analysisEngineService } from '@/services/analysis-engine.service';
import { DB_TABLES } from '@/utils/constants';
import { isValidUUID } from '@/utils/helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/analyze/[id]
 * Get full analysis details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    logger.apiRequest('GET', `/api/analyze/${id}`);

    // Validate ID
    if (!isValidUUID(id)) {
      throwValidationError('Invalid analysis ID format');
    }

    // Require authentication
    const user = await requireAuth(supabase);

    // Fetch analysis with project ownership check
    const result = await analysisEngineService.getAnalysisById(supabase, user.id, id);

    if (!result) {
      throwNotFoundError('Analysis not found or access denied');
    }

    logger.apiResponse('GET', `/api/analyze/${id}`, 200, {
      analysisId: id,
    });

    return successResponse({
      id: result.analysis.id,
      project_id: result.analysis.project_id,
      db_created_at: result.analysis.created_at,
      ...result.result,
    });
  } catch (error) {
    const { id } = await params;
    logger.apiResponse('GET', `/api/analyze/${id}`, 500);
    return handleError(error);
  }
}

/**
 * DELETE /api/analyze/[id]
 * Delete an analysis
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    logger.apiRequest('DELETE', `/api/analyze/${id}`);

    // Validate ID
    if (!isValidUUID(id)) {
      throwValidationError('Invalid analysis ID format');
    }

    // Require authentication
    const user = await requireAuth(supabase);

    // Verify ownership before delete
    const { data: analysis, error: fetchError } = await supabase
      .from(DB_TABLES.ANALYSES)
      .select('id, projects!inner(user_id)')
      .eq('id', id)
      .eq('projects.user_id', user.id)
      .single();

    if (fetchError || !analysis) {
      throwNotFoundError('Analysis not found or access denied');
    }

    // Delete analysis
    const { error: deleteError } = await supabase
      .from(DB_TABLES.ANALYSES)
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Failed to delete analysis', { error: deleteError.message });
      throw deleteError;
    }

    logger.apiResponse('DELETE', `/api/analyze/${id}`, 200);

    return successResponse(
      { deleted: true, id },
      'Analysis deleted successfully',
      200
    );
  } catch (error) {
    const { id } = await params;
    logger.apiResponse('DELETE', `/api/analyze/${id}`, 500);
    return handleError(error);
  }
}
