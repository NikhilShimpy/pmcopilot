/**
 * PMCopilot - Conversational AI Chat API
 *
 * POST /api/chat - Stream AI responses with context awareness
 *
 * This endpoint enables users to ask questions about their analysis results.
 * The AI has full context of the analysis and can provide detailed explanations.
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { callAI } from '@/lib/aiEngine'
import { ComprehensiveAnalysisResult, Problem, Feature, DevelopmentTask } from '@/types/analysis'

interface ChatRequest {
  project_id: string
  analysis_id: string
  message: string
  context?: {
    problems?: Problem[]
    features?: Feature[]
    prd?: any
    tasks?: DevelopmentTask[]
    impact?: any
    focused_item?: string // ID of item dragged into chat
  }
}

/**
 * Stream AI chat responses
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/chat')

    // Parse request
    const body: ChatRequest = await request.json()

    if (!body.message || !body.analysis_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    logger.info('Chat request received', {
      analysisId: body.analysis_id,
      messageLength: body.message.length,
      hasContext: !!body.context
    })

    // Build context-aware system prompt
    const systemPrompt = buildSystemPrompt(body.context)

    // Build message array
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      {
        role: 'user' as const,
        content: body.message
      }
    ]

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call AI with streaming
          const response = await callAI(messages, {
            temperature: 0.7,
            max_tokens: 2000,
            timeout: 30000
          })

          // Split response into chunks for streaming effect
          const chunks = splitIntoChunks(response.content, 10)

          for (const chunk of chunks) {
            const data = JSON.stringify({ content: chunk, provider: response.provider })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))

            // Small delay for natural streaming feel
            await sleep(50)
          }

          // Send done signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          logger.apiResponse('POST', '/api/chat', 200, {
            processingTime: Date.now() - startTime,
            provider: response.provider,
            responseLength: response.content.length
          })

        } catch (error) {
          logger.error('Chat streaming error', { error })
          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error) {
    logger.error('Chat API error', { error })
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * Build context-aware system prompt
 */
function buildSystemPrompt(context?: ChatRequest['context']): string {
  let prompt = `You are an expert product management AI assistant for PMCopilot. You help product managers understand their analysis results and make better decisions.

# Your Capabilities
- Explain AI-generated insights (problems, features, PRDs, tasks)
- Cite specific user feedback as evidence
- Provide actionable recommendations
- Answer questions about prioritization, impact, and implementation
- Break down complex analysis into simple explanations

# Communication Style
- **Concise**: Keep responses under 200 words unless asked for detail
- **Evidence-based**: Always cite feedback quotes when making claims
- **Actionable**: Provide specific next steps
- **Honest**: If unsure, say so and suggest alternatives

# Context Available
You have access to the following analysis results:\n`

  if (context?.problems && context.problems.length > 0) {
    prompt += `\n## Problems Identified (${context.problems.length} total)\n`
    prompt += JSON.stringify(context.problems.slice(0, 5).map((p: any) => ({
      id: p.id,
      title: p.title,
      description: p.deep_description,
      severity: p.severity_score,
      frequency: p.frequency_score,
      root_cause: p.root_cause,
      affected_users: p.affected_users,
      evidence: p.evidence_examples
    })), null, 2)
    if (context.problems.length > 5) {
      prompt += `\n... and ${context.problems.length - 5} more problems`
    }
  }

  if (context?.features && context.features.length > 0) {
    prompt += `\n\n## Features Suggested (${context.features.length} total)\n`
    prompt += JSON.stringify(context.features.slice(0, 5).map((f: any) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      why_needed: f.why_needed,
      complexity: f.complexity,
      linked_problems: f.linked_problems,
      user_value: f.user_value,
      business_value: f.business_value
    })), null, 2)
    if (context.features.length > 5) {
      prompt += `\n... and ${context.features.length - 5} more features`
    }
  }

  if (context?.tasks && context.tasks.length > 0) {
    prompt += `\n\n## Development Tasks (${context.tasks.length} total)\n`
    prompt += JSON.stringify(context.tasks.slice(0, 3).map((t: any) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      priority: t.priority,
      estimated_time: t.estimated_time,
      expected_output: t.expected_output
    })), null, 2)
  }

  if (context?.impact) {
    prompt += `\n\n## Impact Estimation\n`
    prompt += JSON.stringify({
      user_impact_score: context.impact.user_impact_score,
      business_impact_score: context.impact.business_impact_score,
      confidence_score: context.impact.confidence_score,
      user_impact: context.impact.user_impact,
      business_impact: context.impact.business_impact,
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
      goals_short_term: context.prd.goals_short_term?.slice(0, 3)
    }, null, 2)
  }

  prompt += `\n\n# Response Format
- Use markdown for formatting
- **Bold** important points
- Use bullet lists for clarity
- Quote user feedback like this: > "User feedback quote"
- Keep responses conversational but professional

Now answer the user's question using this context.`

  return prompt
}

/**
 * Split text into chunks for natural streaming
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
 * Sleep utility for streaming delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * GET endpoint to retrieve chat history (optional future feature)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const analysisId = searchParams.get('analysis_id')

    if (!analysisId) {
      return new Response(
        JSON.stringify({ error: 'Missing analysis_id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // TODO: Fetch chat history from database
    // For now, return empty history

    return new Response(
      JSON.stringify({ messages: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    logger.error('Chat history fetch error', { error })
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
