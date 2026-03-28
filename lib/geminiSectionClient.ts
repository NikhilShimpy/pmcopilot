import axios from 'axios';
import { AI_CONFIG } from '@/utils/constants';
import { assertGeminiFreeTierConfig, config, FREE_TIER_MODELS } from './config';
import { logger } from './logger';

export interface GeminiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

type GeminiKeyStatus = 'active' | 'cooling_down' | 'exhausted' | 'invalid';

interface GeminiKeyState {
  status: GeminiKeyStatus;
  backoffUntil: Date | null;
  consecutiveErrors: number;
  totalErrors: number;
  inFlight: number;
  lastError: string | null;
  lastSelectedAt: Date | null;
  lastSuccessAt: Date | null;
}

interface GeminiRequestOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  jsonMode?: boolean;
}

interface GeminiKeyErrorClassification {
  kind: 'hard_request_error' | 'key_error' | 'quota' | 'transient';
  message: string;
  backoffSeconds?: number;
  reason: 'rate_limit' | 'spending_cap' | 'invalid_key' | 'permission' | 'transient_error';
}

const geminiKeyState = new Map<string, GeminiKeyState>();
let geminiKeyCursor = 0;

function getGeminiKeys(): string[] {
  return config.gemini.apiKeys.length > 0
    ? config.gemini.apiKeys
    : [config.gemini.apiKey].filter(Boolean);
}

function getKeyState(apiKey: string): GeminiKeyState {
  const existing = geminiKeyState.get(apiKey);
  if (existing) {
    return existing;
  }

  const initialState: GeminiKeyState = {
    status: 'active',
    backoffUntil: null,
    consecutiveErrors: 0,
    totalErrors: 0,
    inFlight: 0,
    lastError: null,
    lastSelectedAt: null,
    lastSuccessAt: null,
  };
  geminiKeyState.set(apiKey, initialState);
  return initialState;
}

function getKeySlot(apiKey: string): number {
  const index = getGeminiKeys().indexOf(apiKey);
  return index >= 0 ? index + 1 : 0;
}

function refreshKeyAvailability(state: GeminiKeyState) {
  if (state.status === 'invalid') {
    return;
  }

  if (state.backoffUntil && Date.now() >= state.backoffUntil.getTime()) {
    state.status = 'active';
    state.backoffUntil = null;
    state.lastError = null;
    state.consecutiveErrors = 0;
  }
}

function isKeyEligible(apiKey: string): boolean {
  const state = getKeyState(apiKey);
  refreshKeyAvailability(state);
  if (state.status === 'invalid') {
    return false;
  }
  return !state.backoffUntil || Date.now() >= state.backoffUntil.getTime();
}

function claimNextEligibleKey(
  excludedKeys: Set<string>
): { apiKey: string; keySlot: number } | null {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    return null;
  }

  const startCursor = geminiKeyCursor;
  for (let checked = 0; checked < keys.length; checked++) {
    const index = (startCursor + checked) % keys.length;
    const apiKey = keys[index];

    if (excludedKeys.has(apiKey)) {
      continue;
    }

    if (!isKeyEligible(apiKey)) {
      continue;
    }

    const state = getKeyState(apiKey);
    geminiKeyCursor = (index + 1) % keys.length;
    state.inFlight += 1;
    state.lastSelectedAt = new Date();

    logger.info('Gemini key selected', {
      keySlot: getKeySlot(apiKey),
      status: state.status,
      inFlight: state.inFlight,
    });

    return { apiKey, keySlot: getKeySlot(apiKey) };
  }

  return null;
}

function releaseKeyReservation(apiKey: string) {
  const state = getKeyState(apiKey);
  state.inFlight = Math.max(0, state.inFlight - 1);
}

function markKeySuccess(apiKey: string) {
  const state = getKeyState(apiKey);
  state.status = 'active';
  state.backoffUntil = null;
  state.consecutiveErrors = 0;
  state.lastError = null;
  state.lastSuccessAt = new Date();
}

function markKeyBackoff(
  apiKey: string,
  backoffSeconds: number,
  reason: GeminiKeyErrorClassification['reason'],
  message: string
) {
  const state = getKeyState(apiKey);
  const now = Date.now();

  const status: GeminiKeyStatus =
    reason === 'invalid_key' || reason === 'permission'
      ? 'invalid'
      : reason === 'spending_cap'
      ? 'exhausted'
      : 'cooling_down';

  state.status = status;
  state.consecutiveErrors += 1;
  state.totalErrors += 1;
  state.lastError = message;
  state.backoffUntil =
    backoffSeconds > 0 ? new Date(now + backoffSeconds * 1000) : null;

  logger.warn('Gemini key state changed', {
    keySlot: getKeySlot(apiKey),
    status,
    reason,
    backoffSeconds,
    backoffUntil: state.backoffUntil?.toISOString() || null,
    consecutiveErrors: state.consecutiveErrors,
  });
}

function classifyGeminiKeyError(error: any): GeminiKeyErrorClassification {
  if (!error.response) {
    return {
      kind: 'transient',
      message: error.message || 'Network error while calling Gemini',
      backoffSeconds: 20,
      reason: 'transient_error',
    };
  }

  const status = error.response.status;
  const rawMessage =
    typeof error.response.data === 'string'
      ? error.response.data
      : JSON.stringify(error.response.data || '');
  const normalizedMessage = rawMessage.toLowerCase();

  if (status === 400) {
    if (
      normalizedMessage.includes('api key not valid') ||
      normalizedMessage.includes('invalid api key') ||
      normalizedMessage.includes('invalid key')
    ) {
      return {
        kind: 'key_error',
        message: 'Gemini API key is invalid',
        backoffSeconds: 86400,
        reason: 'invalid_key',
      };
    }
  }

  if (status === 400 || status === 404) {
    return {
      kind: 'hard_request_error',
      message:
        rawMessage.slice(0, 300) ||
        `Gemini request failed with status ${status}. Configure GEMINI_MODEL to one of: ${FREE_TIER_MODELS.join(
          ', '
        )}`,
      reason: 'transient_error',
    };
  }

  if (status === 401) {
    return {
      kind: 'key_error',
      message: 'Gemini API key is invalid',
      backoffSeconds: 86400,
      reason: 'invalid_key',
    };
  }

  if (status === 403) {
    return {
      kind: 'key_error',
      message:
        'Gemini API key lacks required permission for this model/project. Use a valid Gemini free-tier key.',
      backoffSeconds: 3600,
      reason: 'permission',
    };
  }

  if (status === 429) {
    if (
      normalizedMessage.includes('spending cap') ||
      normalizedMessage.includes('billing') ||
      normalizedMessage.includes('quota')
    ) {
      return {
        kind: 'quota',
        message:
          'Gemini free-tier quota/cap was reached for this key. Retry later or reduce request size.',
        backoffSeconds: 1200,
        reason: 'spending_cap',
      };
    }

    return {
      kind: 'quota',
      message: 'Gemini rate limit hit for this key',
      backoffSeconds: 240,
      reason: 'rate_limit',
    };
  }

  if (status >= 500) {
    return {
      kind: 'transient',
      message: `Gemini server error ${status}`,
      backoffSeconds: 30,
      reason: 'transient_error',
    };
  }

  return {
    kind: 'transient',
    message: rawMessage.slice(0, 300) || `Gemini request failed with status ${status}`,
    backoffSeconds: 30,
    reason: 'transient_error',
  };
}

async function requestGeminiWithKey(
  apiKey: string,
  messages: GeminiMessage[],
  options: GeminiRequestOptions = {}
): Promise<string> {
  const {
    temperature = AI_CONFIG.DEFAULT_TEMPERATURE,
    maxTokens = 2048,
    timeout = AI_CONFIG.GEMINI.TIMEOUT,
    jsonMode = true,
  } = options;

  assertGeminiFreeTierConfig();
  const model = config.gemini.model;
  const systemMessage = messages.find((message) => message.role === 'system');
  const contents = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }));

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens: Math.min(maxTokens, 4096),
  };

  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig,
  };

  if (systemMessage) {
    requestBody.systemInstruction = {
      parts: [{ text: systemMessage.content }],
    };
  }

  logger.ai('Calling Gemini API (sectioned)', 'gemini', {
    keySlot: getKeySlot(apiKey),
    messageCount: messages.length,
    model,
    maxTokens,
    jsonMode,
  });

  const response = await axios.post<GeminiResponse>(
    `${AI_CONFIG.GEMINI.BASE_URL}/${model}:generateContent?key=${apiKey}`,
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
    throw new Error('Gemini returned an empty response');
  }

  logger.ai('Gemini section call successful', 'gemini', {
    keySlot: getKeySlot(apiKey),
    responseLength: content.length,
    tokens: response.data.usageMetadata?.totalTokenCount ?? 'unknown',
  });

  return content;
}

export function getGeminiKeyPoolStatus() {
  return getGeminiKeys().map((apiKey) => {
    const state = getKeyState(apiKey);
    refreshKeyAvailability(state);
    const now = Date.now();
    const coolingDown =
      !!state.backoffUntil && state.backoffUntil.getTime() > now;
    return {
      keySlot: getKeySlot(apiKey),
      status: state.status,
      available: isKeyEligible(apiKey),
      coolingDown,
      backoffUntil: state.backoffUntil?.toISOString() || null,
      inFlight: state.inFlight,
      consecutiveErrors: state.consecutiveErrors,
      totalErrors: state.totalErrors,
      lastError: state.lastError,
      lastSelectedAt: state.lastSelectedAt?.toISOString() || null,
      lastSuccessAt: state.lastSuccessAt?.toISOString() || null,
    };
  });
}

export async function generateGeminiContent(
  messages: GeminiMessage[],
  options: GeminiRequestOptions = {}
): Promise<{ content: string; provider: 'gemini'; keySlot: number }> {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    const missingKeysError = new Error(
      'No Gemini API keys configured. Set GEMINI_API_KEYS or GEMINI_API_KEY_1..GEMINI_API_KEY_20.'
    );
    (missingKeysError as any).isGeminiPoolExhausted = true;
    throw missingKeysError;
  }

  const attemptedKeys = new Set<string>();
  let lastError: Error | null = null;

  while (attemptedKeys.size < keys.length) {
    const candidate = claimNextEligibleKey(attemptedKeys);
    if (!candidate) {
      break;
    }

    const { apiKey, keySlot } = candidate;
    attemptedKeys.add(apiKey);

    try {
      const content = await requestGeminiWithKey(apiKey, messages, options);
      markKeySuccess(apiKey);
      return {
        content,
        provider: 'gemini',
        keySlot,
      };
    } catch (error: any) {
      const classification = classifyGeminiKeyError(error);

      logger.warn('Gemini key request failed', {
        keySlot,
        kind: classification.kind,
        message: classification.message,
      });

      if (classification.kind === 'hard_request_error') {
        const configError = new Error(`GEMINI_CONFIG_ERROR: ${classification.message}`);
        (configError as any).isConfigError = true;
        throw configError;
      }

      markKeyBackoff(
        apiKey,
        classification.backoffSeconds || 60,
        classification.reason,
        classification.message
      );

      lastError = new Error(`Gemini key ${keySlot} failed: ${classification.message}`);
    } finally {
      releaseKeyReservation(apiKey);
    }
  }

  const keyStatus = getGeminiKeyPoolStatus();
  logger.error('Gemini key pool exhausted', {
    attemptedKeys: attemptedKeys.size,
    poolSize: keys.length,
    keyStatus,
    lastError: lastError?.message || null,
  });

  if (attemptedKeys.size === 0) {
    const poolError = new Error(
      'All configured Gemini API keys are cooling down or exhausted. Add another Gemini key or wait for a key backoff window to expire.'
    );
    (poolError as any).isGeminiPoolExhausted = true;
    (poolError as any).keyPoolStatus = keyStatus;
    throw poolError;
  }

  const poolError = new Error(
    lastError?.message ||
      'All configured Gemini API keys failed for this request. Add more free-tier keys or wait for backoff.'
  );
  (poolError as any).isGeminiPoolExhausted = true;
  (poolError as any).keyPoolStatus = keyStatus;
  throw poolError;
}
