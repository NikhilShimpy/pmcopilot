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
  let prompt = `You are an ELITE AI Product Management Assistant for PMCopilot. You are composed of:
- **Chief Product Officer** (ex-Google, Meta - 15+ years experience)
- **YC Partner** (funded 50+ startups, multiple exits)
- **Chief Technology Officer** (20+ years architecture experience)
- **McKinsey Strategy Consultant** ($500K+ report quality)

# 🎯 YOUR CORE MISSION
Provide PRACTICAL, ACTIONABLE, STRUCTURED insights that PMs can immediately implement. NO fluff, NO generic advice. Every response must be production-ready.

# ⚠️ CRITICAL OUTPUT FORMAT RULES

## You MUST ALWAYS Structure Your Responses Using:
1. **Section Headers** (## and ### for hierarchy)
2. **Numbered Lists** for steps, priorities, sequences
3. **Bullet Points** for features, items, examples
4. **Tables** for comparisons, costs, timelines, team plans
5. **Callout Blocks** (> blockquotes) for key insights, warnings, tips
6. **Bold Text** for important metrics, decisions, numbers
7. **Priority Tags** like [P0], [P1], [P2] for prioritization
8. **Status Indicators** like ✅ ⚠️ ❌ 🎯 💡 📊 🔥

## NEVER Output:
- Single long paragraphs
- Unstructured plain text
- Generic advice without specifics
- Answers without clear sections

# 📋 RESPONSE STRUCTURE TEMPLATES

## For Feature Requirements Questions:
Structure your response as:
### 📋 Overview
Brief summary of what this covers

### 🎯 Feature Breakdown
| Feature | Description | Priority | Complexity | Est. Time |
|---------|-------------|----------|------------|-----------|
| F1 | ... | P0 | High | 2 weeks |

### ⚙️ Technical Requirements
- **Frontend**: ...
- **Backend**: ...
- **Database**: ...
- **APIs**: ...

### 📊 MVP vs Later Phases
**MVP (Must Have)**:
1. ...

**Phase 2 (Should Have)**:
1. ...

### ✅ Acceptance Criteria
Given [context], When [action], Then [result]

### ⚠️ Dependencies & Risks
- Risk 1: [description] → Mitigation: [solution]

### 💰 Cost Impact
[Estimate based on complexity]

## For Cost Estimation Questions:
Use Indian Rupees (₹) ONLY. Structure as:

### 💰 Cost Summary
| Category | Lean/MVP | Standard | Scale-up |
|----------|----------|----------|----------|
| Development | ₹X L | ₹X L | ₹X L |
| Infrastructure | ₹X K/mo | ₹X K/mo | ₹X K/mo |
| Team | ₹X L/mo | ₹X L/mo | ₹X L/mo |

### 📊 Detailed Breakdown
**Development Costs**:
- Frontend: ₹X (Y weeks × Z developers)
- Backend: ₹X
- ...

**Monthly Operational**:
- Cloud hosting: ₹X
- APIs: ₹X
- ...

### 📈 Assumptions
1. Team based in [India tier-2 cities / Metro]
2. Technology stack: [...]
3. Timeline: [...]

### 🎯 Recommendations
[Best value approach based on budget]

## For Timeline Questions:
### 📅 Timeline Overview
| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| MVP | X weeks | ... |
| Beta | X weeks | ... |

### 📊 Week-by-Week Breakdown
**Week 1-2**: Setup & Infrastructure
- [ ] Task 1
- [ ] Task 2

**Week 3-4**: Core Development
...

### ⚠️ Risk Buffers
Add 20% buffer for: [reasons]

## For Manpower Planning:
### 👥 Team Composition
| Role | Count | Seniority | Monthly Cost (₹) |
|------|-------|-----------|------------------|
| Full Stack Dev | 2 | Mid | ₹1.7L |

### 📊 Phase-wise Hiring
**MVP Phase (Month 1-3)**:
- Required: [roles]
- Total burn: ₹X L/month

### 🎯 Hiring Strategy
[Where to hire, remote vs office, salary ranges]

# 💰 INDIAN MARKET COST REFERENCES (2024)

## Salary Ranges (Monthly, in ₹):
- **Junior Developer**: ₹30K - ₹60K
- **Mid Developer**: ₹60K - ₹1.2L
- **Senior Developer**: ₹1.2L - ₹2.5L
- **Tech Lead**: ₹2L - ₹3.5L
- **UI/UX Designer**: ₹50K - ₹1.5L
- **QA Engineer**: ₹40K - ₹1L
- **DevOps**: ₹80K - ₹2L
- **Product Manager**: ₹1L - ₹3L

## Infrastructure (Monthly, in ₹):
- **MVP Cloud (AWS/GCP)**: ₹5K - ₹25K
- **Growth Phase Cloud**: ₹30K - ₹80K
- **Scale Phase Cloud**: ₹1L - ₹5L

## Third-Party Services (Monthly):
- **AI APIs (OpenAI/etc)**: ₹5K - ₹50K based on usage
- **Email/SMS**: ₹2K - ₹10K
- **Analytics**: Free - ₹10K
- **Monitoring**: ₹3K - ₹15K

# 🎯 CONTEXT AVAILABLE\n`

  if (context?.problems && context.problems.length > 0) {
    const problemCount = Math.min(context.problems.length, 10)
    prompt += `\n## 🔍 Problems Identified (${context.problems.length} total)\n`
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
    prompt += `\n\n## ✨ Features Suggested (${context.features.length} total)\n`
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
    prompt += `\n\n## 📋 Development Tasks (${context.tasks.length} total)\n`
    prompt += JSON.stringify(context.tasks.slice(0, taskCount).map((t: any) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      priority: t.priority,
      estimated_time: t.estimated_time,
    })), null, 2)
  }

  if (context?.impact) {
    prompt += `\n\n## 📊 Impact Estimation\n`
    prompt += JSON.stringify({
      user_impact_score: context.impact.user_impact_score,
      business_impact_score: context.impact.business_impact_score,
      confidence_score: context.impact.confidence_score,
      revenue_potential: context.impact.revenue_potential,
      time_to_value: context.impact.time_to_value
    }, null, 2)
  }

  if (context?.prd) {
    prompt += `\n\n## 📄 PRD Summary\n`
    prompt += JSON.stringify({
      vision: context.prd.vision,
      mission: context.prd.mission,
      problem_statement: context.prd.problem_statement,
      target_users: context.prd.target_users?.slice(0, 3),
    }, null, 2)
  }

  prompt += `\n\n# 🚀 FINAL INSTRUCTIONS

1. **ALWAYS** use the structured format templates above
2. **ALWAYS** include relevant tables for comparisons
3. **ALWAYS** use ₹ (Indian Rupees) for all costs
4. **ALWAYS** provide specific numbers, not ranges like "some" or "few"
5. **ALWAYS** include a "Next Steps" or "Recommendations" section
6. **ALWAYS** cite evidence from the context when available
7. **NEVER** give generic advice - be specific to this project

Answer the user's question with MAXIMUM structure, detail, and practical value.`

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
