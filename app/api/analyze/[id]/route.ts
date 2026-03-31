import { NextRequest } from 'next/server'
import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  handleError,
  successResponse,
  throwNotFoundError,
  throwValidationError,
} from '@/lib/errorHandler'
import { buildResultFromSections } from '@/lib/analysisSessionStore'
import { DB_TABLES } from '@/utils/constants'
import { isValidUUID } from '@/utils/helpers'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    logger.apiRequest('GET', `/api/analyze/${id}`)

    if (!isValidUUID(id)) {
      throwValidationError('Invalid analysis ID format')
    }

    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()

    const { data: session } = await supabase
      .from('analysis_sessions')
      .select(
        'id, project_id, title, prompt, detail_level, completion_percentage, generated_sections, metadata, legacy_analysis_id, created_at, updated_at'
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (session) {
      const [{ data: sectionRows }, { data: legacyAnalysis }] = await Promise.all([
        supabase
          .from('analysis_sections')
          .select('section_id, content')
          .eq('session_id', session.id),
        session.legacy_analysis_id
          ? supabase
              .from('analyses')
              .select('id, result')
              .eq('id', session.legacy_analysis_id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
      ])

      const result = buildResultFromSections(
        sectionRows || [],
        legacyAnalysis?.result || null,
        session.metadata || {}
      )

      const hydratedResult = {
        ...result,
        metadata: {
          ...(result.metadata || {}),
          saved_analysis_id: session.id,
          session_id: session.id,
          session_title: session.title,
          source_input: session.prompt,
          detail_level: session.detail_level || result.metadata?.detail_level || 'long',
        },
      }

      return successResponse({
        id: session.id,
        session_id: session.id,
        project_id: session.project_id,
        title: session.title,
        prompt: session.prompt,
        completion_percentage: session.completion_percentage || 0,
        generated_sections: session.generated_sections || [],
        db_created_at: session.created_at,
        db_updated_at: session.updated_at || session.created_at,
        result: hydratedResult,
        ...hydratedResult,
      })
    }

    const { data: analysis } = await supabase
      .from(DB_TABLES.ANALYSES)
      .select('id, project_id, result, created_at, projects!inner(user_id)')
      .eq('id', id)
      .eq('projects.user_id', user.id)
      .maybeSingle()

    if (!analysis) {
      throwNotFoundError('Analysis not found or access denied')
    }

    return successResponse({
      id: analysis.id,
      session_id: analysis.id,
      project_id: analysis.project_id,
      db_created_at: analysis.created_at,
      result: analysis.result,
      ...(analysis.result || {}),
    })
  } catch (error) {
    logger.apiResponse('GET', `/api/analyze/${id}`, 500)
    return handleError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  try {
    logger.apiRequest('DELETE', `/api/analyze/${id}`)

    if (!isValidUUID(id)) {
      throwValidationError('Invalid analysis ID format')
    }

    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()

    const { data: session } = await supabase
      .from('analysis_sessions')
      .select('id, user_id, legacy_analysis_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (session) {
      const { error: deleteSessionError } = await supabase
        .from('analysis_sessions')
        .delete()
        .eq('id', session.id)
        .eq('user_id', user.id)

      if (deleteSessionError) {
        throw deleteSessionError
      }

      if (session.legacy_analysis_id) {
        const { count: linkedCount } = await supabase
          .from('analysis_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('legacy_analysis_id', session.legacy_analysis_id)

        if (!linkedCount || linkedCount === 0) {
          await supabase.from('analyses').delete().eq('id', session.legacy_analysis_id)
        }
      }

      return successResponse({ deleted: true, id: session.id }, 'Analysis deleted successfully')
    }

    const { data: legacyAnalysis } = await supabase
      .from(DB_TABLES.ANALYSES)
      .select('id, projects!inner(user_id)')
      .eq('id', id)
      .eq('projects.user_id', user.id)
      .maybeSingle()

    if (!legacyAnalysis) {
      throwNotFoundError('Analysis not found or access denied')
    }

    const { error: deleteLegacyError } = await supabase
      .from(DB_TABLES.ANALYSES)
      .delete()
      .eq('id', id)

    if (deleteLegacyError) {
      throw deleteLegacyError
    }

    return successResponse({ deleted: true, id }, 'Analysis deleted successfully')
  } catch (error) {
    logger.apiResponse('DELETE', `/api/analyze/${id}`, 500)
    return handleError(error)
  }
}
