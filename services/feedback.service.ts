import { SupabaseClient } from '@supabase/supabase-js';
import {
  Feedback,
  CreateFeedbackRequest,
  FeedbackCategory,
  FeedbackPriority,
  FeedbackStatus,
  User,
} from '@/types';
import { logger } from '@/lib/logger';
import {
  throwValidationError,
  throwDatabaseError,
  throwNotFoundError,
} from '@/lib/errorHandler';
import { sanitizeInput, isValidFeedbackContent } from '@/utils/helpers';
import { DB_TABLES, VALIDATION } from '@/utils/constants';
import { projectService } from './project.service';

/**
 * Service for feedback-related operations
 */
export class FeedbackService {
  private readonly allowedCategories: FeedbackCategory[] = [
    'bug',
    'feature',
    'improvement',
    'ux',
    'performance',
    'other',
  ];

  private readonly allowedPriorities: FeedbackPriority[] = [
    'low',
    'medium',
    'high',
    'critical',
  ];

  private readonly allowedStatuses: FeedbackStatus[] = [
    'new',
    'reviewed',
    'planned',
    'done',
  ];

  /**
   * Create new feedback
   */
  async createFeedback(
    supabase: SupabaseClient,
    user: User,
    data: CreateFeedbackRequest
  ): Promise<Feedback> {
    logger.info('Creating new feedback', {
      userId: user.id,
      projectId: data.project_id,
    });

    // Validate input
    this.validateFeedbackData(data);

    // Verify project exists and belongs to user
    await projectService.getProjectById(supabase, user, data.project_id);

    // Sanitize input
    const sanitizedData = {
      project_id: data.project_id,
      title: data.title ? sanitizeInput(data.title) : null,
      content: sanitizeInput(data.content),
      category: data.category || 'other',
      priority: data.priority || 'medium',
      status: data.status || 'new',
      internal_notes: data.internal_notes
        ? sanitizeInput(data.internal_notes)
        : null,
      source: data.source ? sanitizeInput(data.source) : 'manual',
      created_by: user.id,
      metadata: data.metadata || {},
    };

    try {
      const { data: feedback, error } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .insert(sanitizedData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create feedback', { error: error.message });
        throwDatabaseError('Failed to create feedback', error);
      }

      logger.info('Feedback created successfully', { feedbackId: feedback.id });
      return feedback as Feedback;
    } catch (error) {
      logger.error('Error creating feedback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(
    supabase: SupabaseClient,
    user: User,
    feedbackId: string
  ): Promise<Feedback> {
    logger.debug('Fetching feedback', { feedbackId, userId: user.id });

    try {
      const { data: feedback, error } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*, projects!inner(user_id)')
        .eq('id', feedbackId)
        .eq('projects.user_id', user.id)
        .single();

      if (error || !feedback) {
        logger.warn('Feedback not found', { feedbackId, userId: user.id });
        throwNotFoundError('Feedback');
      }

      // Remove the projects join data
      const feedbackData = { ...(feedback as Record<string, unknown>) };
      delete (feedbackData as Record<string, unknown>).projects;

      return feedbackData as unknown as Feedback;
    } catch (error) {
      logger.error('Error fetching feedback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all feedback for a project
   */
  async getProjectFeedback(
    supabase: SupabaseClient,
    user: User,
    projectId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: FeedbackStatus;
      priority?: FeedbackPriority;
      search?: string;
    } = {}
  ): Promise<{ feedback: Feedback[]; total: number }> {
    const { limit = 20, offset = 0, status, priority, search } = options;

    logger.debug('Fetching project feedback', {
      projectId,
      userId: user.id,
      limit,
      offset,
    });

    // Verify project exists and belongs to user
    await projectService.getProjectById(supabase, user, projectId);

    try {
      // Get total count
      let countQuery = supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (status) {
        countQuery = countQuery.eq('status', status);
      }
      if (priority) {
        countQuery = countQuery.eq('priority', priority);
      }
      if (search) {
        countQuery = countQuery.or(
          `content.ilike.%${search}%,title.ilike.%${search}%`
        );
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        logger.error('Failed to count feedback', { error: countError.message });
        throwDatabaseError('Failed to count feedback', countError);
      }

      // Get feedback
      let feedbackQuery = supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        feedbackQuery = feedbackQuery.eq('status', status);
      }
      if (priority) {
        feedbackQuery = feedbackQuery.eq('priority', priority);
      }
      if (search) {
        feedbackQuery = feedbackQuery.or(
          `content.ilike.%${search}%,title.ilike.%${search}%`
        );
      }

      const { data: feedback, error } = await feedbackQuery;

      if (error) {
        logger.error('Failed to fetch feedback', { error: error.message });
        throwDatabaseError('Failed to fetch feedback', error);
      }

      logger.info('Project feedback fetched successfully', {
        projectId,
        count: feedback?.length || 0,
        total: count || 0,
      });

      return {
        feedback: (feedback || []) as Feedback[],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error fetching project feedback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all feedback for a user (across all projects)
   */
  async getUserFeedback(
    supabase: SupabaseClient,
    user: User,
    options: {
      limit?: number;
      offset?: number;
      status?: FeedbackStatus;
      priority?: FeedbackPriority;
      search?: string;
      projectId?: string;
    } = {}
  ): Promise<{ feedback: Feedback[]; total: number }> {
    const { limit = 20, offset = 0, status, priority, search, projectId } = options;

    logger.debug('Fetching user feedback', { userId: user.id, limit, offset });

    try {
      // Get total count
      let countQuery = supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*, projects!inner(user_id)', { count: 'exact', head: true })
        .eq('projects.user_id', user.id);

      if (status) {
        countQuery = countQuery.eq('status', status);
      }
      if (priority) {
        countQuery = countQuery.eq('priority', priority);
      }
      if (projectId) {
        countQuery = countQuery.eq('project_id', projectId);
      }
      if (search) {
        countQuery = countQuery.or(
          `content.ilike.%${search}%,title.ilike.%${search}%`
        );
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        logger.error('Failed to count feedback', { error: countError.message });
        throwDatabaseError('Failed to count feedback', countError);
      }

      // Get feedback
      let feedbackQuery = supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*, projects!inner(user_id)')
        .eq('projects.user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        feedbackQuery = feedbackQuery.eq('status', status);
      }
      if (priority) {
        feedbackQuery = feedbackQuery.eq('priority', priority);
      }
      if (projectId) {
        feedbackQuery = feedbackQuery.eq('project_id', projectId);
      }
      if (search) {
        feedbackQuery = feedbackQuery.or(
          `content.ilike.%${search}%,title.ilike.%${search}%`
        );
      }

      const { data: feedback, error } = await feedbackQuery;

      if (error) {
        logger.error('Failed to fetch feedback', { error: error.message });
        throwDatabaseError('Failed to fetch feedback', error);
      }

      // Remove the projects join data
      const cleanedFeedback =
        feedback?.map((item) => {
          const feedbackData = { ...(item as Record<string, unknown>) };
          delete feedbackData.projects;
          return feedbackData;
        }) || [];

      logger.info('User feedback fetched successfully', {
        userId: user.id,
        count: cleanedFeedback.length,
        total: count || 0,
      });

      return {
        feedback: cleanedFeedback as unknown as Feedback[],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error fetching user feedback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(
    supabase: SupabaseClient,
    user: User,
    feedbackId: string
  ): Promise<void> {
    logger.info('Deleting feedback', { feedbackId, userId: user.id });

    // Verify feedback exists and belongs to user
    await this.getFeedbackById(supabase, user, feedbackId);

    try {
      const { error } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .delete()
        .eq('id', feedbackId);

      if (error) {
        logger.error('Failed to delete feedback', { error: error.message });
        throwDatabaseError('Failed to delete feedback', error);
      }

      logger.info('Feedback deleted successfully', { feedbackId });
    } catch (error) {
      logger.error('Error deleting feedback', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Update feedback details/status
   */
  async updateFeedback(
    supabase: SupabaseClient,
    user: User,
    feedbackId: string,
    updates: Partial<CreateFeedbackRequest> & {
      status?: FeedbackStatus;
      internal_notes?: string;
    }
  ): Promise<Feedback> {
    logger.info('Updating feedback', { feedbackId, userId: user.id });

    await this.getFeedbackById(supabase, user, feedbackId);

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) {
      updatePayload.title = updates.title ? sanitizeInput(updates.title) : null;
    }
    if (updates.content !== undefined) {
      updatePayload.content = sanitizeInput(updates.content);
    }
    if (updates.category !== undefined) {
      updatePayload.category = updates.category;
    }
    if (updates.priority !== undefined) {
      updatePayload.priority = updates.priority;
    }
    if (updates.status !== undefined) {
      updatePayload.status = updates.status;
    }
    if (updates.internal_notes !== undefined) {
      updatePayload.internal_notes = updates.internal_notes
        ? sanitizeInput(updates.internal_notes)
        : null;
    }
    if (updates.source !== undefined) {
      updatePayload.source = updates.source || 'manual';
    }
    if (updates.metadata !== undefined) {
      updatePayload.metadata = updates.metadata || {};
    }

    this.validateFeedbackData(
      {
        project_id: '',
        content:
          typeof updatePayload.content === 'string'
            ? updatePayload.content
            : 'existing',
        category: updatePayload.category as FeedbackCategory | undefined,
        priority: updatePayload.priority as FeedbackPriority | undefined,
        status: updatePayload.status as FeedbackStatus | undefined,
        source: updatePayload.source as string | undefined,
      } as CreateFeedbackRequest,
      {
        requireProjectId: false,
        requireContent: false,
      }
    );

    const { data, error } = await supabase
      .from(DB_TABLES.FEEDBACK)
      .update(updatePayload)
      .eq('id', feedbackId)
      .select()
      .single();

    if (error || !data) {
      throwDatabaseError('Failed to update feedback', error);
    }

    return data as Feedback;
  }

  /**
   * Validate feedback data
   */
  private validateFeedbackData(
    data: CreateFeedbackRequest,
    options: {
      requireProjectId?: boolean;
      requireContent?: boolean;
    } = {}
  ): void {
    const requireProjectId = options.requireProjectId ?? true;
    const requireContent = options.requireContent ?? true;

    if (requireProjectId && !data.project_id) {
      throwValidationError('Project ID is required');
    }

    if (data.content && !isValidFeedbackContent(data.content)) {
      throwValidationError(
        `Feedback content must be between ${VALIDATION.FEEDBACK_CONTENT.MIN_LENGTH} and ${VALIDATION.FEEDBACK_CONTENT.MAX_LENGTH} characters`
      );
    }

    if (requireContent && !data.content) {
      throwValidationError('Feedback content is required');
    }

    if (
      data.category &&
      !this.allowedCategories.includes(data.category as FeedbackCategory)
    ) {
      throwValidationError('Invalid feedback category');
    }

    if (
      data.priority &&
      !this.allowedPriorities.includes(data.priority as FeedbackPriority)
    ) {
      throwValidationError('Invalid feedback priority');
    }

    if (
      data.status &&
      !this.allowedStatuses.includes(data.status as FeedbackStatus)
    ) {
      throwValidationError('Invalid feedback status');
    }
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService();

export default feedbackService;
