/**
 * PMCopilot - Feedback Ingestion Service
 *
 * Handles feedback collection from multiple sources:
 * - Manual input
 * - Gmail integration
 * - Slack integration
 * - Intercom (simulated)
 * - Generic webhook
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { DB_TABLES } from '@/utils/constants'

// ============================================
// TYPES
// ============================================

export type FeedbackSource = 'manual' | 'gmail' | 'slack' | 'intercom' | 'webhook' | 'api'

export interface Feedback {
  id: string
  project_id: string
  source: FeedbackSource
  content: string
  metadata?: Record<string, any>
  created_at: string
  updated_at?: string
}

export interface SaveFeedbackParams {
  project_id: string
  content: string
  source: FeedbackSource
  metadata?: Record<string, any>
}

export interface FeedbackStats {
  total: number
  by_source: Record<FeedbackSource, number>
  last_24h: number
  needs_analysis: boolean
}

// ============================================
// INGESTION SERVICE
// ============================================

class FeedbackIngestionService {
  /**
   * Save feedback to database
   */
  async saveFeedback(
    supabase: SupabaseClient,
    params: SaveFeedbackParams
  ): Promise<Feedback | null> {
    try {
      // Validate content
      if (!params.content || params.content.trim().length === 0) {
        throw new Error('Feedback content cannot be empty')
      }

      if (params.content.length > 10000) {
        throw new Error('Feedback content too long (max 10000 characters)')
      }

      // Sanitize content
      const sanitizedContent = this.sanitizeContent(params.content)

      // Save to database
      const { data, error } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .insert({
          project_id: params.project_id,
          source: params.source,
          content: sanitizedContent,
          metadata: params.metadata || {},
        })
        .select()
        .single()

      if (error) {
        logger.error('Failed to save feedback', { error: error.message })
        throw error
      }

      logger.info('Feedback saved successfully', {
        feedbackId: data.id,
        projectId: params.project_id,
        source: params.source,
      })

      return data as Feedback
    } catch (error) {
      logger.error('Error saving feedback', { error })
      return null
    }
  }

  /**
   * Batch save multiple feedbacks
   */
  async batchSaveFeedbacks(
    supabase: SupabaseClient,
    feedbacks: SaveFeedbackParams[]
  ): Promise<{ saved: number; failed: number }> {
    let saved = 0
    let failed = 0

    for (const feedback of feedbacks) {
      const result = await this.saveFeedback(supabase, feedback)
      if (result) {
        saved++
      } else {
        failed++
      }
    }

    logger.info('Batch feedback save completed', { saved, failed })

    return { saved, failed }
  }

  /**
   * Get feedbacks for a project
   */
  async getFeedbacks(
    supabase: SupabaseClient,
    projectId: string,
    options?: {
      limit?: number
      offset?: number
      source?: FeedbackSource
      startDate?: Date
      endDate?: Date
    }
  ): Promise<Feedback[]> {
    try {
      let query = supabase
        .from(DB_TABLES.FEEDBACK)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (options?.source) {
        query = query.eq('source', options.source)
      }

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString())
      }

      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString())
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1)
      }

      const { data, error } = await query

      if (error) {
        logger.error('Failed to fetch feedbacks', { error: error.message })
        throw error
      }

      return (data || []) as Feedback[]
    } catch (error) {
      logger.error('Error fetching feedbacks', { error })
      return []
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStats(
    supabase: SupabaseClient,
    projectId: string
  ): Promise<FeedbackStats> {
    try {
      // Get all feedbacks
      const { data: allFeedbacks, error } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .select('source, created_at')
        .eq('project_id', projectId)

      if (error) throw error

      const feedbacks = allFeedbacks || []
      const total = feedbacks.length

      // Count by source
      const by_source: Record<string, number> = {
        manual: 0,
        gmail: 0,
        slack: 0,
        intercom: 0,
        webhook: 0,
        api: 0,
      }

      let last_24h = 0
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      feedbacks.forEach((f: any) => {
        by_source[f.source] = (by_source[f.source] || 0) + 1

        const createdAt = new Date(f.created_at)
        if (createdAt >= oneDayAgo) {
          last_24h++
        }
      })

      // Determine if analysis is needed (threshold: 5 feedbacks)
      const needs_analysis = total >= 5

      return {
        total,
        by_source: by_source as Record<FeedbackSource, number>,
        last_24h,
        needs_analysis,
      }
    } catch (error) {
      logger.error('Error getting feedback stats', { error })
      return {
        total: 0,
        by_source: { manual: 0, gmail: 0, slack: 0, intercom: 0, webhook: 0, api: 0 },
        last_24h: 0,
        needs_analysis: false,
      }
    }
  }

  /**
   * Delete feedback
   */
  async deleteFeedback(
    supabase: SupabaseClient,
    feedbackId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(DB_TABLES.FEEDBACK)
        .delete()
        .eq('id', feedbackId)

      if (error) {
        logger.error('Failed to delete feedback', { error: error.message })
        return false
      }

      logger.info('Feedback deleted successfully', { feedbackId })
      return true
    } catch (error) {
      logger.error('Error deleting feedback', { error })
      return false
    }
  }

  /**
   * Get combined feedback text for AI analysis
   */
  async getCombinedFeedbackText(
    supabase: SupabaseClient,
    projectId: string
  ): Promise<string> {
    try {
      const feedbacks = await this.getFeedbacks(supabase, projectId, { limit: 100 })

      if (feedbacks.length === 0) {
        return ''
      }

      // Combine all feedback with metadata
      const combined = feedbacks
        .map((f, index) => {
          const source = f.source.toUpperCase()
          const timestamp = new Date(f.created_at).toLocaleDateString()
          return `[FEEDBACK #${index + 1}] [${source}] [${timestamp}]\n${f.content}\n`
        })
        .join('\n---\n\n')

      return combined
    } catch (error) {
      logger.error('Error getting combined feedback text', { error })
      return ''
    }
  }

  /**
   * Sanitize feedback content
   */
  private sanitizeContent(content: string): string {
    // Remove excessive whitespace
    let sanitized = content.trim().replace(/\s+/g, ' ')

    // Remove potentially harmful HTML/scripts
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')

    return sanitized
  }

  /**
   * Parse Gmail email format
   */
  parseGmailEmail(emailData: any): SaveFeedbackParams | null {
    try {
      const { subject, from, body, date } = emailData

      return {
        project_id: emailData.project_id,
        content: `${subject}\n\n${body}`,
        source: 'gmail',
        metadata: {
          subject,
          from,
          date,
          email_id: emailData.id,
        },
      }
    } catch (error) {
      logger.error('Error parsing Gmail email', { error })
      return null
    }
  }

  /**
   * Parse Slack message format
   */
  parseSlackMessage(messageData: any): SaveFeedbackParams | null {
    try {
      const { text, user, channel, ts } = messageData

      return {
        project_id: messageData.project_id,
        content: text,
        source: 'slack',
        metadata: {
          user,
          channel,
          timestamp: ts,
          thread_ts: messageData.thread_ts,
        },
      }
    } catch (error) {
      logger.error('Error parsing Slack message', { error })
      return null
    }
  }
}

// Export singleton instance
export const feedbackIngestionService = new FeedbackIngestionService()
