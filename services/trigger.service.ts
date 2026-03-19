/**
 * PMCopilot - AI Analysis Trigger Service
 *
 * Automatically triggers AI analysis when feedback threshold is reached
 * Includes debouncing and spam prevention
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { feedbackIngestionService } from './ingestion.service'
import { analysisEngineService } from './analysis-engine.service'

// ============================================
// TYPES
// ============================================

interface TriggerConfig {
  feedbackThreshold: number // Minimum feedbacks needed to trigger
  debounceMs: number // Wait time before triggering
  cooldownMs: number // Minimum time between analyses
}

interface TriggerState {
  project_id: string
  lastTriggerTime: number
  pendingTimeout: NodeJS.Timeout | null
  isRunning: boolean
}

// ============================================
// TRIGGER SERVICE
// ============================================

class AnalysisTriggerService {
  private config: TriggerConfig = {
    feedbackThreshold: 5, // Trigger after 5 feedbacks
    debounceMs: 10000, // Wait 10 seconds for more feedbacks
    cooldownMs: 60000, // Wait 1 minute between analyses
  }

  private triggerStates: Map<string, TriggerState> = new Map()

  /**
   * Check if analysis should be triggered
   */
  async checkAndTrigger(supabase: SupabaseClient, projectId: string): Promise<void> {
    try {
      // Get feedback stats
      const stats = await feedbackIngestionService.getFeedbackStats(supabase, projectId)

      logger.info('Checking trigger conditions', {
        projectId,
        totalFeedbacks: stats.total,
        threshold: this.config.feedbackThreshold,
        needsAnalysis: stats.needs_analysis,
      })

      // Check if threshold is met
      if (!stats.needs_analysis || stats.total < this.config.feedbackThreshold) {
        logger.info('Threshold not met, skipping trigger', { projectId })
        return
      }

      // Check cooldown
      if (this.isInCooldown(projectId)) {
        logger.info('Analysis in cooldown period, skipping trigger', { projectId })
        return
      }

      // Check if already running
      if (this.isRunning(projectId)) {
        logger.info('Analysis already running, skipping trigger', { projectId })
        return
      }

      // Schedule debounced trigger
      this.scheduleDebounced(supabase, projectId)
    } catch (error) {
      logger.error('Error checking trigger conditions', { error, projectId })
    }
  }

  /**
   * Schedule a debounced trigger
   */
  private scheduleDebounced(supabase: SupabaseClient, projectId: string): void {
    // Cancel existing pending trigger
    const state = this.triggerStates.get(projectId)
    if (state?.pendingTimeout) {
      clearTimeout(state.pendingTimeout)
      logger.info('Cancelled previous pending trigger', { projectId })
    }

    // Schedule new trigger
    const timeout = setTimeout(async () => {
      await this.executeTrigger(supabase, projectId)
    }, this.config.debounceMs)

    this.triggerStates.set(projectId, {
      project_id: projectId,
      lastTriggerTime: state?.lastTriggerTime || 0,
      pendingTimeout: timeout,
      isRunning: false,
    })

    logger.info('Scheduled debounced trigger', {
      projectId,
      debounceMs: this.config.debounceMs,
    })
  }

  /**
   * Execute the AI analysis trigger
   */
  private async executeTrigger(
    supabase: SupabaseClient,
    projectId: string
  ): Promise<void> {
    try {
      logger.info('Executing AI analysis trigger', { projectId })

      // Mark as running
      const state = this.triggerStates.get(projectId)
      if (state) {
        state.isRunning = true
        state.pendingTimeout = null
      }

      // Get combined feedback text
      const feedbackText = await feedbackIngestionService.getCombinedFeedbackText(
        supabase,
        projectId
      )

      if (!feedbackText) {
        logger.warn('No feedback text available for analysis', { projectId })
        this.resetState(projectId)
        return
      }

      // Get project details for context
      const { data: project } = await supabase
        .from('projects')
        .select('name, description')
        .eq('id', projectId)
        .single()

      // Trigger AI analysis
      logger.info('Starting AI analysis', {
        projectId,
        feedbackLength: feedbackText.length,
      })

      const analysisResult = await analysisEngineService.analyzeFeedback(feedbackText, {
        project_id: projectId,
        project_name: project?.name,
        project_context: project?.description,
      })

      if (analysisResult.success && analysisResult.data) {
        // Save analysis to database
        const savedAnalysis = await analysisEngineService.saveAnalysis(
          supabase,
          projectId,
          analysisResult.data
        )

        if (savedAnalysis) {
          logger.info('Auto-triggered analysis completed and saved', {
            projectId,
            analysisId: savedAnalysis.id,
            provider: analysisResult.provider,
          })
        } else {
          logger.warn('Analysis completed but failed to save', { projectId })
        }
      } else {
        logger.error('Auto-triggered analysis failed', {
          projectId,
          error: analysisResult.error,
        })
      }

      // Update last trigger time
      this.updateLastTriggerTime(projectId)
    } catch (error) {
      logger.error('Error executing trigger', { error, projectId })
    } finally {
      // Reset running state
      this.resetState(projectId)
    }
  }

  /**
   * Check if project is in cooldown period
   */
  private isInCooldown(projectId: string): boolean {
    const state = this.triggerStates.get(projectId)
    if (!state || !state.lastTriggerTime) return false

    const timeSinceLastTrigger = Date.now() - state.lastTriggerTime
    return timeSinceLastTrigger < this.config.cooldownMs
  }

  /**
   * Check if analysis is currently running
   */
  private isRunning(projectId: string): boolean {
    const state = this.triggerStates.get(projectId)
    return state?.isRunning || false
  }

  /**
   * Update last trigger time
   */
  private updateLastTriggerTime(projectId: string): void {
    const state = this.triggerStates.get(projectId) || {
      project_id: projectId,
      lastTriggerTime: 0,
      pendingTimeout: null,
      isRunning: false,
    }

    state.lastTriggerTime = Date.now()
    this.triggerStates.set(projectId, state)
  }

  /**
   * Reset trigger state
   */
  private resetState(projectId: string): void {
    const state = this.triggerStates.get(projectId)
    if (state) {
      state.isRunning = false
      state.pendingTimeout = null
    }
  }

  /**
   * Cancel pending trigger
   */
  cancelPending(projectId: string): void {
    const state = this.triggerStates.get(projectId)
    if (state?.pendingTimeout) {
      clearTimeout(state.pendingTimeout)
      state.pendingTimeout = null
      logger.info('Cancelled pending trigger', { projectId })
    }
  }

  /**
   * Manually trigger analysis (bypass cooldown)
   */
  async manualTrigger(supabase: SupabaseClient, projectId: string): Promise<boolean> {
    try {
      logger.info('Manual trigger initiated', { projectId })

      // Cancel any pending auto-trigger
      this.cancelPending(projectId)

      // Execute immediately
      await this.executeTrigger(supabase, projectId)

      return true
    } catch (error) {
      logger.error('Error in manual trigger', { error, projectId })
      return false
    }
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<TriggerConfig>): void {
    this.config = { ...this.config, ...config }
    logger.info('Trigger configuration updated', { config: this.config })
  }

  /**
   * Get configuration
   */
  getConfig(): TriggerConfig {
    return { ...this.config }
  }

  /**
   * Get trigger state for a project
   */
  getState(projectId: string): TriggerState | null {
    const state = this.triggerStates.get(projectId)
    return state
      ? {
          ...state,
          pendingTimeout: state.pendingTimeout ? ({} as NodeJS.Timeout) : null, // Don't expose timeout
        }
      : null
  }

  /**
   * Check if analysis should be triggered (without actually triggering)
   */
  async shouldTriggerAnalysis(supabase: SupabaseClient, projectId: string): Promise<boolean> {
    try {
      // Get feedback stats
      const stats = await feedbackIngestionService.getFeedbackStats(supabase, projectId)

      // Check if threshold is met
      if (!stats.needs_analysis || stats.total < this.config.feedbackThreshold) {
        return false
      }

      // Check cooldown
      if (this.isInCooldown(projectId)) {
        return false
      }

      // Check if already running
      if (this.isRunning(projectId)) {
        return false
      }

      return true
    } catch (error) {
      logger.error('Error checking if should trigger', { error, projectId })
      return false
    }
  }

  /**
   * Trigger analysis and return result
   */
  async triggerAnalysis(
    supabase: SupabaseClient,
    projectId: string,
    manual: boolean = false
  ): Promise<{ triggered: boolean; analysisId?: string; error?: string }> {
    try {
      logger.info('Triggering analysis', { projectId, manual })

      // Mark as running
      const state = this.triggerStates.get(projectId) || {
        project_id: projectId,
        lastTriggerTime: 0,
        pendingTimeout: null,
        isRunning: false,
      }

      if (!manual && state.isRunning) {
        return { triggered: false, error: 'Analysis already running' }
      }

      state.isRunning = true
      this.triggerStates.set(projectId, state)

      // Get combined feedback text
      const feedbackText = await feedbackIngestionService.getCombinedFeedbackText(
        supabase,
        projectId
      )

      if (!feedbackText) {
        this.resetState(projectId)
        return { triggered: false, error: 'No feedback available' }
      }

      // Get project details for context
      const { data: project } = await supabase
        .from('projects')
        .select('name, description')
        .eq('id', projectId)
        .single()

      // Trigger AI analysis
      const analysisResult = await analysisEngineService.analyzeFeedback(feedbackText, {
        project_id: projectId,
        project_name: project?.name,
        project_context: project?.description,
      })

      if (analysisResult.success && analysisResult.data) {
        // Save analysis to database
        const savedAnalysis = await analysisEngineService.saveAnalysis(
          supabase,
          projectId,
          analysisResult.data
        )

        if (savedAnalysis) {
          logger.info('Analysis triggered and saved', {
            projectId,
            analysisId: savedAnalysis.id,
            manual,
          })

          // Update last trigger time
          this.updateLastTriggerTime(projectId)
          this.resetState(projectId)

          return { triggered: true, analysisId: savedAnalysis.id }
        } else {
          this.resetState(projectId)
          return { triggered: false, error: 'Failed to save analysis' }
        }
      } else {
        this.resetState(projectId)
        return { triggered: false, error: analysisResult.error || 'Analysis failed' }
      }
    } catch (error) {
      logger.error('Error triggering analysis', { error, projectId })
      this.resetState(projectId)
      return { triggered: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Clear all states (for testing/cleanup)
   */
  clearAllStates(): void {
    this.triggerStates.forEach((state) => {
      if (state.pendingTimeout) {
        clearTimeout(state.pendingTimeout)
      }
    })
    this.triggerStates.clear()
    logger.info('All trigger states cleared')
  }
}

// Export singleton instance
export const analysisTriggerService = new AnalysisTriggerService()
export const triggerService = analysisTriggerService // Alias for convenience
