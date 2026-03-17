import { analyzeFeedbackWithAI } from '@/lib/aiClient';
import { logger } from '@/lib/logger';
import { throwAIError, throwValidationError } from '@/lib/errorHandler';
import { AIResponse, AnalysisResult } from '@/types';
import { sanitizeInput, isValidLength } from '@/utils/helpers';
import { VALIDATION } from '@/utils/constants';

/**
 * Service for AI-related operations
 */
export class AIService {
  /**
   * Analyze feedback with AI
   */
  async analyzeFeedback(
    feedback: string,
    context?: string
  ): Promise<AnalysisResult> {
    logger.info('Starting feedback analysis', {
      feedbackLength: feedback.length,
      hasContext: !!context,
    });

    // Validate input
    this.validateFeedbackInput(feedback);

    // Sanitize input
    const sanitizedFeedback = sanitizeInput(feedback);
    const sanitizedContext = context ? sanitizeInput(context) : undefined;

    try {
      // Call AI service
      const response: AIResponse = await analyzeFeedbackWithAI(
        sanitizedFeedback,
        sanitizedContext
      );

      // Check if AI call was successful
      if (!response.success || !response.data) {
        logger.error('AI analysis failed', { error: response.error });
        throwAIError(
          response.error || 'AI analysis failed to produce results'
        );
      }

      // Validate response schema
      const validatedResult = this.validateAnalysisResult(response.data);

      logger.info('Feedback analysis completed successfully', {
        provider: response.provider,
        sentiment: validatedResult.sentiment,
        themesCount: validatedResult.themes.length,
        insightsCount: validatedResult.actionableInsights.length,
      });

      return validatedResult;
    } catch (error) {
      logger.error('Error during feedback analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error && error.message.includes('AI')) {
        throw error;
      }

      throwAIError('Failed to analyze feedback. Please try again later.');
    }
  }

  /**
   * Batch analyze multiple feedbacks
   */
  async analyzeBatchFeedback(
    feedbacks: string[],
    context?: string
  ): Promise<AnalysisResult[]> {
    logger.info('Starting batch feedback analysis', {
      count: feedbacks.length,
    });

    const results: AnalysisResult[] = [];

    for (const feedback of feedbacks) {
      try {
        const result = await this.analyzeFeedback(feedback, context);
        results.push(result);
      } catch (error) {
        logger.error('Failed to analyze feedback in batch', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with next feedback even if one fails
      }
    }

    logger.info('Batch feedback analysis completed', {
      total: feedbacks.length,
      successful: results.length,
    });

    return results;
  }

  /**
   * Generate summary from multiple analyses
   */
  aggregateAnalyses(analyses: AnalysisResult[]): {
    overallSentiment: string;
    commonThemes: string[];
    topInsights: any[];
    totalAnalyzed: number;
  } {
    if (analyses.length === 0) {
      return {
        overallSentiment: 'neutral',
        commonThemes: [],
        topInsights: [],
        totalAnalyzed: 0,
      };
    }

    // Calculate overall sentiment
    const sentimentCounts: Record<string, number> = {};
    analyses.forEach((analysis) => {
      sentimentCounts[analysis.sentiment] =
        (sentimentCounts[analysis.sentiment] || 0) + 1;
    });

    const overallSentiment = Object.entries(sentimentCounts).reduce((a, b) =>
      a[1] > b[1] ? a : b
    )[0];

    // Extract common themes
    const themeFrequency: Record<string, number> = {};
    analyses.forEach((analysis) => {
      analysis.themes.forEach((theme) => {
        themeFrequency[theme] = (themeFrequency[theme] || 0) + 1;
      });
    });

    const commonThemes = Object.entries(themeFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme]) => theme);

    // Get top insights
    const allInsights = analyses.flatMap(
      (analysis) => analysis.actionableInsights
    );
    const topInsights = allInsights
      .filter((insight) => insight.impact === 'high')
      .slice(0, 10);

    return {
      overallSentiment,
      commonThemes,
      topInsights,
      totalAnalyzed: analyses.length,
    };
  }

  /**
   * Validate feedback input
   */
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

  /**
   * Validate analysis result schema
   */
  private validateAnalysisResult(result: AnalysisResult): AnalysisResult {
    // Ensure required fields exist
    if (!result.sentiment || !result.summary) {
      throwAIError('Invalid AI response format: missing required fields');
    }

    // Ensure arrays are valid
    if (!Array.isArray(result.themes)) {
      result.themes = [];
    }

    if (!Array.isArray(result.actionableInsights)) {
      result.actionableInsights = [];
    }

    // Ensure confidence is a valid number
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      result.confidence = 0.5;
    }

    return result;
  }
}

// Export singleton instance
export const aiService = new AIService();

export default aiService;
