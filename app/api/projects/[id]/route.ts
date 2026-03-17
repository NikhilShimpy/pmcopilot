import { NextRequest } from 'next/server';
import { supabase, requireAuth } from '@/lib/supabaseClient';
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
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    logger.apiRequest('GET', `/api/projects/${projectId}`);

    // Require authentication
    const user = await requireAuth(supabase);

    // Fetch project
    const project = await projectService.getProjectById(
      supabase,
      user,
      projectId
    );

    logger.apiResponse('GET', `/api/projects/${projectId}`, 200);

    return successResponse(project);
  } catch (error) {
    logger.apiResponse('GET', `/api/projects/${params.id}`, 500);
    return handleError(error);
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    logger.apiRequest('PUT', `/api/projects/${projectId}`);

    // Require authentication
    const user = await requireAuth(supabase);

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
    logger.apiResponse('PUT', `/api/projects/${params.id}`, 500);
    return handleError(error);
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    logger.apiRequest('DELETE', `/api/projects/${projectId}`);

    // Require authentication
    const user = await requireAuth(supabase);

    // Delete project
    await projectService.deleteProject(supabase, user, projectId);

    logger.apiResponse('DELETE', `/api/projects/${projectId}`, 200);

    return successResponse(
      { id: projectId },
      SUCCESS_MESSAGES.PROJECT_DELETED
    );
  } catch (error) {
    logger.apiResponse('DELETE', `/api/projects/${params.id}`, 500);
    return handleError(error);
  }
}
