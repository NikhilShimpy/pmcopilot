import { SupabaseClient } from '@supabase/supabase-js';
import { Feedback, CreateFeedbackRequest, User } from '@/types';
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
      content: sanitizeInput(data.content),
      source: data.source ? sanitizeInput(data.source) : null,
      metadata: data.metadata || null,
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
      const { projects, ...feedbackData } = feedback as any;

      return feedbackData as Feedback;
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
    } = {}
  ): Promise<{ feedback: Feedback[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

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
      const { count, error: countError } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (countError) {
        logger.error('Failed to count feedback', { error: countError.message });
        throwDatabaseError('Failed to count feedback', countError);
      }

      // Get feedback
      const { data: feedback, error } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

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
    } = {}
  ): Promise<{ feedback: Feedback[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    logger.debug('Fetching user feedback', { userId: user.id, limit, offset });

    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*, projects!inner(user_id)', { count: 'exact', head: true })
        .eq('projects.user_id', user.id);

      if (countError) {
        logger.error('Failed to count feedback', { error: countError.message });
        throwDatabaseError('Failed to count feedback', countError);
      }

      // Get feedback
      const { data: feedback, error } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*, projects!inner(user_id)')
        .eq('projects.user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Failed to fetch feedback', { error: error.message });
        throwDatabaseError('Failed to fetch feedback', error);
      }

      // Remove the projects join data
      const cleanedFeedback =
        feedback?.map(({ projects, ...feedbackData }: any) => feedbackData) ||
        [];

      logger.info('User feedback fetched successfully', {
        userId: user.id,
        count: cleanedFeedback.length,
        total: count || 0,
      });

      return {
        feedback: cleanedFeedback as Feedback[],
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
   * Validate feedback data
   */
  private validateFeedbackData(data: CreateFeedbackRequest): void {
    if (!data.project_id) {
      throwValidationError('Project ID is required');
    }

    if (!data.content || !isValidFeedbackContent(data.content)) {
      throwValidationError(
        `Feedback content must be between ${VALIDATION.FEEDBACK_CONTENT.MIN_LENGTH} and ${VALIDATION.FEEDBACK_CONTENT.MAX_LENGTH} characters`
      );
    }
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService();

export default feedbackService;
