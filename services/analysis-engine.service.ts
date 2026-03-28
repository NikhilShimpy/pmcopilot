/**
 * PMCopilot - Analysis Engine Service
 *
 * High-level service for comprehensive feedback analysis
 * Wraps the AI engine and handles database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { throwAIError, throwValidationError, throwDatabaseError } from '@/lib/errorHandler';
import { runAnalysisPipeline, validateAnalysisResult } from '@/lib/aiEngine';
import { sanitizeInput, isValidLength } from '@/utils/helpers';
import { VALIDATION, DB_TABLES } from '@/utils/constants';
import {
  ComprehensiveAnalysisResult,
  PipelineContext,
  AnalyzeRequest,
  AnalyzeResponse,
  ValidationResult,
} from '@/types/analysis';

// ============================================
// ANALYSIS ENGINE SERVICE
// ============================================

export class AnalysisEngineService {
  private static instance: AnalysisEngineService;

  private constructor() {
    logger.info('AnalysisEngineService initialized');
  }

  public static getInstance(): AnalysisEngineService {
    if (!AnalysisEngineService.instance) {
      AnalysisEngineService.instance = new AnalysisEngineService();
    }
    return AnalysisEngineService.instance;
  }

  // ==========================================
  // MAIN ANALYSIS METHOD
  // ==========================================

  /**
   * Run comprehensive feedback analysis
   *
   * @param feedback - Raw user feedback (can be multi-line, messy text)
   * @param context - Optional context for better analysis
   * @returns Comprehensive analysis result with problems, features, PRD, tasks, and impact
   */
  async analyzeFeedback(
    feedback: string,
    context?: PipelineContext
  ): Promise<AnalyzeResponse> {
    logger.info('Starting comprehensive feedback analysis', {
      feedbackLength: feedback.length,
      hasContext: !!context,
      projectId: context?.project_id,
    });

    // Validate input
    this.validateFeedbackInput(feedback);

    // Sanitize input
    const sanitizedFeedback = sanitizeInput(feedback);

    try {
      // Run the multi-stage AI pipeline
      const pipelineResult = await runAnalysisPipeline(sanitizedFeedback, context);

      if (!pipelineResult.success || !pipelineResult.result) {
        logger.error('Analysis pipeline failed', {
          error: pipelineResult.error,
        });

        return {
          success: false,
          error: pipelineResult.error || 'Analysis pipeline failed',
          error_code: 'AI_ERROR',
        };
      }

      // Validate the result
      const validationResult = validateAnalysisResult(pipelineResult.result);

      if (!validationResult.valid) {
        logger.warn('Analysis result validation warnings', {
          errors: validationResult.errors,
          warnings: validationResult.warnings,
        });
      }

      logger.info('Feedback analysis completed successfully', {
        analysisId: pipelineResult.result.analysis_id,
        problemsFound: pipelineResult.result.problems.length,
        featuresGenerated: pipelineResult.result.features.length,
        tasksCreated: pipelineResult.result.tasks.length,
        processingTime: pipelineResult.result.processing_time_ms,
        provider: pipelineResult.provider,
      });

      return {
        success: true,
        data: pipelineResult.result,
        provider: pipelineResult.provider,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Error during feedback analysis', {
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        error_code: 'AI_ERROR',
      };
    }
  }

  // ==========================================
  // DATABASE OPERATIONS
  // ==========================================

  /**
   * Save analysis result to database
   * NOTE: feedback_id column removed to simplify schema
   */
  async saveAnalysis(
    supabase: SupabaseClient,
    projectId: string,
    result: ComprehensiveAnalysisResult | any
  ): Promise<{ id: string } | null> {
    logger.info('Saving analysis to database', {
      projectId,
      analysisId: result.analysis_id || result.metadata?.analysis_id,
    });

    try {
      const { data, error } = await supabase
        .from(DB_TABLES.ANALYSES)
        .insert({
          project_id: projectId,
          result: result,
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Failed to save analysis to database', {
          error: error.message,
          code: error.code,
          details: error.details,
          projectId,
        });
        return null;
      }

      logger.info('Analysis saved to database', {
        id: data.id,
        projectId,
      });

      return { id: data.id };
    } catch (error) {
      logger.error('Database error while saving analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  async updateAnalysisResult(
    supabase: SupabaseClient,
    analysisId: string,
    projectId: string,
    result: any
  ): Promise<boolean> {
    logger.info('Updating analysis result', {
      analysisId,
      projectId,
    });

    try {
      const { error } = await supabase
        .from(DB_TABLES.ANALYSES)
        .update({
          result,
        })
        .eq('id', analysisId)
        .eq('project_id', projectId);

      if (error) {
        logger.error('Failed to update analysis result', {
          analysisId,
          projectId,
          error: error.message,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Database error while updating analysis', {
        analysisId,
        projectId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get analysis by ID
   */
  async getAnalysisById(
    supabase: SupabaseClient,
    userId: string,
    analysisId: string
  ): Promise<{ analysis: any; result: ComprehensiveAnalysisResult } | null> {
    logger.info('Fetching analysis by ID', { analysisId, userId });

    try {
      const { data, error } = await supabase
        .from(DB_TABLES.ANALYSES)
        .select('*, projects!inner(user_id, name)')
        .eq('id', analysisId)
        .eq('projects.user_id', userId)
        .single();

      if (error || !data) {
        logger.warn('Analysis not found', { analysisId, error: error?.message });
        return null;
      }

      return {
        analysis: data,
        result: data.result as ComprehensiveAnalysisResult,
      };
    } catch (error) {
      logger.error('Error fetching analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Get analyses for a project
   */
  async getProjectAnalyses(
    supabase: SupabaseClient,
    userId: string,
    projectId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{
    analyses: any[];
    total: number;
  }> {
    const { limit = 20, offset = 0 } = options;

    logger.info('Fetching project analyses', { projectId, userId, limit, offset });

    try {
      // Verify project ownership
      const { data: project, error: projectError } = await supabase
        .from(DB_TABLES.PROJECTS)
        .select('id')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();

      if (projectError || !project) {
        logger.warn('Project not found or access denied', { projectId });
        return { analyses: [], total: 0 };
      }

      // Fetch analyses
      const { data: analyses, error } = await supabase
        .from(DB_TABLES.ANALYSES)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error fetching analyses', { error: error.message });
        return { analyses: [], total: 0 };
      }

      // Get total count
      const { count } = await supabase
        .from(DB_TABLES.ANALYSES)
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      return {
        analyses: analyses || [],
        total: count || 0,
      };
    } catch (error) {
      logger.error('Error in getProjectAnalyses', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { analyses: [], total: 0 };
    }
  }

  /**
   * Delete analysis
   */
  async deleteAnalysis(
    supabase: SupabaseClient,
    userId: string,
    analysisId: string
  ): Promise<boolean> {
    logger.info('Deleting analysis', { analysisId, userId });

    try {
      const { error } = await supabase
        .from(DB_TABLES.ANALYSES)
        .delete()
        .eq('id', analysisId)
        .eq('projects.user_id', userId);

      if (error) {
        logger.error('Error deleting analysis', { error: error.message });
        return false;
      }

      logger.info('Analysis deleted successfully', { analysisId });
      return true;
    } catch (error) {
      logger.error('Error in deleteAnalysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // ==========================================
  // AGGREGATION METHODS
  // ==========================================

  /**
   * Aggregate multiple analyses for a project overview
   */
  aggregateAnalyses(analyses: ComprehensiveAnalysisResult[]): {
    total_analyses: number;
    total_problems: number;
    total_features: number;
    top_problems: any[];
    top_features: any[];
    average_severity: number;
    average_impact: number;
    trend_summary: string;
  } {
    if (analyses.length === 0) {
      return {
        total_analyses: 0,
        total_problems: 0,
        total_features: 0,
        top_problems: [],
        top_features: [],
        average_severity: 0,
        average_impact: 0,
        trend_summary: 'No analyses available',
      };
    }

    // Collect all problems and features
    const allProblems = analyses.flatMap((a) => a.problems);
    const allFeatures = analyses.flatMap((a) => a.features);

    // Calculate averages
    const avgSeverity =
      allProblems.reduce((sum, p) => sum + p.severity_score, 0) / (allProblems.length || 1);
    const avgImpact =
      analyses.reduce((sum, a) => sum + a.impact.user_impact_score, 0) / analyses.length;

    // Group problems by title to find recurring issues
    const problemFrequency: Record<string, { count: number; problem: any }> = {};
    allProblems.forEach((problem) => {
      const key = problem.title.toLowerCase();
      if (!problemFrequency[key]) {
        problemFrequency[key] = { count: 0, problem };
      }
      problemFrequency[key].count++;
    });

    const topProblems = Object.values(problemFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => ({
        ...p.problem,
        occurrence_count: p.count,
      }));

    // Group features by name
    const featureFrequency: Record<string, { count: number; feature: any }> = {};
    allFeatures.forEach((feature) => {
      const key = feature.name.toLowerCase();
      if (!featureFrequency[key]) {
        featureFrequency[key] = { count: 0, feature };
      }
      featureFrequency[key].count++;
    });

    const topFeatures = Object.values(featureFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((f) => ({
        ...f.feature,
        suggestion_count: f.count,
      }));

    // Generate trend summary
    const trendSummary = this.generateTrendSummary(analyses, avgSeverity);

    return {
      total_analyses: analyses.length,
      total_problems: allProblems.length,
      total_features: allFeatures.length,
      top_problems: topProblems,
      top_features: topFeatures,
      average_severity: Math.round(avgSeverity * 10) / 10,
      average_impact: Math.round(avgImpact * 10) / 10,
      trend_summary: trendSummary,
    };
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private validateFeedbackInput(feedback: string): void {
    if (!feedback || feedback.trim() === '') {
      throwValidationError('Feedback cannot be empty');
    }

    if (
      !isValidLength(
        feedback,
        VALIDATION.ANALYSIS_INPUT.MIN_LENGTH,
        VALIDATION.ANALYSIS_INPUT.MAX_LENGTH
      )
    ) {
      throwValidationError(
        `Feedback must be between ${VALIDATION.ANALYSIS_INPUT.MIN_LENGTH} and ${VALIDATION.ANALYSIS_INPUT.MAX_LENGTH} characters`
      );
    }
  }

  private generateTrendSummary(
    analyses: ComprehensiveAnalysisResult[],
    avgSeverity: number
  ): string {
    if (analyses.length < 2) {
      return `Based on ${analyses.length} analysis, average problem severity is ${avgSeverity.toFixed(1)}/10.`;
    }

    // Sort by date
    const sorted = [...analyses].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

    const firstAvgSeverity =
      firstHalf.flatMap((a) => a.problems).reduce((sum, p) => sum + p.severity_score, 0) /
      (firstHalf.flatMap((a) => a.problems).length || 1);

    const secondAvgSeverity =
      secondHalf.flatMap((a) => a.problems).reduce((sum, p) => sum + p.severity_score, 0) /
      (secondHalf.flatMap((a) => a.problems).length || 1);

    if (secondAvgSeverity > firstAvgSeverity + 0.5) {
      return `Problem severity trending UP. Recent analyses show more critical issues.`;
    } else if (secondAvgSeverity < firstAvgSeverity - 0.5) {
      return `Problem severity trending DOWN. Recent feedback shows improvement.`;
    } else {
      return `Problem severity stable at ${avgSeverity.toFixed(1)}/10 across ${analyses.length} analyses.`;
    }
  }
}

// Export singleton instance
export const analysisEngineService = AnalysisEngineService.getInstance();

export default analysisEngineService;
