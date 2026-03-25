import { NextRequest } from 'next/server';
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  handleError,
  successResponse,
  validateRequired,
} from '@/lib/errorHandler';
import { projectService } from '@/services/project.service';
import { CreateProjectRequest } from '@/types';
import { SUCCESS_MESSAGES } from '@/utils/constants';

/**
 * GET /api/projects
 * Get all projects for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/projects');

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch projects
    const { projects, total } = await projectService.getUserProjects(
      supabase,
      user,
      { limit, offset }
    );

    logger.apiResponse('GET', '/api/projects', 200, {
      count: projects.length,
      total,
    });

    return successResponse({
      projects,
      total,
      pagination: {
        limit,
        offset,
        total,
      },
    });
  } catch (error) {
    logger.apiResponse('GET', '/api/projects', 500);
    return handleError(error);
  }
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/projects');

    // Get server client and require auth
    const supabase = await createServerSupabaseClient();
    const user = await requireServerAuth();

    // Parse request body
    const body: CreateProjectRequest = await request.json();

    // Validate required fields
    validateRequired(body, ['name']);

    // Create project
    const project = await projectService.createProject(supabase, user, body);

    logger.apiResponse('POST', '/api/projects', 201, {
      projectId: project.id,
    });

    return successResponse(
      project,
      SUCCESS_MESSAGES.PROJECT_CREATED,
      201
    );
  } catch (error) {
    logger.apiResponse('POST', '/api/projects', 500);
    return handleError(error);
  }
}
