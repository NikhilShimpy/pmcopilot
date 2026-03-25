/**
 * PMCopilot - Conversational AI Chat API v3.0
 *
 * POST /api/chat - Stream AI responses with context awareness
 *
 * AI PROVIDERS:
 * - PRIMARY: Google Gemini API
 * - FALLBACK: Groq (ONLY if Gemini fails)
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { callAI } from '@/lib/aiEngine'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'

// Request validation schema
interface ChatRequest {
  project_id?: string
  analysis_id?: string
  message: string
  context?: {
    projectId?: string
    analysis?: ComprehensiveStrategyResult
    problems?: any[]
    features?: any[]
    prd?: any
    tasks?: any[]
    impact?: any
    focused_item?: string
  }
  config?: {
    timeout?: number
    max_tokens?: number
    temperature?: number
  }
}

// Default configuration
const DEFAULTS = {
  TIMEOUT: 60000,
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.7,
  CHUNK_SIZE: 5,
  CHUNK_DELAY: 20,
  MAX_MESSAGE_LENGTH: 10000,
  MAX_CONTEXT_SIZE: 50000,
}

/**
 * Validate and normalize request body
 */
function validateRequest(body: any): { valid: true; data: ChatRequest } | { valid: false; error: string } {
  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, error: 'Message is required and must be a string' }
  }

  const message = body.message.trim()
  if (!message) {
    return { valid: false, error: 'Message cannot be empty' }
  }

  if (message.length > DEFAULTS.MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message exceeds maximum length of ${DEFAULTS.MAX_MESSAGE_LENGTH} characters` }
  }

  if (body.context) {
    const contextStr = JSON.stringify(body.context)
    if (contextStr.length > DEFAULTS.MAX_CONTEXT_SIZE) {
      logger.warn('Context too large, will be truncated', { size: contextStr.length })
    }
  }

  return {
    valid: true,
    data: {
      message: message,
      project_id: body.project_id || body.context?.projectId || 'unknown',
      analysis_id: body.analysis_id || body.context?.analysis?.metadata?.analysis_id || 'unknown',
      context: body.context,
      config: {
        timeout: Math.min(body.config?.timeout || DEFAULTS.TIMEOUT, 120000),
        max_tokens: Math.min(body.config?.max_tokens || DEFAULTS.MAX_TOKENS, 4000),
        temperature: body.config?.temperature || DEFAULTS.TEMPERATURE,
      }
    }
  }
}

/**
 * Stream AI chat responses
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/chat')

    let body: any
    try {
      body = await request.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const validation = validateRequest(body)
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const data = validation.data

    logger.info('Chat request received', {
      projectId: data.project_id,
      analysisId: data.analysis_id,
      messageLength: data.message.length,
      hasContext: !!data.context,
      hasAnalysis: !!data.context?.analysis
    })

    // Build context from request
    const contextForPrompt = data.context?.analysis
      ? {
          problems: data.context.analysis.problem_analysis,
          features: data.context.analysis.feature_system,
          tasks: data.context.analysis.development_tasks,
          prd: data.context.analysis.prd,
          impact: data.context.analysis.impact_analysis,
          focused_item: data.context.focused_item,
        }
      : data.context

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(contextForPrompt)

    // Build message array
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: data.message }
    ]

    // Create streaming response with timeout
    const encoder = new TextEncoder()
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let isAborted = false

    const stream = new ReadableStream({
      async start(controller) {
        timeoutId = setTimeout(() => {
          if (!isAborted) {
            isAborted = true
            const errorData = JSON.stringify({ error: 'Request timeout - AI took too long to respond' })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        }, data.config!.timeout)

        try {
          // IMPORTANT: jsonMode: false for chat - we want natural text, not JSON
          const response = await callAI(messages, {
            temperature: data.config!.temperature,
            max_tokens: data.config!.max_tokens,
            timeout: data.config!.timeout,
            jsonMode: false, // Chat returns plain text, not JSON
          })

          if (timeoutId) clearTimeout(timeoutId)

          if (isAborted) return

          // Stream response in small chunks
          const chunks = splitIntoChunks(response.content, DEFAULTS.CHUNK_SIZE)
          let sentChunks = 0

          for (const chunk of chunks) {
            if (isAborted) break

            const chunkData = JSON.stringify({
              content: chunk,
              provider: response.provider,
              progress: Math.round((++sentChunks / chunks.length) * 100)
            })
            controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`))

            if (sentChunks < chunks.length) {
              await sleep(DEFAULTS.CHUNK_DELAY)
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          logger.apiResponse('POST', '/api/chat', 200, {
            processingTime: Date.now() - startTime,
            provider: response.provider,
            responseLength: response.content.length
          })

        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId)

          if (!isAborted) {
            logger.error('Chat streaming error', { error })
            const errorData = JSON.stringify({
              error: error instanceof Error ? error.message : 'AI service error',
              code: 'AI_ERROR'
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        }
      },
      cancel() {
        isAborted = true
        if (timeoutId) clearTimeout(timeoutId)
        logger.info('Chat stream cancelled by client')
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      }
    })

  } catch (error) {
    logger.error('Chat API error', { error })
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Build context-aware system prompt
 */
function buildSystemPrompt(context?: any): string {
  let prompt = `You are an expert product management AI assistant for PMCopilot. You help product managers understand analysis results and make better decisions.

# Your Core Mission
Provide PRACTICAL, REAL-WORLD insights that PMs can immediately act on. No fluff, no generic advice.

# Response Guidelines

## For Cost Estimations:
- Use Indian Rupees (₹) as default currency
- Base calculations on realistic Indian market rates:
  - Junior Developer: ₹30,000–₹50,000/month
  - Mid Developer: ₹60,000–₹1,00,000/month
  - Senior Developer: ₹1,00,000–₹2,00,000/month
  - Cloud (AWS/GCP MVP): ₹3,000–₹15,000/month
  - AI APIs: Usage-based, estimate ₹5,000–₹20,000/month for MVP
- Provide cost breakdown by phase: MVP → Growth → Scale

## For Timelines:
- Use WEEK-BASED estimates (not vague "6 months")
- Structure as:
  - Week 1-2: Setup & infrastructure
  - Week 3-6: Core feature development
  - Week 7-8: Testing & polish
  - Week 9-10: Beta launch
- Account for realistic delays (add 20% buffer)

## For Manpower Planning:
- Provide specific role recommendations
- Include team size by phase
- Calculate total monthly costs
- Suggest hiring timeline

## For Features & Problems:
- Explain WHY something matters, not just WHAT it is
- Cite specific user pain points
- Rate impact on 1-10 scale with justification
- Link suggestions to business outcomes (revenue, retention, etc.)

## For Tasks:
- Break into actionable subtasks
- Estimate hours, not days
- Identify dependencies clearly
- Suggest which tasks can be parallelized

## For Impact Analysis:
- Quantify expected improvements
- Provide confidence levels
- Include risk factors
- Project revenue/retention impact

# Communication Style
- **Structured**: Use headers, bullets, tables
- **Quantified**: Numbers > vague adjectives
- **Actionable**: Every response should have clear next steps
- **Honest**: If data is insufficient, say so

# Context Available\n`

  if (context?.problems && context.problems.length > 0) {
    const problemCount = Math.min(context.problems.length, 10)
    prompt += `\n## Problems Identified (${context.problems.length} total)\n`
    prompt += JSON.stringify(context.problems.slice(0, problemCount).map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.deep_description || p.description,
      severity: p.severity_score || p.severity,
      frequency: p.frequency_score || p.frequency,
      root_cause: p.root_cause,
      affected_users: p.affected_users,
    })), null, 2)
    if (context.problems.length > problemCount) {
      prompt += `\n... and ${context.problems.length - problemCount} more problems`
    }
  }

  if (context?.features && context.features.length > 0) {
    const featureCount = Math.min(context.features.length, 10)
    prompt += `\n\n## Features Suggested (${context.features.length} total)\n`
    prompt += JSON.stringify(context.features.slice(0, featureCount).map((f: any) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      why_needed: f.why_needed || f.detailed_description,
      complexity: f.complexity,
      linked_problems: f.linked_problems,
      user_value: f.user_value,
      business_value: f.business_value
    })), null, 2)
    if (context.features.length > featureCount) {
      prompt += `\n... and ${context.features.length - featureCount} more features`
    }
  }

  if (context?.tasks && context.tasks.length > 0) {
    const taskCount = Math.min(context.tasks.length, 10)
    prompt += `\n\n## Development Tasks (${context.tasks.length} total)\n`
    prompt += JSON.stringify(context.tasks.slice(0, taskCount).map((t: any) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      priority: t.priority,
      estimated_time: t.estimated_time,
    })), null, 2)
  }

  if (context?.impact) {
    prompt += `\n\n## Impact Estimation\n`
    prompt += JSON.stringify({
      user_impact_score: context.impact.user_impact_score,
      business_impact_score: context.impact.business_impact_score,
      confidence_score: context.impact.confidence_score,
      revenue_potential: context.impact.revenue_potential,
      time_to_value: context.impact.time_to_value
    }, null, 2)
  }

  if (context?.prd) {
    prompt += `\n\n## PRD Summary\n`
    prompt += JSON.stringify({
      vision: context.prd.vision,
      mission: context.prd.mission,
      problem_statement: context.prd.problem_statement,
      target_users: context.prd.target_users?.slice(0, 3),
    }, null, 2)
  }

  prompt += `\n\n# Output Format Requirements
- Use markdown with proper headers (##, ###)
- Use tables for comparisons, costs, timelines
- Use bullet lists for actionable items
- **Bold** key metrics and decisions
- Include a "Next Steps" section when relevant

Answer the user's question with specificity and practical value.`

  return prompt
}

/**
 * Split text into chunks for streaming
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const words = text.split(' ')
  const chunks: string[] = []

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize).join(' ')
    chunks.push(chunk + ' ')
  }

  return chunks
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * GET endpoint to check chat API health
 */
export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoint: '/api/chat',
      methods: ['POST'],
      version: '3.0',
      providers: ['gemini (primary)', 'groq (fallback)']
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
