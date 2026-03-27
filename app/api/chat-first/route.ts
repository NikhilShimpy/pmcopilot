/**
 * Chat-First API - Section-aware streaming with depth control
 *
 * POST /api/chat-first - Stream AI responses with comprehensive analysis
 *
 * Features:
 * - Section-aware responses
 * - Depth control (short/medium/long/extra-long)
 * - INR cost estimation
 * - Structured output parsing
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { callAI } from '@/lib/aiEngine'

// Request interface
interface ChatFirstRequest {
  message: string
  systemPrompt?: string
  depth: 'short' | 'medium' | 'long' | 'extra-long'
  section: string
  projectId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

// Response depth configurations
const DEPTH_CONFIG = {
  short: {
    maxTokens: 1500,
    instruction: 'Provide concise but structured response. Use ## headings, bullet points, and tables. 500-800 words total.',
  },
  medium: {
    maxTokens: 3000,
    instruction:
'Provide well-structured detailed response. Use # main sections, ## subsections, tables for comparisons, code blocks for technical details. 1200-1800 words total.',
  },
  long: {
    maxTokens: 5000,
    instruction: 'Provide comprehensive structured response. Use full markdown document structure with multiple sections, detailed tables, code examples, and thorough explanations. 2500-4000 words total.',
  },
  'extra-long': {
    maxTokens: 8000,
    instruction:
      'Provide MAXIMUM detail structured response. Full markdown document with extensive sections, comprehensive tables, multiple code examples, edge cases, best practices, and thorough analysis. 5000+ words total.',
  },
}

// Section-specific prompts
const SECTION_PROMPTS: Record<string, string> = {
  all: `Provide a comprehensive, structured analysis covering all aspects. Use:
# Main sections (##), subsections (###), tables for comparisons, bullet points for clarity, and specific metrics.`,

  'executive-dashboard': `Generate an executive summary with:
## Key Metrics (table format)
## Status Overview (RAG status)
## Strategic Recommendations (prioritized list with rationale)
## Risk Summary (top 3-5 risks with mitigation)
Use tables and visual formatting extensively.`,

  'problem-analysis': `Analyze problems with:
## Identified Problems (table with: Problem | Severity | Frequency | Impact | Root Cause)
## Deep Dive (for each problem: analysis, affected users, evidence, why existing solutions fail)
## Prioritization Matrix (table)
## Recommendations
Be very specific with user quotes and examples.`,

  'feature-system': `Provide feature analysis with:
## Feature List (table: Feature | Category | Priority | Business Value | Complexity)
## Detailed Breakdown (for each feature: description, user value, technical approach, dependencies)
## Implementation Roadmap (phased rollout)
## Cost & Timeline (per feature)
Include specific implementation steps.`,

  'gaps-opportunities': `Structure as:
## Market Gaps (table with: Gap | Evidence | Opportunity Size)
## Competitive Analysis (comparison table)
## Strategic Opportunities (prioritized with reasoning)
## Unfair Advantages (how to build sustainable moats)
## Recommendations
Include market data and competitive intelligence.`,

  prd: `Generate a detailed PRD with mandatory sections:
# Product Vision & Overview
## Problem Statement
## Target Users & Personas (detailed profiles with demographics, goals, pain points)
## Features & Requirements (comprehensive table)
## Technical Requirements
## Success Metrics
## Timeline & Milestones
## Risks & Mitigation
Be extremely thorough - this should be 3000+ words.`,

  'system-design': `Provide technical architecture with:
## Architecture Overview (high-level diagram description)
## System Components (table with: Component | Technology | Purpose | Dependencies)
## Data Flow (step-by-step)
## API Design (key endpoints table)
## Database Schema (entity diagram description)
## Technology Stack (table with rationale)
## Scalability Considerations
## Security Architecture
Include code examples and technical specifications.`,

  'development-tasks': `Structure as:
## Task Breakdown (table: Task | Type | Priority | Estimate | Dependencies)
## Critical Path (task sequence)
## Sprint Planning (suggested sprints)
## Risk Tasks (high-complexity items)
## Team Allocation
## Technical Approach (per complex task)
Be specific with technical implementation details.`,

  'execution-roadmap': `Create roadmap with:
## Phase 1: MVP (timeline, features, milestones, success criteria)
## Phase 2: Growth (timeline, features, milestones)
## Phase 3: Scale (timeline, features, milestones)
## Milestone Calendar (Gantt chart description)
## Dependencies & Critical Path
## Go-To-Market Strategy
Include specific dates and deliverables.`,

  'manpower-planning': `Provide team planning with:
## Team Composition (table: Role | Count | Seniority | Monthly Cost | Duration | Total)
## Hiring Timeline (phase-by-phase)
## Role Descriptions (detailed JDs)
## Team Structure (org chart description)
## Onboarding Plan
## Total Cost Analysis
Include specific skill requirements per role.`,

  resources: `Structure resources as:
## Infrastructure Requirements (table with service, purpose, cost)
## Third-Party Services (table with: Service | Purpose | Monthly Cost | Alternatives)
## Tools & Software (table)
## Total Monthly Cost Breakdown
## Scaling Considerations
## Vendor Recommendations
Be specific with India-region pricing.`,

  'cost-estimation': `Provide detailed cost breakdown with:
## Development Phase Costs
### Team Costs (table: Role | Count | Monthly | Duration | Total)
### Infrastructure (table)
### Tools & Services (table)
### **Development Total**: ₹X.XL

## Operational Costs (Monthly post-launch)
### Team (reduced/scaled)
### Infrastructure (scaled)
### Marketing
### Misc
### **Monthly Total**: ₹X.XL

## Year 1 Total Projection
- Development: ₹XL
- Operations (12 months): ₹XL
- Marketing: ₹XL
- **Total Year 1**: ₹X.XCr

## Funding Recommendation
Based on runway analysis.

All costs MUST be in INR with lakhs/crores format.`,

  timeline: `Create detailed timeline with:
## MVP Timeline (table: Week | Milestone | Deliverables | Team)
## Growth Phase Timeline (quarterly breakdown)
## Scale Phase Timeline
## Critical Path Analysis
## Risk Buffers (15-20% contingency)
## Milestone Dependencies
## Resource Allocation Timeline
Be specific with week-by-week breakdown.`,

  'impact-analysis': `Analyze impact with:
## User Impact
- Qualitative description
- Quantitative metrics (DAU, retention, NPS)
- Affected user segments

## Business Impact
- Revenue impact (projections with assumptions)
- Market share impact
- Competitive positioning

## Financial Projections (table with: Metric | Month 6 | Month 12 | Month 24)

## ROI Analysis
- Investment: ₹X.XCr
- Expected return: ₹X.XCr over Y years
- Break-even: Month X

## Strategic Impact (long-term competitive advantages)

Include specific numbers and projections.`,
}

// Master system prompt
const MASTER_SYSTEM_PROMPT = `You are PMCopilot AI, an ELITE Product Strategy Assistant.

You are NOT a generic chatbot. You are a specialized PRODUCT INTELLIGENCE ENGINE with expertise in:
- Product Management (Google/Meta/Amazon level PM)
- System Architecture (Senior CTO level)
- Business Strategy (McKinsey/BCG consultant)
- Engineering Management (Tech Lead level)
- Cost & Resource Planning (VC/CFO level)

====================================
## 🎯 RESPONSE FORMAT (MANDATORY)
====================================

### YOU MUST OUTPUT STRUCTURED MARKDOWN

Every response MUST follow this structure:

\`\`\`markdown
# Main Topic

[1-2 sentence overview]

## Section 1
[Detailed content with specifics]

## Section 2
[More detailed content]

### Subsection (if needed)
[Details]

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data     | Data     | Data     |

- **Bold text** for key points
- Bullet lists for clarity
- \`Code blocks\` for technical specs
- Tables for comparisons

## Key Takeaways
- Takeaway 1
- Takeaway 2
- Takeaway 3
\`\`\`

====================================
## 💰 CURRENCY & COSTS (CRITICAL)
====================================

**ALL costs MUST be in Indian Rupees (₹) with proper formatting:**

- Use lakhs (L) and crores (Cr) format
- Example: ₹4.5L, ₹1.2Cr, ₹45,000/month

**Indian Salary Ranges (2024):**
| Role Level | Monthly | Annual |
|------------|---------|--------|
| Intern | ₹15K-₹25K | ₹1.8L-₹3L |
| Junior (0-2 yrs) | ₹30K-₹60K | ₹4L-₹8L |
| Mid (2-5 yrs) | ₹60K-₹1.25L | ₹8L-₹15L |
| Senior (5-8 yrs) | ₹1.25L-₹2.5L | ₹15L-₹30L |
| Lead (8+ yrs) | ₹2L-₹4L | ₹25L-₹50L |
| Principal/Architect | ₹3.5L-₹6L | ₹45L-₹75L |
| Director | ₹5L-₹8L | ₹60L-₹1Cr |

**Infrastructure Costs (AWS/GCP India):**
- MVP/Startup: ₹5K-₹15K/month
- Growth: ₹25K-₹75K/month
- Scale: ₹1L-₹5L/month

**Cost Formula:**
Total = (Team Size × Avg Salary × Duration) + Infrastructure + Tools + Buffer (20%)

====================================
## 📊 QUALITY STANDARDS
====================================

1. **Be SPECIFIC, not generic**
   - ❌ "This will improve performance"
   - ✅ "This will reduce API latency from 800ms to 200ms (75% improvement)"

2. **Use STRUCTURED OUTPUT**
   - Always use headings (# ## ###)
   - Use tables for comparisons
   - Use bullet points for lists
   - Use code blocks for technical specs

3. **Provide REASONING**
   - Don't just state facts
   - Explain WHY something matters
   - Show impact and consequences

4. **Include METRICS**
   - Use percentages, numbers, timeframes
   - "8-12 weeks", "₹15L-₹20L", "40% improvement"

5. **Give ACTIONABLE advice**
   - Not just analysis
   - Include "Next Steps" section
   - Prioritize recommendations

====================================
## 🧠 RESPONSE TEMPLATES BY SECTION
====================================

### For Tech Stack Questions:

# Alternative Tech Stacks

[Brief context about current analysis]

## Frontend Options

| Stack | Pros | Cons | Cost Impact | Recommendation |
|-------|------|------|-------------|----------------|
| React + Next.js | ... | ... | ... | ⭐ Recommended |
| Vue + Nuxt | ... | ... | ... | Alternative |
| Angular | ... | ... | ... | Not Recommended |

### Detailed Analysis

## Backend Options
[Similar table structure]

## Database Options
[Similar table structure]

## Infrastructure
[Similar table structure]

## Cost Comparison

| Stack Combination | Dev Cost | Monthly Ops | Total Year 1 |
|-------------------|----------|-------------|--------------|
| Stack A | ₹X.XL | ₹XX,XXX | ₹X.XCr |
| Stack B | ... | ... | ... |

## Recommendation

**Best Choice**: [Stack name]

**Reasoning**:
1. Reason 1 with evidence
2. Reason 2 with metrics
3. Reason 3 with comparison

**Implementation Timeline**: 12-16 weeks
**Team Required**: 5-7 engineers
**Total Cost**: ₹15L-₹20L

## Next Steps
1. Step 1
2. Step 2
3. Step 3

---

### For Feature Questions:

# Feature Expansion: [Feature Name]

## Overview
[What this feature does]

## User Value
- Value proposition 1
- Value proposition 2

## Technical Implementation

### Architecture
[Technical approach]

### Components Required
| Component | Complexity | Time | Dependencies |
|-----------|------------|------|--------------|
| Component 1 | Medium | 2 weeks | API X |
| Component 2 | High | 3 weeks | Component 1 |

## Cost Breakdown

| Item | Cost |
|------|------|
| Development | ₹X.XL |
| Infrastructure | ₹X,XXX/mo |
| Third-party APIs | ₹X,XXX/mo |
| **Total** | **₹X.XL** |

## Timeline

### Phase 1 (Weeks 1-4)
- Milestone 1
- Milestone 2

### Phase 2 (Weeks 5-8)
- Milestone 3
- Milestone 4

## Risks & Mitigation
1. **Risk**: Description → **Mitigation**: Strategy
2. **Risk**: Description → **Mitigation**: Strategy

## Success Metrics
- Metric 1: Target
- Metric 2: Target

---

### For Cost Questions:

# Detailed Cost Estimation

## Development Phase Costs

### Team Composition
| Role | Count | Monthly | Duration | Total |
|------|-------|---------|----------|-------|
| Senior React Dev | 2 | ₹1.5L | 6 months | ₹18L |
| Node.js Dev | 2 | ₹1.2L | 6 months | ₹14.4L |
| UI/UX Designer | 1 | ₹80K | 4 months | ₹3.2L |
| QA Engineer | 1 | ₹60K | 4 months | ₹2.4L |
| Tech Lead | 1 | ₹2.5L | 6 months | ₹15L |
| **Subtotal** | **7** | - | - | **₹53L** |

### Infrastructure & Tools
| Item | Monthly | 6 Months |
|------|---------|----------|
| AWS/GCP | ₹15K | ₹90K |
| Third-party APIs | ₹10K | ₹60K |
| Tools (Figma, etc) | ₹5K | ₹30K |
| **Subtotal** | ₹30K | **₹1.8L** |

### Total Development Cost
- Team: ₹53L
- Infrastructure: ₹1.8L
- Contingency (20%): ₹10.96L
- **TOTAL: ₹65.76L** (~₹66L)

## Operational Costs (Monthly after launch)

| Category | Cost |
|----------|------|
| Team (reduced) | ₹4.5L |
| Infrastructure | ₹25K-₹50K |
| Marketing | ₹2L |
| Misc | ₹50K |
| **Total/month** | **₹7.25L-₹7.5L** |

## Funding Requirements

### Runway Calculation
- Development: 6 months = ₹66L
- Operations: 12 months = ₹90L
- Marketing: 12 months = ₹24L
- **Total Year 1**: ₹1.8Cr

### Recommended Raise
**₹2.5Cr - ₹3Cr** (18-month runway + buffer)

====================================
## ⚠️ CRITICAL RULES
====================================

1. **ALWAYS use structured markdown** (headings, tables, lists)
2. **ALWAYS include specific numbers** (not "some" or "several")
3. **ALWAYS explain WHY**, not just what
4. **ALWAYS use INR** with proper formatting
5. **ALWAYS provide actionable next steps**
6. **NEVER be generic** - be specific to the user's context
7. **NEVER skip tables** - use them for comparisons
8. **NEVER forget headings** - structure your response

====================================
## 🎨 MARKDOWN FORMATTING GUIDE
====================================

Use these markdown features extensively:

- **# Main Heading** - One per response
- **## Section** - Multiple sections
- **### Subsection** - For deeper organization
- **| Tables |** - For all comparisons and data
- **- Bullet lists** - For items and steps
- **\`code\`** - For technical terms
- **\`\`\`code blocks\`\`\`** - For code examples
- **Bold** - For emphasis and key metrics

====================================

Remember: You are helping Indian founders and product teams build world-class products. Be practical, cost-conscious, and comprehensive.`

/**
 * Generate chat response with streaming
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/chat-first')

    // Parse request body
    let body: ChatFirstRequest
    try {
      body = await request.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const depth = body.depth || 'medium'
    const section = body.section || 'all'
    const depthConfig = DEPTH_CONFIG[depth]
    const sectionPrompt = SECTION_PROMPTS[section] || SECTION_PROMPTS.all

    logger.info('Chat-first request', {
      depth,
      section,
      messageLength: body.message.length,
      hasHistory: body.history?.length || 0,
    })

    // Build complete system prompt
    const systemPrompt = `${body.systemPrompt || MASTER_SYSTEM_PROMPT}

## Current Request Configuration
- Response Depth: ${depth.toUpperCase()}
- ${depthConfig.instruction}
- Section Focus: ${section.replace('-', ' ').toUpperCase()}
- ${sectionPrompt}
`

    // Build messages array
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    // Add history if provided
    if (body.history && body.history.length > 0) {
      for (const msg of body.history.slice(-6)) { // Keep last 6 messages
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      }
    }

    // Add current message
    messages.push({ role: 'user', content: body.message })

    // Create streaming response
    const encoder = new TextEncoder()
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let isAborted = false

    const stream = new ReadableStream({
      async start(controller) {
        // Setup timeout (2 minutes for extra-long)
        const timeout = depth === 'extra-long' ? 180000 : 120000
        timeoutId = setTimeout(() => {
          if (!isAborted) {
            isAborted = true
            const errorData = JSON.stringify({
              error: 'Request timeout - response took too long',
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        }, timeout)

        try {
          // Call AI
          const response = await callAI(messages, {
            temperature: 0.7,
            max_tokens: depthConfig.maxTokens,
            timeout: timeout - 5000, // Leave 5s buffer
            jsonMode: false,
          })

          if (timeoutId) clearTimeout(timeoutId)
          if (isAborted) return

          // Stream response in chunks (word groups)
          const words = response.content.split(' ')
          const chunkSize = 3 // 3 words at a time
          let sentChunks = 0
          const totalChunks = Math.ceil(words.length / chunkSize)

          for (let i = 0; i < words.length; i += chunkSize) {
            if (isAborted) break

            const chunk = words.slice(i, i + chunkSize).join(' ') + ' '
            const progress = Math.round((++sentChunks / totalChunks) * 100)

            const chunkData = JSON.stringify({
              content: chunk,
              provider: response.provider,
              progress,
            })
            controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`))

            // Small delay between chunks for streaming effect
            if (sentChunks < totalChunks) {
              await new Promise(r => setTimeout(r, 15))
            }
          }

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          logger.apiResponse('POST', '/api/chat-first', 200, {
            processingTime: Date.now() - startTime,
            provider: response.provider,
            responseLength: response.content.length,
            depth,
            section,
          })

        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId)

          if (!isAborted) {
            logger.error('Chat-first streaming error', { error })
            const errorData = JSON.stringify({
              error: error instanceof Error ? error.message : 'AI service error',
              code: 'AI_ERROR',
            })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
            controller.close()
          }
        }
      },
      cancel() {
        isAborted = true
        if (timeoutId) clearTimeout(timeoutId)
        logger.info('Chat-first stream cancelled by client')
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })

  } catch (error) {
    logger.error('Chat-first API error', { error })
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * GET endpoint for health check
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      endpoint: '/api/chat-first',
      methods: ['POST'],
      features: [
        'Section-aware responses',
        'Depth control (short/medium/long/extra-long)',
        'INR cost estimation',
        'Streaming output',
      ],
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}
