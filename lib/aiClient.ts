import axios, { AxiosError } from 'axios';
import { config } from './config';
import { logger } from './logger';
import { AIMessage, AIResponse, AnalysisResult } from '@/types';
import { AI_CONFIG } from '@/utils/constants';
import { retry } from '@/utils/helpers';

/**
 * Load Puter.js dynamically
 */
async function loadPuterScript(): Promise<any> {
  // Check if we're in browser environment
  if (typeof window === 'undefined') {
    throw new Error('Puter.js can only be used in browser environment');
  }

  // Check if puter is already loaded
  if ((window as any).puter) {
    return (window as any).puter;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = AI_CONFIG.PUTER.SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      if ((window as any).puter) {
        logger.info('Puter.js loaded successfully');
        resolve((window as any).puter);
      } else {
        reject(new Error('Puter.js loaded but not available'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Puter.js'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Call OpenRouter API
 */
async function callOpenRouter(
  messages: AIMessage[],
  temperature: number = AI_CONFIG.DEFAULT_TEMPERATURE
): Promise<AnalysisResult> {
  const url = `${AI_CONFIG.OPENROUTER.BASE_URL}${AI_CONFIG.OPENROUTER.CHAT_ENDPOINT}`;

  logger.ai('Calling OpenRouter API', 'openrouter', {
    messageCount: messages.length,
  });

  try {
    const response = await axios.post(
      url,
      {
        model: AI_CONFIG.OPENROUTER.DEFAULT_MODEL,
        messages,
        temperature,
        max_tokens: AI_CONFIG.DEFAULT_MAX_TOKENS,
      },
      {
        headers: {
          Authorization: `Bearer ${config.openrouter.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://pmcopilot.app',
          'X-Title': 'PMCopilot',
        },
        timeout: AI_CONFIG.OPENROUTER.TIMEOUT,
      }
    );

    const content = response.data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenRouter response');
    }

    // Parse JSON response
    const result = parseAIResponse(content);

    logger.ai('OpenRouter API call successful', 'openrouter');
    return result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error('OpenRouter API call failed', {
        status: axiosError.response?.status,
        message: axiosError.message,
      });

      throw new Error(
        `OpenRouter API failed: ${axiosError.response?.status || axiosError.message}`
      );
    }

    throw error;
  }
}

/**
 * Call Puter AI (fallback)
 */
async function callPuter(
  messages: AIMessage[],
  temperature: number = AI_CONFIG.DEFAULT_TEMPERATURE
): Promise<AnalysisResult> {
  logger.ai('Attempting Puter AI fallback', 'puter');

  try {
    const puter = await loadPuterScript();

    // Convert messages to Puter format
    const prompt = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    const response = await Promise.race([
      puter.ai.chat(prompt, {
        temperature,
        model: 'claude-3-sonnet', // Puter's default model
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Puter request timeout')), AI_CONFIG.PUTER.TIMEOUT)
      ),
    ]);

    // Parse response
    const result = parseAIResponse(response as string);

    logger.ai('Puter AI call successful', 'puter');
    return result;
  } catch (error) {
    logger.error('Puter AI call failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(content: string): AnalysisResult {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(content);
    return validateAnalysisResult(parsed);
  } catch {
    // If not JSON, try to extract structured data
    logger.warn('AI response is not valid JSON, attempting to extract data');

    // Create a basic structure from text
    return {
      sentiment: 'neutral',
      themes: [],
      actionableInsights: [],
      summary: content.substring(0, 500),
      confidence: 0.5,
    };
  }
}

/**
 * Validate and normalize analysis result
 */
function validateAnalysisResult(data: any): AnalysisResult {
  return {
    sentiment: data.sentiment || 'neutral',
    themes: Array.isArray(data.themes) ? data.themes : [],
    actionableInsights: Array.isArray(data.actionableInsights)
      ? data.actionableInsights
      : [],
    summary: data.summary || '',
    confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
    priorities: Array.isArray(data.priorities) ? data.priorities : undefined,
  };
}

/**
 * Main AI chat function with automatic fallback
 */
export async function generateCompletion(
  messages: AIMessage[],
  options: {
    temperature?: number;
    useRetry?: boolean;
  } = {}
): Promise<AIResponse> {
  const { temperature = AI_CONFIG.DEFAULT_TEMPERATURE, useRetry = true } = options;

  let lastError: Error | null = null;

  // Try OpenRouter first
  try {
    logger.info('Attempting AI completion with OpenRouter');

    const executeRequest = async () => callOpenRouter(messages, temperature);

    const result = useRetry
      ? await retry(executeRequest, AI_CONFIG.MAX_RETRIES)
      : await executeRequest();

    return {
      success: true,
      data: result,
      provider: 'openrouter',
    };
  } catch (error) {
    lastError = error as Error;
    logger.warn('OpenRouter failed, attempting Puter fallback', {
      error: lastError.message,
    });
  }

  // Fallback to Puter
  try {
    logger.info('Attempting AI completion with Puter');

    const result = await callPuter(messages, temperature);

    return {
      success: true,
      data: result,
      provider: 'puter',
    };
  } catch (error) {
    logger.error('All AI providers failed', {
      openrouterError: lastError?.message,
      puterError: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: 'All AI providers are currently unavailable',
      provider: undefined,
    };
  }
}

/**
 * Build system prompt for product feedback analysis
 */
export function buildAnalysisPrompt(feedback: string, context?: string): AIMessage[] {
  const systemPrompt = `You are an expert product manager and user researcher. Your task is to analyze user feedback and provide actionable insights.

Analyze the feedback and respond with a JSON object containing:
- sentiment: overall sentiment (positive, negative, neutral, or mixed)
- themes: array of key themes identified
- actionableInsights: array of insights with {category, insight, impact (high/medium/low), effort (high/medium/low), suggestedAction}
- summary: brief summary of the feedback
- confidence: confidence score (0-1)
- priorities: optional array of {title, description, urgency (critical/high/medium/low)}

Be concise, specific, and focus on actionable insights.`;

  const userPrompt = context
    ? `Context: ${context}\n\nFeedback to analyze:\n${feedback}`
    : `Feedback to analyze:\n${feedback}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * Quick feedback analysis helper
 */
export async function analyzeFeedbackWithAI(
  feedback: string,
  context?: string
): Promise<AIResponse> {
  const messages = buildAnalysisPrompt(feedback, context);
  return generateCompletion(messages);
}

export default {
  generateCompletion,
  analyzeFeedbackWithAI,
  buildAnalysisPrompt,
};
