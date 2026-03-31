import { NextRequest } from 'next/server'
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server'
import { handleError, successResponse, throwValidationError } from '@/lib/errorHandler'
import { sanitizeInput } from '@/utils/helpers'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return successResponse({ tickets: data || [] })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()
    const body = await request.json()

    const subject = sanitizeInput(body.subject || '')
    const message = String(body.message || '').trim()
    const category = body.category || 'general'
    const priority = body.priority || 'medium'
    const projectId = body.project_id || null

    if (!subject) {
      throwValidationError('Subject is required')
    }

    if (message.length < 10) {
      throwValidationError('Message should be at least 10 characters')
    }

    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (projectError || !project) {
        throwValidationError('Invalid project selection')
      }
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        project_id: projectId,
        subject,
        message,
        category,
        priority,
        status: 'open',
      })
      .select('*')
      .single()

    if (error) {
      throw error
    }

    return successResponse(data, 'Support ticket submitted', 201)
  } catch (error) {
    return handleError(error)
  }
}
