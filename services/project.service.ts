import { SupabaseClient } from '@supabase/supabase-js';
import { Project, CreateProjectRequest, User } from '@/types';
import { logger } from '@/lib/logger';
import {
  throwValidationError,
  throwDatabaseError,
  throwNotFoundError,
} from '@/lib/errorHandler';
import { sanitizeInput, isValidProjectName } from '@/utils/helpers';
import { DB_TABLES, VALIDATION } from '@/utils/constants';

/**
 * Service for project-related operations
 */
export class ProjectService {
  /**
   * Create a new project
   */
  async createProject(
    supabase: SupabaseClient,
    user: User,
    data: CreateProjectRequest
  ): Promise<Project> {
    logger.info('Creating new project', { userId: user.id, name: data.name });

    // Validate input
    this.validateProjectData(data);

    // Sanitize input
    const sanitizedData = {
      name: sanitizeInput(data.name),
      description: data.description ? sanitizeInput(data.description) : null,
      user_id: user.id,
    };

    try {
      const { data: project, error } = await supabase
        .from(DB_TABLES.PROJECTS)
        .insert(sanitizedData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create project', { error: error.message });
        throwDatabaseError('Failed to create project', error);
      }

      logger.info('Project created successfully', { projectId: project.id });
      return project as Project;
    } catch (error) {
      logger.error('Error creating project', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get project by ID
   */
  async getProjectById(
    supabase: SupabaseClient,
    user: User,
    projectId: string
  ): Promise<Project> {
    logger.debug('Fetching project', { projectId, userId: user.id });

    try {
      const { data: project, error } = await supabase
        .from(DB_TABLES.PROJECTS)
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (error || !project) {
        logger.warn('Project not found', { projectId, userId: user.id });
        throwNotFoundError('Project');
      }

      return project as Project;
    } catch (error) {
      logger.error('Error fetching project', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(
    supabase: SupabaseClient,
    user: User,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ projects: Project[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    logger.debug('Fetching user projects', { userId: user.id, limit, offset });

    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from(DB_TABLES.PROJECTS)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        logger.error('Failed to count projects', { error: countError.message });
        throwDatabaseError('Failed to count projects', countError);
      }

      // Get projects
      const { data: projects, error } = await supabase
        .from(DB_TABLES.PROJECTS)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to fetch projects', { error: error.message });
        throwDatabaseError('Failed to fetch projects', error);
      }

      logger.info('User projects fetched successfully', {
        userId: user.id,
        count: projects?.length || 0,
        total: count || 0,
      });

      return {
        projects: (projects || []) as Project[],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error fetching user projects', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update project
   */
  async updateProject(
    supabase: SupabaseClient,
    user: User,
    projectId: string,
    updates: Partial<CreateProjectRequest>
  ): Promise<Project> {
    logger.info('Updating project', { projectId, userId: user.id });

    // Verify project exists and belongs to user
    await this.getProjectById(supabase, user, projectId);

    // Validate updates
    if (updates.name) {
      this.validateProjectData({ name: updates.name });
    }

    // Sanitize input
    const sanitizedUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name) {
      sanitizedUpdates.name = sanitizeInput(updates.name);
    }

    if (updates.description !== undefined) {
      sanitizedUpdates.description = updates.description
        ? sanitizeInput(updates.description)
        : null;
    }

    try {
      const { data: project, error } = await supabase
        .from(DB_TABLES.PROJECTS)
        .update(sanitizedUpdates)
        .eq('id', projectId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update project', { error: error.message });
        throwDatabaseError('Failed to update project', error);
      }

      logger.info('Project updated successfully', { projectId });
      return project as Project;
    } catch (error) {
      logger.error('Error updating project', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete project
   */
  async deleteProject(
    supabase: SupabaseClient,
    user: User,
    projectId: string
  ): Promise<void> {
    logger.info('Deleting project', { projectId, userId: user.id });

    // Verify project exists and belongs to user
    await this.getProjectById(supabase, user, projectId);

    try {
      let { error } = await supabase
        .from(DB_TABLES.PROJECTS)
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error && this.isProjectForeignKeyBlocker(error)) {
        logger.warn('Project delete blocked by FK dependencies, cleaning child rows', {
          projectId,
          userId: user.id,
          error: error.message,
          code: (error as any)?.code,
        });

        await this.cleanupProjectDependencies(supabase, user, projectId);

        const retry = await supabase
          .from(DB_TABLES.PROJECTS)
          .delete()
          .eq('id', projectId)
          .eq('user_id', user.id);

        error = retry.error;
      }

      if (error) {
        logger.error('Failed to delete project', { error: error.message });
        throwDatabaseError('Failed to delete project', error);
      }

      logger.info('Project deleted successfully', { projectId });
    } catch (error) {
      logger.error('Error deleting project', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private isProjectForeignKeyBlocker(error: { message?: string; code?: string; details?: string }): boolean {
    const fullText = `${error.message || ''} ${error.details || ''}`.toLowerCase();
    return (
      error.code === '23503' ||
      fullText.includes('analyses_project_id_fkey') ||
      fullText.includes('violates foreign key constraint') ||
      fullText.includes('update or delete on table "projects"')
    );
  }

  private isMissingTableError(error: { code?: string; message?: string }): boolean {
    return (
      error.code === '42P01' ||
      (error.message || '').toLowerCase().includes('does not exist')
    );
  }

  private async cleanupProjectDependencies(
    supabase: SupabaseClient,
    user: User,
    projectId: string
  ): Promise<void> {
    const childCleanupTables = ['analysis_sections', 'analysis_sessions', 'feedbacks', 'analyses'];

    // Support tickets should be retained but detached from deleted project.
    const supportCleanup = await supabase
      .from('support_tickets')
      .update({ project_id: null })
      .eq('project_id', projectId)
      .eq('user_id', user.id);

    if (supportCleanup.error && !this.isMissingTableError(supportCleanup.error)) {
      logger.error('Failed to detach support tickets before project delete', {
        projectId,
        error: supportCleanup.error.message,
      });
      throwDatabaseError('Failed to detach support tickets before deleting project', supportCleanup.error);
    }

    for (const tableName of childCleanupTables) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('project_id', projectId);

      if (error && !this.isMissingTableError(error)) {
        logger.error('Failed to cleanup dependent rows before project delete', {
          projectId,
          tableName,
          error: error.message,
        });
        throwDatabaseError(`Failed to cleanup ${tableName} before deleting project`, error);
      }
    }
  }

  /**
   * Validate project data
   */
  private validateProjectData(data: CreateProjectRequest): void {
    if (!data.name || !isValidProjectName(data.name)) {
      throwValidationError(
        `Project name must be between ${VALIDATION.PROJECT_NAME.MIN_LENGTH} and ${VALIDATION.PROJECT_NAME.MAX_LENGTH} characters`
      );
    }

    if (
      data.description &&
      data.description.length > VALIDATION.PROJECT_DESCRIPTION.MAX_LENGTH
    ) {
      throwValidationError(
        `Project description must not exceed ${VALIDATION.PROJECT_DESCRIPTION.MAX_LENGTH} characters`
      );
    }
  }
}

// Export singleton instance
export const projectService = new ProjectService();

export default projectService;
