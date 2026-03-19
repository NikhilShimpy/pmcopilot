/**
 * PMCopilot - Slack Integration API
 *
 * POST /api/integrations/slack
 * Receives Slack messages via webhook
 */

import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { logger } from '@/lib/logger'
import { handleError, successResponse, throwValidationError } from '@/lib/errorHandler'
import { feedbackIngestionService } from '@/services/ingestion.service'
import { analysisTriggerService } from '@/services/trigger.service'
import { isValidUUID } from '@/utils/helpers'

/**
 * POST /api/integrations/slack
 * Receive feedback from Slack (webhook style)
 */
export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/integrations/slack')

    // Parse request body
    let body: any
    try {
      body = await request.json()
    } catch {
      throwValidationError('Invalid JSON in request body')
      return
    }

    // Validate required fields
    const { project_id, text, user, channel } = body

    if (!project_id || !isValidUUID(project_id)) {
      throwValidationError('Valid project_id is required')
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throwValidationError('Message text is required')
    }

    logger.info('Slack message received', {
      projectId: project_id,
      textLength: text.length,
      user,
      channel,
    })

    // Save as feedback
    const feedback = await feedbackIngestionService.saveFeedback(supabase, {
      project_id,
      content: text,
      source: 'slack',
      metadata: {
        user: user || 'unknown',
        channel: channel || 'direct',
        timestamp: body.timestamp || new Date().toISOString(),
        thread_ts: body.thread_ts,
      },
    })

    if (!feedback) {
      throw new Error('Failed to save Slack message as feedback')
    }

    logger.info('Slack message saved as feedback', {
      feedbackId: feedback.id,
      projectId: project_id,
    })

    // Check if analysis should be triggered
    await analysisTriggerService.checkAndTrigger(supabase, project_id)

    logger.apiResponse('POST', '/api/integrations/slack', 200, {
      feedbackId: feedback.id,
    })

    return successResponse(
      {
        feedback_id: feedback.id,
        message: 'Slack message ingested successfully',
      },
      'Success',
      200
    )
  } catch (error) {
    logger.apiResponse('POST', '/api/integrations/slack', 500)
    return handleError(error)
  }
}

/**
 * GET /api/integrations/slack
 * Simulate importing Slack messages
 */
export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/integrations/slack')

    // Get project_id from query
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId || !isValidUUID(projectId)) {
      throwValidationError('Valid project_id is required')
    }

    logger.info('Simulating Slack import', { projectId })

    // SIMULATED SLACK MESSAGES
    const mockMessages = [
      {
        text: '@channel The new dashboard is loading really slowly. Anyone else experiencing this?',
        user: 'john_doe',
        channel: '#product-feedback',
        timestamp: new Date().toISOString(),
      },
      {
        text: 'Bug report: Export feature is not working on Chrome. Getting a 404 error.',
        user: 'jane_smith',
        channel: '#bugs',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        text: 'Feature idea: Would love to see keyboard shortcuts for common actions!',
        user: 'alex_johnson',
        channel: '#feature-requests',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
    ]

    // Ingest messages as feedback
    const ingested: any[] = []

    for (const message of mockMessages) {
      const feedback = await feedbackIngestionService.saveFeedback(supabase, {
        project_id: projectId,
        content: message.text,
        source: 'slack',
        metadata: {
          user: message.user,
          channel: message.channel,
          timestamp: message.timestamp,
        },
      })

      if (feedback) {
        ingested.push(feedback)
      }
    }

    logger.info('Slack messages ingested', {
      projectId,
      count: ingested.length,
    })

    // Check if analysis should be triggered
    await analysisTriggerService.checkAndTrigger(supabase, projectId)

    logger.apiResponse('GET', '/api/integrations/slack', 200, {
      ingested: ingested.length,
    })

    return successResponse(
      {
        ingested: ingested.length,
        feedbacks: ingested,
        message: `${ingested.length} messages imported from Slack`,
      },
      'Slack integration successful',
      200
    )
  } catch (error) {
    logger.apiResponse('GET', '/api/integrations/slack', 500)
    return handleError(error)
  }
}
