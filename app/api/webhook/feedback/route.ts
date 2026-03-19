/**
 * PMCopilot - Generic Webhook API
 *
 * POST /api/webhook/feedback
 * Receives feedback from any external source via webhook
 */

import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { handleError, successResponse, throwValidationError } from '@/lib/errorHandler'
import { feedbackIngestionService, type FeedbackSource } from '@/services/ingestion.service'
import { analysisTriggerService } from '@/services/trigger.service'
import { REGEX } from '@/utils/constants'

// Valid sources for webhook
const VALID_SOURCES: FeedbackSource[] = ['webhook', 'api', 'intercom', 'manual']

/**
 * POST /api/webhook/feedback
 * Generic webhook endpoint for external integrations
 */
export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/webhook/feedback')

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch {
      throwValidationError('Invalid JSON in request body')
      return
    }

    // Validate required fields
    const { project_id, content, source = 'webhook', metadata = {} } = body

    // Validate project_id
    if (!project_id || typeof project_id !== 'string') {
      throwValidationError('project_id is required')
    }

    if (!REGEX.UUID.test(project_id)) {
      throwValidationError('Invalid project_id format (must be UUID)')
    }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throwValidationError('Feedback content is required')
    }

    if (content.length > 10000) {
      throwValidationError('Feedback content too long (max 10000 characters)')
    }

    // Validate source
    const feedbackSource: FeedbackSource = VALID_SOURCES.includes(source as FeedbackSource)
      ? (source as FeedbackSource)
      : 'webhook'

    logger.info('Webhook feedback received', {
      projectId: project_id,
      contentLength: content.length,
      source: feedbackSource,
    })

    // Get Supabase client (admin for webhook endpoints)
    const supabase = await createServerSupabaseClient()

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      throwValidationError('Project not found')
    }

    // Save feedback
    const feedback = await feedbackIngestionService.saveFeedback(supabase, {
      project_id,
      content: content.trim(),
      source: feedbackSource,
      metadata: {
        ...metadata,
        webhook_timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || 'unknown',
      },
    })

    if (!feedback) {
      throw new Error('Failed to save feedback')
    }

    logger.info('Webhook feedback saved', {
      feedbackId: feedback.id,
      projectId: project_id,
      source: feedbackSource,
    })

    // Check if analysis should be triggered
    await analysisTriggerService.checkAndTrigger(supabase, project_id)

    logger.apiResponse('POST', '/api/webhook/feedback', 200, {
      feedbackId: feedback.id,
    })

    return successResponse(
      {
        feedback_id: feedback.id,
        project_id,
        source: feedbackSource,
        message: 'Feedback ingested successfully',
      },
      'Success',
      201
    )
  } catch (error) {
    logger.apiResponse('POST', '/api/webhook/feedback', 500)
    return handleError(error)
  }
}

/**
 * GET /api/webhook/feedback
 * Health check for webhook endpoint
 */
export async function GET() {
  return successResponse(
    {
      status: 'ok',
      endpoint: '/api/webhook/feedback',
      method: 'POST',
      required_fields: ['project_id', 'content'],
      optional_fields: ['source', 'metadata'],
      valid_sources: VALID_SOURCES,
      example_payload: {
        project_id: 'uuid-here',
        content: 'User feedback message',
        source: 'webhook',
        metadata: {
          user_id: 'optional',
          session_id: 'optional',
        },
      },
    },
    'Webhook endpoint ready'
  )
}
