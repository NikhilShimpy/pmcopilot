/**
 * PMCopilot - Puter.js Fallback Module
 *
 * Server-side compatible fallback for AI calls when OpenRouter fails.
 * Uses Puter's HTTP API endpoint for server-side calls.
 */

import axios from 'axios';
import { logger } from './logger';
import { AI_CONFIG } from '@/utils/constants';

// ============================================
// TYPES
// ============================================

interface PuterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface PuterChatOptions {
  model?: string;
  temperature?: number;
  stream?: boolean;
}

interface PuterResponse {
  message?: {
    content: string;
  };
  content?: string;
  text?: string;
}

// ============================================
// PUTER API CONFIGURATION
// ============================================

const PUTER_CONFIG = {
  // Public Puter AI endpoint (no auth required for basic usage)
  // Note: For production, consider using authenticated endpoints
  ENDPOINTS: {
    CHAT: 'https://api.puter.com/drivers/call',
    ALT_CHAT: 'https://puter.com/api/ai/chat',
  },
  DRIVER: 'ai-chat',
  DEFAULT_MODEL: AI_CONFIG.PUTER.DEFAULT_MODEL,
  TIMEOUT: AI_CONFIG.PUTER.TIMEOUT,
};

// ============================================
// PUTER CLIENT
// ============================================

/**
 * Call Puter AI chat API (server-side compatible)
 *
 * @param messages - Array of chat messages
 * @param options - Optional configuration
 * @returns AI response content
 */
export async function puterChat(
  messages: PuterMessage[],
  options: PuterChatOptions = {}
): Promise<string> {
  const { model = PUTER_CONFIG.DEFAULT_MODEL, temperature = 0.7 } = options;

  logger.info('Calling Puter AI (fallback)', {
    messageCount: messages.length,
    model,
  });

  // Build the prompt from messages
  const systemMessage = messages.find((m) => m.role === 'system');
  const userMessages = messages.filter((m) => m.role !== 'system');

  // Combine into a single prompt (Puter's simpler API)
  let prompt = '';
  if (systemMessage) {
    prompt += `System Instructions:\n${systemMessage.content}\n\n`;
  }
  prompt += userMessages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
  prompt += '\n\nRespond ONLY with valid JSON. No explanations, no markdown, just JSON.';

  try {
    // Try the driver endpoint first
    const response = await callPuterDriver(prompt, model, temperature);
    return response;
  } catch (driverError) {
    logger.warn('Puter driver endpoint failed, trying alternative', {
      error: driverError instanceof Error ? driverError.message : 'Unknown',
    });

    // Fallback to alternative endpoint
    try {
      const response = await callPuterAlternative(messages, model, temperature);
      return response;
    } catch (altError) {
      logger.error('All Puter endpoints failed', {
        driverError: driverError instanceof Error ? driverError.message : 'Unknown',
        altError: altError instanceof Error ? altError.message : 'Unknown',
      });
      throw new Error('Puter AI service unavailable');
    }
  }
}

/**
 * Call Puter's driver endpoint
 */
async function callPuterDriver(
  prompt: string,
  model: string,
  temperature: number
): Promise<string> {
  const response = await axios.post(
    PUTER_CONFIG.ENDPOINTS.CHAT,
    {
      interface: PUTER_CONFIG.DRIVER,
      method: 'complete',
      args: {
        prompt,
        model,
        temperature,
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: PUTER_CONFIG.TIMEOUT,
    }
  );

  // Extract content from response
  const content = extractContent(response.data);
  if (!content) {
    throw new Error('No content in Puter driver response');
  }

  logger.info('Puter driver call successful');
  return content;
}

/**
 * Call Puter's alternative chat endpoint
 */
async function callPuterAlternative(
  messages: PuterMessage[],
  model: string,
  temperature: number
): Promise<string> {
  const response = await axios.post<PuterResponse>(
    PUTER_CONFIG.ENDPOINTS.ALT_CHAT,
    {
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      model,
      temperature,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: PUTER_CONFIG.TIMEOUT,
    }
  );

  const content = extractContent(response.data);
  if (!content) {
    throw new Error('No content in Puter alternative response');
  }

  logger.info('Puter alternative endpoint call successful');
  return content;
}

/**
 * Extract content from various response formats
 */
function extractContent(data: any): string | null {
  if (!data) return null;

  // Direct string response
  if (typeof data === 'string') {
    return data;
  }

  // Standard message format
  if (data.message?.content) {
    return data.message.content;
  }

  // Direct content field
  if (data.content) {
    return typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
  }

  // Text field
  if (data.text) {
    return data.text;
  }

  // Result field (driver response)
  if (data.result) {
    return typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
  }

  // Choices array (OpenAI-style)
  if (Array.isArray(data.choices) && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  // Last resort: stringify the whole thing
  if (typeof data === 'object') {
    return JSON.stringify(data);
  }

  return null;
}

// ============================================
// BROWSER-SIDE PUTER (for client components)
// ============================================

/**
 * Check if Puter.js is available in browser
 */
export function isPuterAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).puter;
}

/**
 * Load Puter.js script dynamically (browser only)
 */
export async function loadPuterScript(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('loadPuterScript can only be called in browser environment');
  }

  // Check if already loaded
  if ((window as any).puter) {
    return (window as any).puter;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = AI_CONFIG.PUTER.SCRIPT_URL;
    script.async = true;

    const timeout = setTimeout(() => {
      reject(new Error('Puter.js load timeout'));
    }, 10000);

    script.onload = () => {
      clearTimeout(timeout);
      // Give it a moment to initialize
      setTimeout(() => {
        if ((window as any).puter) {
          logger.info('Puter.js loaded successfully');
          resolve((window as any).puter);
        } else {
          reject(new Error('Puter.js loaded but not available'));
        }
      }, 100);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load Puter.js'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Call Puter AI from browser using loaded script
 */
export async function puterChatBrowser(
  prompt: string,
  options: PuterChatOptions = {}
): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('puterChatBrowser can only be called in browser');
  }

  const puter = await loadPuterScript();

  const response = await Promise.race([
    puter.ai.chat(prompt, {
      model: options.model || PUTER_CONFIG.DEFAULT_MODEL,
      temperature: options.temperature || 0.7,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Puter chat timeout')), PUTER_CONFIG.TIMEOUT)
    ),
  ]);

  if (typeof response === 'string') {
    return response;
  }

  if (response && typeof response === 'object') {
    return (response as any).message || (response as any).content || JSON.stringify(response);
  }

  throw new Error('Unexpected Puter response format');
}

export default {
  puterChat,
  isPuterAvailable,
  loadPuterScript,
  puterChatBrowser,
};
