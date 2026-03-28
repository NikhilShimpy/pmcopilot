/**
 * PMCopilot - Core AI Analysis Engine v3.0
 *
 * PRODUCTION-READY AI PIPELINE
 * PROVIDER: Google Gemini API (free-tier only)
 *
 * REMOVED: Ollama, HuggingFace, OpenRouter
 */

import axios from 'axios';
import { assertGeminiFreeTierConfig, config, FREE_TIER_MODELS } from './config';
import { logger } from './logger';
import { AI_CONFIG } from '@/utils/constants';
import { retry, sleep } from '@/utils/helpers';
import {
  PipelineStage,
  StageResult,
  ComprehensiveAnalysisResult,
  Problem,
  Feature,
  PRD,
  DevelopmentTask,
  ImpactEstimation,
  CleanedFeedback,
  FeedbackCluster,
  PipelineContext,
  ValidationResult,
  ValidationError,
} from '@/types/analysis';

// ============================================
// TYPES
// ============================================

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ClaudeResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ============================================
// RATE LIMIT TRACKING
// ============================================

interface RateLimitState {
  lastError: Date | null;
  consecutiveErrors: number;
  backoffUntil: Date | null;
}

const rateLimitState: Record<string, RateLimitState> = {
  gemini: { lastError: null, consecutiveErrors: 0, backoffUntil: null },
  groq: { lastError: null, consecutiveErrors: 0, backoffUntil: null },
  claude: { lastError: null, consecutiveErrors: 0, backoffUntil: null },
};

function isRateLimited(provider: 'gemini' | 'groq' | 'claude'): boolean {
  const state = rateLimitState[provider];
  if (!state.backoffUntil) return false;
  return new Date() < state.backoffUntil;
}

function recordRateLimitError(
  provider: 'gemini' | 'groq' | 'claude',
  customBackoffSeconds?: number,
  reason: 'rate_limit' | 'spending_cap' = 'rate_limit'
) {
  const state = rateLimitState[provider];
  state.lastError = new Date();
  state.consecutiveErrors++;
  // Exponential backoff: 30s, 60s, 120s, 240s, max 5min
  const backoffSeconds =
    customBackoffSeconds ??
    Math.min(30 * Math.pow(2, state.consecutiveErrors - 1), 300);
  state.backoffUntil = new Date(Date.now() + backoffSeconds * 1000);
  logger.warn(`Rate limit recorded for ${provider}`, {
    reason,
    consecutiveErrors: state.consecutiveErrors,
    backoffUntil: state.backoffUntil.toISOString(),
    backoffSeconds,
  });
}

function recordSuccess(provider: 'gemini' | 'groq' | 'claude') {
  const state = rateLimitState[provider];
  state.consecutiveErrors = 0;
  state.backoffUntil = null;
}

// Reset rate limits - useful for debugging or forced retry
export function resetRateLimits() {
  rateLimitState.gemini = { lastError: null, consecutiveErrors: 0, backoffUntil: null };
  rateLimitState.groq = { lastError: null, consecutiveErrors: 0, backoffUntil: null };
  logger.info('🔄 Rate limits reset');
}

// Get current rate limit status for debugging
export function getRateLimitStatus(): Record<string, { isLimited: boolean; backoffUntil: string | null; errors: number }> {
  return {
    gemini: {
      isLimited: isRateLimited('gemini'),
      backoffUntil: rateLimitState.gemini.backoffUntil?.toISOString() || null,
      errors: rateLimitState.gemini.consecutiveErrors,
    },
    groq: {
      isLimited: isRateLimited('groq'),
      backoffUntil: rateLimitState.groq.backoffUntil?.toISOString() || null,
      errors: rateLimitState.groq.consecutiveErrors,
    },
    claude: {
      isLimited: isRateLimited('claude'),
      backoffUntil: rateLimitState.claude.backoffUntil?.toISOString() || null,
      errors: rateLimitState.claude.consecutiveErrors,
    },
  };
}

// ============================================
// ERROR CLASSIFICATION
// ============================================

interface GeminiErrorClassification {
  type: 'config_error' | 'rate_limit' | 'transient_error' | 'unknown';
  shouldFallback: boolean;
  shouldRetry: boolean;
  message: string;
}

function classifyGeminiError(error: any): GeminiErrorClassification {
  if (!error.response) {
    // Network error or timeout
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return {
        type: 'transient_error',
        shouldFallback: true,
        shouldRetry: true,
        message: 'Network timeout',
      };
    }
    return {
      type: 'transient_error',
      shouldFallback: true,
      shouldRetry: true,
      message: error.message || 'Network error',
    };
  }

  const status = error.response.status;
  const errorData = error.response.data;
  const errorMessage = typeof errorData === 'string' 
    ? errorData 
    : JSON.stringify(errorData || '');

  // CONFIG ERRORS - Do NOT fallback, fail loudly
  if (status === 400) {
    return {
      type: 'config_error',
      shouldFallback: false,
      shouldRetry: false,
      message: `Bad request: ${errorMessage.substring(0, 200)}`,
    };
  }
  
  if (status === 401) {
    return {
      type: 'config_error',
      shouldFallback: false,
      shouldRetry: false,
      message: 'Invalid API key - check GEMINI_API_KEY',
    };
  }
  
  if (status === 403) {
    return {
      type: 'config_error',
      shouldFallback: false,
      shouldRetry: false,
      message: 'Permission denied - API key may lack permissions or billing not enabled',
    };
  }
  
  if (status === 404) {
    // Model not found - THIS IS A CONFIG ERROR, NOT RATE LIMIT
    return {
      type: 'config_error',
      shouldFallback: false,
      shouldRetry: false,
      message: `Model not found: ${config.gemini.model}. Free-tier allowed models: ${FREE_TIER_MODELS.join(', ')}`,
    };
  }

  // RATE LIMIT - Allow fallback
  if (status === 429) {
    // Check if it's a spending cap vs rate limit
    const errorMessage = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);
    const isSpendingCap = errorMessage.includes('spending cap') || errorMessage.includes('billing');
    
    if (isSpendingCap) {
      // Spending cap - longer backoff, immediate fallback
      return {
        type: 'config_error', // Treat as config issue, not transient
        shouldFallback: true,
        shouldRetry: false,
        message: 'Gemini free-tier quota/cap exceeded. Retry later or reduce token usage.',
      };
    }
    
    // Regular rate limit
    return {
      type: 'rate_limit',
      shouldFallback: true,
      shouldRetry: false, // Don't retry 429, fallback immediately
      message: 'Rate limit exceeded',
    };
  }

  // TRANSIENT ERRORS - Allow fallback and retry
  if (status >= 500 && status <= 599) {
    return {
      type: 'transient_error',
      shouldFallback: true,
      shouldRetry: true,
      message: `Server error: ${status}`,
    };
  }

  // Unknown error - allow fallback but log
  return {
    type: 'unknown',
    shouldFallback: true,
    shouldRetry: false,
    message: `Unknown error: ${status} - ${errorMessage.substring(0, 100)}`,
  };
}

function isTransientError(error: any): boolean {
  const classification = classifyGeminiError(error);
  return classification.type === 'transient_error' || classification.type === 'rate_limit';
}

function isRateLimitError(error: any): boolean {
  if (!error.response) return false;
  const status = error.response.status;
  // ONLY 429 is a rate limit error
  // 503 can be rate limit but we classify it as transient
  return status === 429;
}

// ============================================
// GEMINI API CLIENT (PRIMARY)
// ============================================

async function callGemini(
  messages: AIMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const {
    temperature = AI_CONFIG.DEFAULT_TEMPERATURE,
    max_tokens = AI_CONFIG.DEFAULT_MAX_TOKENS,
    timeout = AI_CONFIG.GEMINI.TIMEOUT,
    jsonMode = true,
  } = options;

  // Check if we're in backoff period
  if (isRateLimited('gemini')) {
    const state = rateLimitState.gemini;
    logger.warn('Gemini is rate-limited, skipping attempt', {
      backoffUntil: state.backoffUntil?.toISOString(),
    });
    throw new Error(`Gemini rate-limited until ${state.backoffUntil?.toISOString()}`);
  }

  assertGeminiFreeTierConfig();
  const model = config.gemini.model;
  const url = `${AI_CONFIG.GEMINI.BASE_URL}/${model}:generateContent?key=${config.gemini.apiKey}`;

  logger.ai('Calling Gemini API (PRIMARY)', 'gemini', {
    messageCount: messages.length,
    model,
    jsonMode,
    maxTokens: max_tokens,
  });

  try {
    // Convert messages to Gemini format
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const contents = userMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const generationConfig: any = {
      temperature,
      maxOutputTokens: Math.min(max_tokens, 4096),
    };

    // Only add JSON mode for analysis, not for chat
    if (jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const requestBody: any = {
      contents,
      generationConfig,
    };

    // Add system instruction if present
    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    const response = await axios.post<GeminiResponse>(
      url,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
      }
    );

    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    // Success - reset rate limit tracking
    recordSuccess('gemini');

    logger.ai('✅ Gemini API call SUCCESSFUL', 'gemini', {
      tokens: response.data.usageMetadata?.totalTokenCount,
      model,
      responseLength: content.length,
    });

    // Detailed token usage logging for monitoring output truncation
    const outputTokens = response.data.usageMetadata?.candidatesTokenCount;

    logger.info('📊 Gemini token usage details', {
      inputTokens: response.data.usageMetadata?.promptTokenCount ?? 'unknown',
      outputTokens: outputTokens ?? 'unknown',
      totalTokens: response.data.usageMetadata?.totalTokenCount ?? 'unknown',
      maxOutputTokens: generationConfig.maxOutputTokens,
      outputUtilization: outputTokens !== undefined
        ? `${Math.round((outputTokens / generationConfig.maxOutputTokens) * 100)}%`
        : 'unknown',
      truncated: outputTokens !== undefined && outputTokens >= generationConfig.maxOutputTokens ? '⚠️ YES' : 'no',
    });

    return content;
  } catch (error: any) {
    const classification = classifyGeminiError(error);
    
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      logger.error('❌ Gemini API ERROR', {
        status,
        statusText: error.response.statusText,
        data: JSON.stringify(errorData).substring(0, 500),
        model,
        errorType: classification.type,
        shouldFallback: classification.shouldFallback,
        classificationMessage: classification.message,
      });

      // Spending-cap exhaustion should skip Gemini for longer and fall back.
      if (
        classification.type === 'rate_limit' ||
        (classification.type === 'config_error' && classification.shouldFallback)
      ) {
        const isSpendingCap = classification.message.includes('Spending cap exceeded');
        recordRateLimitError(
          'gemini',
          isSpendingCap ? 1800 : undefined,
          isSpendingCap ? 'spending_cap' : 'rate_limit'
        );
      }
      
      // For config errors, preserve whether fallback is allowed.
      if (classification.type === 'config_error') {
        const configError = new Error(`GEMINI_CONFIG_ERROR: ${classification.message}`);
        (configError as any).isConfigError = true;
        (configError as any).shouldFallback = classification.shouldFallback;
        throw configError;
      }
    } else if (error.code === 'ECONNABORTED') {
      logger.error('❌ Gemini API TIMEOUT', { timeout, model });
    } else {
      logger.error('❌ Gemini API UNKNOWN ERROR', { 
        message: error.message,
        model,
      });
    }
    throw error;
  }
}

// ============================================
// GROQ API CLIENT (FALLBACK ONLY)
// ============================================

async function callGroq(
  messages: AIMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const {
    temperature = AI_CONFIG.DEFAULT_TEMPERATURE,
    max_tokens = AI_CONFIG.DEFAULT_MAX_TOKENS,
    timeout = AI_CONFIG.GROQ.TIMEOUT,
    jsonMode = true,
  } = options;

  // Check if we're in backoff period
  if (isRateLimited('groq')) {
    const state = rateLimitState.groq;
    logger.warn('Groq is rate-limited, skipping attempt', {
      backoffUntil: state.backoffUntil?.toISOString(),
    });
    throw new Error(`Groq rate-limited until ${state.backoffUntil?.toISOString()}`);
  }

  // Cap max_tokens to Groq's limit (32768 for llama-3.3-70b-versatile)
  const safeMaxTokens = Math.min(max_tokens, 32768);
  const model = AI_CONFIG.GROQ.DEFAULT_MODEL;
  const url = `${AI_CONFIG.GROQ.BASE_URL}${AI_CONFIG.GROQ.CHAT_ENDPOINT}`;

  logger.ai('Calling Groq API (FALLBACK)', 'groq', {
    messageCount: messages.length,
    model,
    jsonMode,
    maxTokens: safeMaxTokens,
  });

  try {
    const requestBody: any = {
      model,
      messages,
      temperature,
      max_tokens: safeMaxTokens,
    };

    // Only add JSON format for analysis calls, not chat
    if (jsonMode) {
      // For JSON mode, ensure the message contains "json" word (Groq requirement)
      const hasJsonKeyword = messages.some(m =>
        m.content.toLowerCase().includes('json')
      );
      if (hasJsonKeyword) {
        requestBody.response_format = { type: 'json_object' };
      }
    }

    const response = await axios.post<GroqResponse>(
      url,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${config.groq.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout,
      }
    );

    const content = response.data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in Groq response');
    }

    // Success - reset rate limit tracking
    recordSuccess('groq');

    logger.ai('✅ Groq API call SUCCESSFUL', 'groq', {
      tokens: response.data.usage?.total_tokens,
      model,
      responseLength: content.length,
    });

    return content;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      logger.error('❌ Groq API ERROR', {
        status,
        statusText: error.response.statusText,
        data: JSON.stringify(errorData).substring(0, 500),
        model,
        isRateLimit: isRateLimitError(error),
      });

      // Track rate limit errors
      if (isRateLimitError(error)) {
        recordRateLimitError('groq');
      }
    } else if (error.code === 'ECONNABORTED') {
      logger.error('❌ Groq API TIMEOUT', { timeout, model });
    } else {
      logger.error('❌ Groq API UNKNOWN ERROR', {
        message: error.message,
        model,
      });
    }
    throw error;
  }
}

// ============================================
// CLAUDE API CLIENT (FALLBACK 2 - OPTIONAL)
// ============================================

async function callClaude(
  messages: AIMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    jsonMode?: boolean;
  } = {}
): Promise<string> {
  const {
    temperature = AI_CONFIG.DEFAULT_TEMPERATURE,
    max_tokens = AI_CONFIG.DEFAULT_MAX_TOKENS,
    timeout = AI_CONFIG.CLAUDE.TIMEOUT,
    jsonMode = true,
  } = options;

  // Check if Claude API key is configured
  if (!config.claude.apiKey) {
    throw new Error('Claude API key not configured');
  }

  // Check if we're in backoff period
  if (isRateLimited('claude')) {
    const state = rateLimitState.claude;
    logger.warn('Claude is rate-limited, skipping attempt', {
      backoffUntil: state.backoffUntil?.toISOString(),
    });
    throw new Error(`Claude rate-limited until ${state.backoffUntil?.toISOString()}`);
  }

  const model = AI_CONFIG.CLAUDE.DEFAULT_MODEL;
  const url = `${AI_CONFIG.CLAUDE.BASE_URL}${AI_CONFIG.CLAUDE.MESSAGES_ENDPOINT}`;

  logger.ai('Calling Claude API (FALLBACK 2)', 'claude', {
    messageCount: messages.length,
    model,
    jsonMode,
    maxTokens: max_tokens,
  });

  try {
    // Filter out system messages - Claude handles them separately
    const claudeMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

    const systemContent = messages.find(m => m.role === 'system')?.content;

    const requestBody: any = {
      model,
      messages: claudeMessages,
      temperature,
      max_tokens: max_tokens,
    };

    // Add system prompt if present
    if (systemContent) {
      requestBody.system = systemContent;
    }

    // Add JSON mode instruction if needed
    if (jsonMode) {
      requestBody.messages = [
        ...claudeMessages,
        {
          role: 'user',
          content: 'Please respond with valid JSON.'
        }
      ];
    }

    const response = await axios.post<ClaudeResponse>(
      url,
      requestBody,
      {
        headers: {
          'x-api-key': config.claude.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        timeout,
      }
    );

    const content = response.data.content?.[0]?.text;

    if (!content) {
      throw new Error('No content in Claude response');
    }

    // Success - reset rate limit tracking
    recordSuccess('claude');

    logger.ai('✅ Claude API call SUCCESSFUL', 'claude', {
      tokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0),
      model,
      responseLength: content.length,
    });

    return content;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      logger.error('❌ Claude API ERROR', {
        status,
        statusText: error.response.statusText,
        data: JSON.stringify(errorData).substring(0, 500),
        model,
        isRateLimit: isRateLimitError(error),
      });

      // Track rate limit errors
      if (isRateLimitError(error)) {
        recordRateLimitError('claude');
      }
    } else if (error.code === 'ECONNABORTED') {
      logger.error('❌ Claude API TIMEOUT', { timeout, model });
    } else {
      logger.error('❌ Claude API UNKNOWN ERROR', {
        message: error.message,
        model,
      });
    }
    throw error;
  }
}

// ============================================
// AI CALL (GEMINI FREE-TIER ONLY)
// ============================================

export async function callAI(
  messages: AIMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    retries?: number;
    jsonMode?: boolean;
  } = {}
): Promise<{ content: string; provider: 'gemini' | 'groq' | 'claude' }> {
  const { retries = AI_CONFIG.MAX_RETRIES, jsonMode = true, ...callOptions } = options;
  assertGeminiFreeTierConfig();

  let lastGeminiError: Error | null = null;
  let lastGroqError: Error | null = null;
  let lastClaudeError: Error | null = null;

  logger.info('Starting AI call in Gemini free-tier-only mode', {
    retries,
    maxTokens: callOptions.max_tokens,
    geminiModel: config.gemini.model,
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logger.info(`Gemini attempt ${attempt + 1}/${retries + 1}`);
      const content = await callGemini(messages, { ...callOptions, jsonMode });
      return { content, provider: 'gemini' };
    } catch (error: any) {
      lastGeminiError = error as Error;

      if (error?.isConfigError === true) {
        throw error;
      }

      const canRetry = attempt < retries && !isRateLimited('gemini');
      logger.warn('Gemini attempt failed', {
        attempt: attempt + 1,
        retries,
        error: lastGeminiError?.message || 'unknown error',
        canRetry,
      });

      if (!canRetry) {
        const finalMessage =
          `Gemini free-tier request failed: ${lastGeminiError?.message || 'unknown error'}. ` +
          'No paid fallback providers are enabled in this app.';
        throw new Error(finalMessage);
      }

      const backoffMs = 1000 * Math.pow(2, attempt);
      await sleep(backoffMs);
    }
  }

  throw new Error(
    `Gemini free-tier request failed: ${lastGeminiError?.message || 'unknown error'}. No paid fallback providers are enabled in this app.`
  );

  // Check if providers are available (not in backoff)
  const geminiAvailable = !isRateLimited('gemini');
  const groqAvailable = !isRateLimited('groq');
  const claudeAvailable = !isRateLimited('claude') && !!config.claude.apiKey;

  logger.info('🚀 Starting AI provider chain', {
    geminiAvailable,
    groqAvailable,
    claudeAvailable,
    retries,
    maxTokens: callOptions.max_tokens,
    geminiModel: config.gemini.model,
  });

  // PRIMARY: Try Gemini with retries (if not rate-limited)
  if (geminiAvailable) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logger.info(`📡 Gemini attempt ${attempt + 1}/${retries + 1}`);
        const content = await callGemini(messages, { ...callOptions, jsonMode });
        logger.info('✅ SUCCESS: Using Gemini output');
        return { content, provider: 'gemini' };
      } catch (error: any) {
        lastGeminiError = error as Error;
        
        // Hard config errors should fail immediately, but quota/billing issues
        // are allowed to fall through to backup providers.
        if (error.isConfigError === true && error.shouldFallback !== true) {
          logger.error('🚫 GEMINI CONFIG ERROR - NOT FALLING BACK', {
            error: error.message,
            model: config.gemini.model,
            hint: 'Fix the Gemini configuration. This is not a transient error.',
          });
          throw error; // Propagate immediately, do not try other providers
        }

        if (error.isConfigError === true && error.shouldFallback === true) {
          logger.warn('Gemini unavailable, continuing to fallback providers', {
            error: error.message,
            model: config.gemini.model,
          });
        }
        
        logger.warn(`⚠️ Gemini attempt ${attempt + 1} failed`, {
          error: lastGeminiError?.message || 'unknown error',
          willRetry: attempt < retries && !isRateLimited('gemini'),
        });

        // If rate-limited after this error, don't retry
        if (isRateLimited('gemini')) {
          logger.warn('Gemini now rate-limited, stopping retries');
          break;
        }

        if (attempt < retries) {
          const backoffMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          logger.info(`Waiting ${backoffMs}ms before retry...`);
          await sleep(backoffMs);
        }
      }
    }
  } else {
    logger.warn('⏳ Gemini skipped - currently rate-limited');
  }

  // FALLBACK 1: Try Groq
  if (groqAvailable) {
    logger.warn('🔄 Falling back to Groq', {
      geminiError: lastGeminiError?.message,
    });

    for (let attempt = 0; attempt <= 1; attempt++) { // Max 2 attempts for Groq
      try {
        logger.info(`📡 Groq attempt ${attempt + 1}/2`);
        const content = await callGroq(messages, { ...callOptions, jsonMode });
        logger.info('✅ SUCCESS: Using Groq output');
        return { content, provider: 'groq' };
      } catch (error) {
        lastGroqError = error as Error;
        logger.warn(`⚠️ Groq attempt ${attempt + 1} failed`, {
          error: lastGroqError?.message || 'unknown error',
        });

        if (isRateLimited('groq')) {
          logger.warn('Groq now rate-limited, stopping retries');
          break;
        }

        if (attempt < 1) {
          await sleep(2000); // 2s wait before Groq retry
        }
      }
    }
  } else {
    logger.warn('⏳ Groq skipped - currently rate-limited');
    lastGroqError = new Error('Groq rate-limited');
  }

  // FALLBACK 2: Try Claude (if API key configured)
  if (claudeAvailable) {
    logger.warn('🔄 Falling back to Claude', {
      geminiError: lastGeminiError?.message,
      groqError: lastGroqError?.message,
    });

    for (let attempt = 0; attempt <= 1; attempt++) { // Max 2 attempts for Claude
      try {
        logger.info(`📡 Claude attempt ${attempt + 1}/2`);
        const content = await callClaude(messages, { ...callOptions, jsonMode });
        logger.info('✅ SUCCESS: Using Claude output');
        return { content, provider: 'claude' };
      } catch (error) {
        lastClaudeError = error as Error;
        logger.warn(`⚠️ Claude attempt ${attempt + 1} failed`, {
          error: lastClaudeError?.message || 'unknown error',
        });

        if (isRateLimited('claude')) {
          logger.warn('Claude now rate-limited, stopping retries');
          break;
        }

        if (attempt < 1) {
          await sleep(2000); // 2s wait before Claude retry
        }
      }
    }
  } else {
    if (!config.claude.apiKey) {
      logger.warn('⏳ Claude skipped - API key not configured');
      lastClaudeError = new Error('Claude API key not configured');
    } else {
      logger.warn('⏳ Claude skipped - currently rate-limited');
      lastClaudeError = new Error('Claude rate-limited');
    }
  }

  // All providers failed
  logger.error('❌ ALL AI PROVIDERS FAILED', {
    geminiError: lastGeminiError?.message,
    groqError: lastGroqError?.message,
    claudeError: lastClaudeError?.message,
    geminiRateLimited: isRateLimited('gemini'),
    groqRateLimited: isRateLimited('groq'),
    claudeRateLimited: isRateLimited('claude'),
  });

  const aggregateError = new Error(
    `All AI providers failed. Gemini: ${lastGeminiError?.message || 'rate-limited'}. Groq: ${lastGroqError?.message || 'rate-limited'}. Claude: ${lastClaudeError?.message || 'rate-limited/not-configured'}`
  );
  (aggregateError as any).shouldFallback = true;
  throw aggregateError;
}

// ============================================
// JSON EXTRACTION & VALIDATION
// ============================================

function extractJSON(content: string): string {
  // Remove markdown code blocks if present
  let cleaned = content.trim();

  // Remove ```json and ``` markers
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try to find JSON object in the content
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  // Try to find JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return cleaned;
}

function parseJSON<T>(content: string): T {
  const extracted = extractJSON(content);
  try {
    return JSON.parse(extracted) as T;
  } catch (error) {
    // Try to fix common JSON issues
    const fixed = extracted
      .replace(/,\s*}/g, '}') // Remove trailing commas in objects
      .replace(/,\s*]/g, ']') // Remove trailing commas in arrays
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\n/g, '\\n') // Escape newlines in strings
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\t/g, '\\t'); // Escape tabs

    try {
      return JSON.parse(fixed) as T;
    } catch {
      // Try one more time with more aggressive fixing
      try {
        // Extract just the JSON structure
        const jsonStart = fixed.indexOf('{');
        const jsonEnd = fixed.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = fixed.slice(jsonStart, jsonEnd + 1);
          return JSON.parse(jsonStr) as T;
        }
      } catch {}

      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// ============================================
// STAGE-SPECIFIC PROMPTS
// ============================================

function getCleaningPrompt(feedback: string): AIMessage[] {
  const systemPrompt = `You are a data cleaning specialist. Your task is to clean and normalize raw user feedback.

OUTPUT FORMAT (JSON):
{
  "cleaned_items": [
    {
      "original": "original text",
      "cleaned": "cleaned, normalized text",
      "language": "detected language",
      "word_count": number,
      "noise_removed": ["list of noise/spam elements removed"]
    }
  ],
  "total_items": number,
  "quality_score": number (0-1)
}

CLEANING RULES:
1. Remove spam, promotional content, and irrelevant text
2. Fix obvious typos and grammatical errors
3. Normalize different ways of expressing the same thing
4. Remove excessive punctuation and special characters
5. Preserve the original meaning and sentiment
6. Split combined feedback into separate items if they discuss different topics`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Clean and normalize the following user feedback:\n\n${feedback}`,
    },
  ];
}

function getClusteringPrompt(cleanedFeedback: string[]): AIMessage[] {
  const systemPrompt = `You are an expert at identifying patterns in user feedback. Group similar feedback into problem clusters.

OUTPUT FORMAT (JSON):
{
  "clusters": [
    {
      "id": "unique-cluster-id",
      "theme": "main theme/problem category",
      "feedback_items": ["array of feedback items in this cluster"],
      "count": number,
      "representative_quote": "best quote that represents this cluster"
    }
  ],
  "unclustered": ["feedback items that don't fit any cluster"],
  "clustering_confidence": number (0-1)
}

CLUSTERING RULES:
1. Group feedback by the underlying problem, not surface-level symptoms
2. Each cluster should have at least 1 item (include single-item clusters for unique issues)
3. A feedback item can only belong to one cluster
4. Choose the most impactful representative quote for each cluster`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Cluster the following cleaned feedback items:\n\n${cleanedFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}`,
    },
  ];
}

function getScoringPrompt(clusters: FeedbackCluster[]): AIMessage[] {
  const systemPrompt = `You are an expert at evaluating the frequency and severity of user problems.

OUTPUT FORMAT (JSON):
{
  "scored_problems": [
    {
      "id": "matches cluster id",
      "title": "concise problem title",
      "description": "detailed problem description",
      "frequency_score": number (1-10, based on how many users mention this),
      "severity_score": number (1-10, based on impact level),
      "frequency_factors": ["reasons for frequency score"],
      "severity_factors": ["reasons for severity score"],
      "evidence": ["direct quotes from feedback"],
      "category": "problem category",
      "user_segment": "affected user type"
    }
  ]
}

SCORING GUIDELINES:
Frequency (1-10):
- 1-3: Rare issues (1-2 mentions or unique edge cases)
- 4-6: Moderate frequency (several mentions, pattern emerging)
- 7-10: High frequency (many mentions, widespread issue)

Severity (1-10):
- 1-3: Minor inconvenience
- 4-6: Significant friction, affects productivity
- 7-8: Major blocker, causes frustration/workarounds
- 9-10: Critical - data loss, security issues, complete blockers`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Score the following problem clusters:\n\n${JSON.stringify(clusters, null, 2)}`,
    },
  ];
}

function getFeatureGenerationPrompt(problems: Problem[], context?: PipelineContext): AIMessage[] {
  const contextInfo = context
    ? `\nProject Context:
- Project: ${context.project_name || 'Unknown'}
- Industry: ${context.industry || 'General'}
- Product Type: ${context.product_type || 'Software'}
- Target Users: ${context.user_persona || 'General users'}`
    : '';

  const systemPrompt = `You are a senior product manager. Generate COMPREHENSIVE feature suggestions that solve the identified problems.
${contextInfo}

CRITICAL REQUIREMENTS:
- Generate MINIMUM 15-20 features (this is mandatory)
- Cover ALL problem areas identified
- Include a mix of quick wins (Simple) and strategic features (Complex)
- Each feature must have clear explainability

OUTPUT FORMAT (JSON):
{
  "features": [
    {
      "id": "unique-feature-id",
      "name": "Feature Name",
      "priority": "High" | "Medium" | "Low",
      "reason": "WHY this feature is suggested (explainability)",
      "linked_problems": ["problem IDs this addresses"],
      "complexity": "Simple" | "Medium" | "Complex",
      "estimated_impact": "description of expected impact",
      "user_value": "direct benefit to users",
      "business_value": "business outcome (revenue, retention, efficiency)",
      "supporting_evidence": ["quotes from feedback supporting this feature"]
    }
  ],
  "feature_categories": {
    "quick_wins": ["feature IDs for simple, high-impact features"],
    "core_features": ["feature IDs for medium complexity essentials"],
    "strategic_features": ["feature IDs for complex, long-term value"]
  },
  "prioritization_rationale": "explanation of priority decisions"
}

PRIORITIZATION RULES:
- High: Addresses high-severity, high-frequency problems; quick wins
- Medium: Important but not urgent; builds on existing features
- Low: Nice-to-haves; future considerations

Generate AT LEAST 15 features. Include WHY each feature was suggested for full explainability.`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Generate MINIMUM 15-20 feature suggestions for these problems:\n\n${JSON.stringify(problems, null, 2)}`,
    },
  ];
}

function getPRDGenerationPrompt(
  problems: Problem[],
  features: Feature[],
  context?: PipelineContext
): AIMessage[] {
  const contextInfo = context
    ? `Project: ${context.project_name || 'PMCopilot Feature'}`
    : 'PMCopilot Feature';

  const systemPrompt = `You are a senior product manager creating a Product Requirements Document (PRD).

OUTPUT FORMAT (JSON):
{
  "prd": {
    "title": "PRD title",
    "problem_statement": "Clear description of the problem being solved",
    "solution_overview": "High-level solution description",
    "goals": ["list of goals"],
    "non_goals": ["what is explicitly out of scope"],
    "user_stories": [
      {
        "persona": "user type",
        "action": "what they want to do",
        "benefit": "why they want it",
        "full_statement": "As a [persona], I want to [action] so that [benefit]"
      }
    ],
    "acceptance_criteria": [
      {
        "id": "AC-1",
        "description": "criterion description",
        "testable": true,
        "priority": "Must" | "Should" | "Could"
      }
    ],
    "success_metrics": ["measurable success criteria"],
    "risks": ["potential risks and mitigations"],
    "dependencies": ["technical or business dependencies"]
  }
}`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Create a PRD for ${contextInfo} based on:

PROBLEMS (${problems.length} total):
${JSON.stringify(problems.slice(0, 10), null, 2)}

TOP FEATURES (${features.length} total):
${JSON.stringify(features.slice(0, 8), null, 2)}`,
    },
  ];
}

function getTaskGenerationPrompt(features: Feature[], prd: PRD): AIMessage[] {
  const systemPrompt = `You are a technical lead breaking down features into development tasks (Jira-style).

CRITICAL REQUIREMENTS:
- Generate MINIMUM 25-40 tasks across all features
- Cover ALL task types (frontend, backend, API, database, testing, design)
- Each feature should have 3-6 related tasks
- Include proper dependencies between tasks

OUTPUT FORMAT (JSON):
{
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Task title",
      "description": "Detailed task description",
      "type": "frontend" | "backend" | "api" | "database" | "infrastructure" | "design" | "testing" | "documentation",
      "priority": "Critical" | "High" | "Medium" | "Low",
      "story_points": number (1, 2, 3, 5, 8, 13),
      "size": "XS" | "S" | "M" | "L" | "XL",
      "estimated_hours": number,
      "linked_feature": "feature ID this implements",
      "dependencies": ["other task IDs this depends on"],
      "technical_notes": "implementation hints",
      "acceptance_criteria": ["task-specific acceptance criteria"],
      "skills_required": ["React", "Node.js", "SQL", etc.]
    }
  ],
  "task_summary": {
    "total_tasks": number,
    "by_type": { "frontend": n, "backend": n, ... },
    "by_priority": { "Critical": n, "High": n, ... },
    "total_story_points": number,
    "total_estimated_hours": number
  },
  "sprint_recommendation": "suggested sprint organization with phases"
}

TASK GUIDELINES:
- Each task should be completable in 1-3 days (4-24 hours)
- Include all task types (frontend, backend, testing, design, documentation)
- Consider dependencies between tasks
- Provide realistic story point estimates
- Generate AT LEAST 25 tasks total`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Generate MINIMUM 25-40 development tasks for:

FEATURES (${features.length} total):
${JSON.stringify(features, null, 2)}

PRD ACCEPTANCE CRITERIA:
${JSON.stringify(prd.acceptance_criteria, null, 2)}

Remember: Generate AT LEAST 25 tasks covering all aspects of development.`,
    },
  ];
}

function getImpactEstimationPrompt(
  problems: Problem[],
  features: Feature[],
  context?: PipelineContext
): AIMessage[] {
  const systemPrompt = `You are a product analytics expert estimating the impact of proposed solutions.

OUTPUT FORMAT (JSON):
{
  "impact": {
    "user_impact": "qualitative description of user impact",
    "user_impact_score": number (1-10),
    "business_impact": "qualitative description of business impact",
    "business_impact_score": number (1-10),
    "confidence_score": number (0-1, how confident in this analysis),
    "time_to_value": "estimated time to see impact (e.g., '2-4 weeks')",
    "affected_user_percentage": number (0-100),
    "revenue_impact": "Increase" | "Decrease" | "Neutral" | "Unknown",
    "retention_impact": "Positive" | "Negative" | "Neutral" | "Unknown"
  },
  "impact_breakdown": {
    "immediate_benefits": ["quick wins"],
    "long_term_benefits": ["strategic value"],
    "potential_risks": ["things that could go wrong"]
  }
}`;

  return [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Estimate the impact of implementing these solutions:

TOP PROBLEMS (${problems.length} total, by severity):
${JSON.stringify(
  problems
    .sort((a, b) => b.severity_score - a.severity_score)
    .slice(0, 10),
  null,
  2
)}

PROPOSED FEATURES (${features.length} total):
${JSON.stringify(features.slice(0, 10), null, 2)}

${context?.industry ? `Industry: ${context.industry}` : ''}`,
    },
  ];
}

// ============================================
// STAGE EXECUTION
// ============================================

async function executeStage<T>(
  stage: PipelineStage,
  messages: AIMessage[],
  parseResult: (content: string) => T,
  maxRetries: number = AI_CONFIG.PIPELINE.RETRY_PER_STAGE
): Promise<StageResult<T>> {
  const startTime = Date.now();
  const stageConfig = AI_CONFIG.PIPELINE.STAGES[stage];

  logger.info(`Starting pipeline stage: ${stage}`, { stage });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { content, provider } = await callAI(messages, {
        temperature: stageConfig.temperature,
        max_tokens: stageConfig.max_tokens,
        timeout: stageConfig.timeout,
        retries: 1, // Handle retries at stage level
      });

      const data = parseResult(content);

      logger.info(`Pipeline stage completed: ${stage}`, {
        stage,
        attempt,
        duration: Date.now() - startTime,
        provider,
      });

      return {
        stage,
        success: true,
        data,
        retry_count: attempt,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error as Error;
      logger.warn(`Stage ${stage} attempt ${attempt + 1} failed`, {
        error: lastError.message,
      });

      if (attempt < maxRetries) {
        await sleep(1000 * (attempt + 1)); // Exponential backoff
      }
    }
  }

  logger.error(`Pipeline stage failed: ${stage}`, {
    error: lastError?.message,
    attempts: maxRetries + 1,
  });

  return {
    stage,
    success: false,
    error: lastError?.message || 'Unknown error',
    retry_count: maxRetries,
    duration_ms: Date.now() - startTime,
  };
}

// ============================================
// MAIN PIPELINE EXECUTION
// ============================================

export async function runAnalysisPipeline(
  rawFeedback: string,
  context?: PipelineContext
): Promise<{
  success: boolean;
  result?: ComprehensiveAnalysisResult;
  error?: string;
  provider?: 'gemini' | 'groq';
}> {
  const pipelineStart = Date.now();
  const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  logger.info('Starting analysis pipeline', {
    analysisId,
    feedbackLength: rawFeedback.length,
    hasContext: !!context,
  });

  try {
    // ========== STAGE 1: CLEANING ==========
    const cleaningResult = await executeStage<{ cleaned_items: CleanedFeedback[]; quality_score: number }>(
      'cleaning',
      getCleaningPrompt(rawFeedback),
      (content) => parseJSON(content)
    );

    if (!cleaningResult.success || !cleaningResult.data) {
      throw new Error(`Cleaning stage failed: ${cleaningResult.error}`);
    }

    const cleanedFeedback = cleaningResult.data.cleaned_items.map((item) => item.cleaned);

    if (cleanedFeedback.length === 0) {
      throw new Error('No valid feedback items after cleaning');
    }

    // ========== STAGE 2: CLUSTERING ==========
    const clusteringResult = await executeStage<{ clusters: FeedbackCluster[] }>(
      'clustering',
      getClusteringPrompt(cleanedFeedback),
      (content) => parseJSON(content)
    );

    if (!clusteringResult.success || !clusteringResult.data) {
      throw new Error(`Clustering stage failed: ${clusteringResult.error}`);
    }

    const clusters = clusteringResult.data.clusters;

    // ========== STAGE 3: SCORING ==========
    const scoringResult = await executeStage<{ scored_problems: Problem[] }>(
      'scoring',
      getScoringPrompt(clusters),
      (content) => parseJSON(content)
    );

    if (!scoringResult.success || !scoringResult.data) {
      throw new Error(`Scoring stage failed: ${scoringResult.error}`);
    }

    const problems = scoringResult.data.scored_problems;

    // ========== STAGE 4: FEATURE GENERATION ==========
    const featureResult = await executeStage<{ features: Feature[]; prioritization_rationale: string }>(
      'feature_generation',
      getFeatureGenerationPrompt(problems, context),
      (content) => parseJSON(content)
    );

    if (!featureResult.success || !featureResult.data) {
      throw new Error(`Feature generation stage failed: ${featureResult.error}`);
    }

    const features = featureResult.data.features;

    // ========== STAGE 5: PRD GENERATION ==========
    const prdResult = await executeStage<{ prd: PRD }>(
      'prd_generation',
      getPRDGenerationPrompt(problems, features, context),
      (content) => parseJSON(content)
    );

    if (!prdResult.success || !prdResult.data) {
      throw new Error(`PRD generation stage failed: ${prdResult.error}`);
    }

    const prd = prdResult.data.prd;

    // ========== STAGE 6: TASK GENERATION ==========
    const taskResult = await executeStage<{ tasks: DevelopmentTask[] }>(
      'task_generation',
      getTaskGenerationPrompt(features, prd),
      (content) => parseJSON(content)
    );

    if (!taskResult.success || !taskResult.data) {
      throw new Error(`Task generation stage failed: ${taskResult.error}`);
    }

    const tasks = taskResult.data.tasks;

    // ========== STAGE 7: IMPACT ESTIMATION ==========
    const impactResult = await executeStage<{ impact: ImpactEstimation; impact_breakdown: Record<string, string[]> }>(
      'impact_estimation',
      getImpactEstimationPrompt(problems, features, context),
      (content) => parseJSON(content)
    );

    if (!impactResult.success || !impactResult.data) {
      throw new Error(`Impact estimation stage failed: ${impactResult.error}`);
    }

    const impact = impactResult.data.impact;

    // ========== BUILD FINAL RESULT ==========
    const processingTime = Date.now() - pipelineStart;

    const result: ComprehensiveAnalysisResult = {
      // Metadata
      analysis_id: analysisId,
      created_at: new Date().toISOString(),
      processing_time_ms: processingTime,
      model_used: config.gemini.model,
      total_feedback_items: cleanedFeedback.length,

      // Core Results
      problems: problems.sort((a, b) => {
        const scoreA = a.frequency_score + a.severity_score;
        const scoreB = b.frequency_score + b.severity_score;
        return scoreB - scoreA;
      }),
      features: features.sort((a, b) => {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      prd,
      tasks,
      impact,

      // Explainability Layer
      explainability: {
        methodology:
          'Multi-stage AI pipeline: cleaning → clustering → scoring → feature generation → PRD → tasks → impact estimation',
        data_quality_score: cleaningResult.data.quality_score || 0.8,
        confidence_factors: [
          `Analyzed ${cleanedFeedback.length} feedback items`,
          `Identified ${clusters.length} problem clusters`,
          `Generated ${features.length} feature suggestions`,
          `Created ${tasks.length} development tasks`,
        ],
        limitations: [
          'Analysis is based on provided feedback only',
          'Impact estimates are projections, not guarantees',
          'Feature priorities should be validated with stakeholders',
        ],
        recommendations: [
          'Review high-severity problems first',
          'Validate feature suggestions with user interviews',
          'Start with quick wins (High priority + Simple complexity)',
        ],
      },

      // Summary
      executive_summary: generateExecutiveSummary(problems, features, impact),
      key_findings: generateKeyFindings(problems, features),
      immediate_actions: generateImmediateActions(problems, features, tasks),
    };

    logger.info('Analysis pipeline completed successfully', {
      analysisId,
      processingTime,
      problemsFound: problems.length,
      featuresGenerated: features.length,
      tasksCreated: tasks.length,
    });

    return {
      success: true,
      result,
      provider: 'gemini',
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Analysis pipeline failed', {
      analysisId,
      error: errorMessage,
      processingTime: Date.now() - pipelineStart,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateExecutiveSummary(
  problems: Problem[],
  features: Feature[],
  impact: ImpactEstimation
): string {
  const topProblem = problems[0];
  const topFeature = features[0];

  return `Analysis identified ${problems.length} distinct problems from user feedback. ` +
    `The most critical issue is "${topProblem?.title || 'N/A'}" with a severity score of ${topProblem?.severity_score || 0}/10. ` +
    `${features.length} feature suggestions were generated, with "${topFeature?.name || 'N/A'}" as the highest priority recommendation. ` +
    `Expected user impact: ${impact.user_impact_score}/10. Business impact: ${impact.business_impact_score}/10. ` +
    `Confidence in this analysis: ${Math.round(impact.confidence_score * 100)}%.`;
}

function generateKeyFindings(problems: Problem[], features: Feature[]): string[] {
  const findings: string[] = [];

  problems.slice(0, 3).forEach((problem) => {
    findings.push(
      `Problem: "${problem.title}" - Severity: ${problem.severity_score}/10, Frequency: ${problem.frequency_score}/10`
    );
  });

  const highPriorityCount = features.filter((f) => f.priority === 'High').length;
  findings.push(`${highPriorityCount} high-priority features identified for immediate consideration`);

  return findings;
}

function generateImmediateActions(
  problems: Problem[],
  features: Feature[],
  tasks: DevelopmentTask[]
): string[] {
  const actions: string[] = [];

  const criticalProblems = problems.filter((p) => p.severity_score >= 8);
  if (criticalProblems.length > 0) {
    actions.push(`Address ${criticalProblems.length} critical problems immediately`);
  }

  const quickWins = features.filter(
    (f) => f.priority === 'High' && f.complexity === 'Simple'
  );
  if (quickWins.length > 0) {
    actions.push(`Implement quick wins: ${quickWins.map((f) => f.name).join(', ')}`);
  }

  const criticalTasks = tasks.filter((t) => t.priority === 'Critical');
  if (criticalTasks.length > 0) {
    actions.push(`Prioritize ${criticalTasks.length} critical development tasks`);
  }

  if (actions.length === 0) {
    actions.push('Review analysis results and prioritize based on business goals');
  }

  return actions;
}

// ============================================
// VALIDATION
// ============================================

export function validateAnalysisResult(result: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  const requiredFields = ['problems', 'features', 'prd', 'tasks', 'impact'];
  for (const field of requiredFields) {
    if (!result[field]) {
      errors.push({
        field,
        message: `Missing required field: ${field}`,
        expected: 'object or array',
        received: typeof result[field],
      });
    }
  }

  if (Array.isArray(result.problems)) {
    result.problems.forEach((problem: any, index: number) => {
      if (!problem.title) {
        errors.push({
          field: `problems[${index}].title`,
          message: 'Problem missing title',
        });
      }
      if (
        typeof problem.severity_score !== 'number' ||
        problem.severity_score < 1 ||
        problem.severity_score > 10
      ) {
        warnings.push(`problems[${index}].severity_score should be 1-10`);
      }
    });
  }

  if (Array.isArray(result.features)) {
    result.features.forEach((feature: any, index: number) => {
      if (!feature.name) {
        errors.push({
          field: `features[${index}].name`,
          message: 'Feature missing name',
        });
      }
      if (!['High', 'Medium', 'Low'].includes(feature.priority)) {
        warnings.push(
          `features[${index}].priority should be High, Medium, or Low`
        );
      }
    });
  }

  if (result.prd) {
    if (!result.prd.title) {
      errors.push({ field: 'prd.title', message: 'PRD missing title' });
    }
    if (!Array.isArray(result.prd.user_stories)) {
      warnings.push('prd.user_stories should be an array');
    }
  }

  if (result.impact) {
    if (
      typeof result.impact.confidence_score !== 'number' ||
      result.impact.confidence_score < 0 ||
      result.impact.confidence_score > 1
    ) {
      warnings.push('impact.confidence_score should be 0-1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    parsed_data: errors.length === 0 ? result : undefined,
  };
}

export default {
  callAI,
  runAnalysisPipeline,
  validateAnalysisResult,
};
