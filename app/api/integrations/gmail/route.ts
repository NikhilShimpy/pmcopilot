/**
 * PMCopilot - Gmail Integration API
 *
 * GET /api/integrations/gmail?project_id=xxx
 * Simulates Gmail integration by providing mock emails
 * In production, this would use Gmail API with OAuth
 */

import { NextRequest } from 'next/server'
import { supabase, requireAuth } from '@/lib/supabaseClient'
import { logger } from '@/lib/logger'
import { handleError, successResponse, throwValidationError } from '@/lib/errorHandler'
import { feedbackIngestionService } from '@/services/ingestion.service'
import { analysisTriggerService } from '@/services/trigger.service'
import { isValidUUID } from '@/utils/helpers'

/**
 * GET /api/integrations/gmail
 * Fetch emails from Gmail (simulated)
 */
export async function GET(request: NextRequest) {
  try {
    logger.apiRequest('GET', '/api/integrations/gmail')

    // Require authentication
    const user = await requireAuth(supabase)

    // Get project_id from query
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId || !isValidUUID(projectId)) {
      throwValidationError('Valid project_id is required')
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      throwValidationError('Project not found or access denied')
    }

    logger.info('Simulating Gmail fetch', { projectId, projectName: project.name })

    // SIMULATED GMAIL EMAILS
    // In production, this would call Gmail API with OAuth token
    const mockEmails = [
      {
        id: 'email_001',
        subject: 'App crashes on large file uploads',
        from: 'user1@example.com',
        body: 'Hi team, I have been trying to upload a 50MB file and the app keeps crashing. This is really frustrating as I need to share this with my team urgently.',
        date: new Date().toISOString(),
      },
      {
        id: 'email_002',
        subject: 'Feature request: Dark mode',
        from: 'user2@example.com',
        body: 'Love your product! Would be amazing to have a dark mode option. My eyes hurt after using it for extended periods.',
        date: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'email_003',
        subject: 'Slow performance on mobile',
        from: 'user3@example.com',
        body: 'The mobile app is significantly slower than the desktop version. Loading times are around 5-10 seconds which is way too long.',
        date: new Date(Date.now() - 7200000).toISOString(),
      },
    ]

    // Ingest emails as feedback
    const ingested: any[] = []

    for (const email of mockEmails) {
      const feedback = await feedbackIngestionService.saveFeedback(supabase, {
        project_id: projectId,
        content: `${email.subject}\n\n${email.body}`,
        source: 'gmail',
        metadata: {
          subject: email.subject,
          from: email.from,
          date: email.date,
          email_id: email.id,
        },
      })

      if (feedback) {
        ingested.push(feedback)
      }
    }

    logger.info('Gmail emails ingested', {
      projectId,
      count: ingested.length,
    })

    // Check if analysis should be triggered
    await analysisTriggerService.checkAndTrigger(supabase, projectId)

    logger.apiResponse('GET', '/api/integrations/gmail', 200, {
      ingested: ingested.length,
    })

    return successResponse(
      {
        ingested: ingested.length,
        feedbacks: ingested,
        message: `${ingested.length} emails imported from Gmail`,
      },
      'Gmail integration successful',
      200
    )
  } catch (error) {
    logger.apiResponse('GET', '/api/integrations/gmail', 500)
    return handleError(error)
  }
}

/**
 * POST /api/integrations/gmail
 * Manually trigger Gmail sync (for future use)
 */
export async function POST(request: NextRequest) {
  try {
    logger.apiRequest('POST', '/api/integrations/gmail')

    // Require authentication
    const user = await requireAuth(supabase)

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { project_id, access_token } = body

    if (!project_id || !isValidUUID(project_id)) {
      throwValidationError('Valid project_id is required')
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', project_id)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      throwValidationError('Project not found or access denied')
    }

    // TODO: In production, use access_token to fetch real Gmail emails
    // For now, return mock response
    logger.info('Gmail sync triggered (simulated)', { project_id })

    return successResponse(
      {
        message: 'Gmail sync initiated (simulated)',
        project_id,
      },
      'Sync started',
      200
    )
  } catch (error) {
    logger.apiResponse('POST', '/api/integrations/gmail', 500)
    return handleError(error)
  }
}
