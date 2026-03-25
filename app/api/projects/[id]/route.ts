import { NextRequest } from 'next/server';
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { handleError, successResponse } from '@/lib/errorHandler';
import { projectService } from '@/services/project.service';
import { CreateProjectRequest } from '@/types';
import { SUCCESS_MESSAGES } from '@/utils/constants';

/**
 * GET /api/projects/[id]
 * Get a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    logger.apiRequest('GET', `/api/projects/${projectId}`);

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Fetch project
    const project = await projectService.getProjectById(
      supabase,
      user,
      projectId
    );

    logger.apiResponse('GET', `/api/projects/${projectId}`, 200);

    return successResponse(project);
  } catch (error) {
    const { id } = await params;
    logger.apiResponse('GET', `/api/projects/${id}`, 500);
    return handleError(error);
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    logger.apiRequest('PUT', `/api/projects/${projectId}`);

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Parse request body
    const body: Partial<CreateProjectRequest> = await request.json();

    // Update project
    const project = await projectService.updateProject(
      supabase,
      user,
      projectId,
      body
    );

    logger.apiResponse('PUT', `/api/projects/${projectId}`, 200);

    return successResponse(project, SUCCESS_MESSAGES.PROJECT_UPDATED);
  } catch (error) {
    const { id } = await params;
    logger.apiResponse('PUT', `/api/projects/${id}`, 500);
    return handleError(error);
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    logger.apiRequest('DELETE', `/api/projects/${projectId}`);

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Delete project
    await projectService.deleteProject(supabase, user, projectId);

    logger.apiResponse('DELETE', `/api/projects/${projectId}`, 200);

    return successResponse(
      { id: projectId },
      SUCCESS_MESSAGES.PROJECT_DELETED
    );
  } catch (error) {
    const { id } = await params;
    logger.apiResponse('DELETE', `/api/projects/${id}`, 500);
    return handleError(error);
  }
}
