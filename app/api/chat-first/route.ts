import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { generateGeminiContent } from '@/lib/geminiSectionClient';
import { assertGeminiFreeTierConfig, config } from '@/lib/config';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatFirstRequest {
  message: string;
  depth?: 'short' | 'medium' | 'long' | 'extra-long';
  section?: string;
  projectId?: string;
  projectName?: string;
  projectIdea?: string;
  analysis?: Record<string, any> | null;
  history?: ChatHistoryItem[];
}

interface StructuredAnswer {
  direct_answer: string;
  key_insights: string[];
  recommended_action: string[];
  risks_notes: string[];
  next_step: string[];
}

const DEPTH_CONFIG = {
  short: {
    maxTokens: 700,
    timeout: 25000,
    style: 'Concise: 1 short paragraph + short bullets.',
  },
  medium: {
    maxTokens: 1000,
    timeout: 35000,
    style: 'Balanced detail with compact bullets.',
  },
  long: {
    maxTokens: 1300,
    timeout: 45000,
    style: 'Detailed but compact; avoid long essays.',
  },
  'extra-long': {
    maxTokens: 1600,
    timeout: 50000,
    style: 'Deep detail with clear prioritization.',
  },
} as const;

const SECTION_GUIDANCE: Record<string, string> = {
  all: 'Focus on practical cross-section recommendations.',
  'executive-dashboard': 'Prioritize strategy, metrics, and decision trade-offs.',
  'problem-analysis': 'Prioritize root causes, impact, and validation.',
  'feature-system': 'Prioritize feature scope, sequencing, and user value.',
  'gaps-opportunities': 'Prioritize market gaps and differentiation.',
  prd: 'Prioritize requirements quality, acceptance criteria, and scope.',
  'system-design': 'Prioritize architecture choices, data flow, and reliability.',
  'development-tasks': 'Prioritize task sequencing and dependencies.',
  'execution-roadmap': 'Prioritize milestone clarity and go-live risk.',
  'manpower-planning': 'Prioritize hiring sequence, roles, and budget realism.',
  resources: 'Prioritize essential tooling and infra only.',
  'cost-estimation': 'Prioritize assumptions, ranges, and cost drivers.',
  timeline: 'Prioritize timeline realism and critical path.',
  'impact-analysis': 'Prioritize measurable outcomes and confidence caveats.',
};

function trimText(value: string | undefined, maxChars: number): string {
  const cleaned = (value || '').trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars)}...` : cleaned;
}

function extractJSON(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  return jsonMatch?.[0] || cleaned;
}

function safeParseStructuredAnswer(content: string): StructuredAnswer {
  const fallback: StructuredAnswer = {
    direct_answer: trimText(content, 1200) || 'No response generated.',
    key_insights: [],
    recommended_action: [],
    risks_notes: [],
    next_step: ['Ask a follow-up with more context.'],
  };

  try {
    const parsed = JSON.parse(extractJSON(content)) as Partial<StructuredAnswer>;
    const parsedAny = parsed as any;
    return {
      direct_answer: trimText(parsed.direct_answer || fallback.direct_answer, 1400),
      key_insights: Array.isArray(parsed.key_insights || parsedAny.key_points)
        ? (parsed.key_insights || parsedAny.key_points)
            .map((item: unknown) => trimText(String(item), 220))
            .filter(Boolean)
        : [],
      recommended_action: Array.isArray(parsed.recommended_action || parsedAny.recommendation)
        ? (parsed.recommended_action || parsedAny.recommendation)
            .map((item: unknown) => trimText(String(item), 220))
            .filter(Boolean)
        : [],
      risks_notes: Array.isArray(parsed.risks_notes)
        ? parsed.risks_notes.map((item) => trimText(String(item), 220)).filter(Boolean)
        : [],
      next_step: Array.isArray(parsed.next_step || parsedAny.next_steps)
        ? (parsed.next_step || parsedAny.next_steps)
            .map((item: unknown) => trimText(String(item), 220))
            .filter(Boolean)
        : fallback.next_step,
    };
  } catch {
    return fallback;
  }
}

function formatStructuredAnswerMarkdown(answer: StructuredAnswer): string {
  const toBullets = (items: string[]) =>
    items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- Not enough context yet.';

  return [
    '## Direct Answer',
    answer.direct_answer || 'Not enough context yet.',
    '',
    '## Key Insights',
    toBullets(answer.key_insights),
    '',
    '## Recommended Action',
    toBullets(answer.recommended_action),
    '',
    '## Risks / Notes',
    toBullets(answer.risks_notes),
    '',
    '## Next Step',
    toBullets(answer.next_step),
  ].join('\n');
}

function chunkForStreaming(text: string, chunkSize = 220): string[] {
  const normalized = text || '';
  if (!normalized.trim()) {
    return [];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    let next = Math.min(normalized.length, cursor + chunkSize);

    if (next < normalized.length) {
      const newline = normalized.lastIndexOf('\n', next);
      const space = normalized.lastIndexOf(' ', next);
      const boundary = Math.max(newline, space);
      if (boundary > cursor + 60) {
        next = boundary + 1;
      }
    }

    chunks.push(normalized.slice(cursor, next));
    cursor = next;
  }

  return chunks;
}

function buildContextPayload(body: ChatFirstRequest): string {
  const compactAnalysis = body.analysis
    ? trimText(JSON.stringify(body.analysis), 6000)
    : 'No analysis snapshot provided.';

  return `Project:
- ID: ${body.projectId || 'unknown'}
- Name: ${trimText(body.projectName, 120) || 'unknown'}
- Active section: ${body.section || 'all'}

Project idea:
${trimText(body.projectIdea, 2800) || 'Not provided'}

Analysis snapshot:
${compactAnalysis}`;
}

function buildPrompt(body: ChatFirstRequest) {
  const section = body.section || 'all';
  const depth = body.depth || 'medium';
  const depthConfig = DEPTH_CONFIG[depth];

  const systemPrompt = `You are PMCopilot's product planning assistant.

Respond using project-specific context only.
Do not generate generic filler.

Return JSON only with this schema:
{
  "direct_answer": string,
  "key_insights": string[],
  "recommended_action": string[],
  "risks_notes": string[],
  "next_step": string[]
}

Rules:
- Keep each list to 3-6 concise bullets.
- Keep wording concrete and actionable.
- Use INR when discussing cost.
- Output must align with section focus: ${SECTION_GUIDANCE[section] || SECTION_GUIDANCE.all}
- Style target: ${depthConfig.style}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (Array.isArray(body.history)) {
    for (const item of body.history.slice(-4)) {
      messages.push({
        role: item.role,
        content: trimText(item.content, 1200),
      });
    }
  }

  messages.push({
    role: 'user',
    content: `${buildContextPayload(body)}\n\nUser question:\n${trimText(body.message, 1200)}`,
  });

  return { messages, depthConfig };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    assertGeminiFreeTierConfig();

    const body = (await request.json().catch(() => null)) as ChatFirstRequest | null;
    if (!body || !body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const depth = body.depth || 'medium';
    const { messages, depthConfig } = buildPrompt(body);

    logger.info('Chat-first request (Gemini free-tier)', {
      depth,
      section: body.section || 'all',
      model: config.gemini.model,
      messageLength: body.message.length,
    });

    const { content } = await generateGeminiContent(messages, {
      jsonMode: true,
      maxTokens: depthConfig.maxTokens,
      timeout: depthConfig.timeout,
    });

    const structured = safeParseStructuredAnswer(content);
    const formattedMarkdown = formatStructuredAnswerMarkdown(structured);

    const encoder = new TextEncoder();
    const chunks = chunkForStreaming(formattedMarkdown, 220);
    const stream = new ReadableStream({
      async start(controller) {
        const totalChunks = Math.max(chunks.length, 1);

        for (let index = 0; index < chunks.length; index++) {
          const isFinalChunk = index === chunks.length - 1;
          const payload = JSON.stringify({
            content: chunks[index],
            provider: 'gemini',
            progress: Math.round(((index + 1) / totalChunks) * 100),
            ...(isFinalChunk ? { structured } : {}),
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          if (index < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 16));
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    logger.apiResponse('POST', '/api/chat-first', 200, {
      processingTime: Date.now() - startTime,
      model: config.gemini.model,
      outputLength: formattedMarkdown.length,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    logger.error('Chat-first API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoint: '/api/chat-first',
      provider: 'gemini',
      mode: 'free-tier-only',
      format: 'structured-json-with-markdown-stream',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
