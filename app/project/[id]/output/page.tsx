import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/utils/helpers'
import ProjectOutputClient from './ProjectOutputClient'
import { buildResultFromSections } from '@/lib/analysisSessionStore'

interface OutputPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

function withSessionMetadata(baseResult: any, session: any) {
  const metadata = {
    ...(baseResult?.metadata || {}),
    ...(session?.metadata || {}),
    saved_analysis_id: session?.id || baseResult?.metadata?.saved_analysis_id,
    session_id: session?.id || baseResult?.metadata?.session_id,
    session_title:
      session?.title ||
      baseResult?.metadata?.session_title ||
      baseResult?.overview_summary?.product_name ||
      null,
    source_input:
      session?.prompt ||
      baseResult?.metadata?.source_input ||
      null,
    detail_level:
      session?.detail_level ||
      baseResult?.metadata?.detail_level ||
      'long',
  }

  return {
    ...(baseResult || {}),
    metadata,
  }
}

export default async function OutputPage({ params, searchParams }: OutputPageProps) {
  const { id } = await params
  const searchParamsResolved = await searchParams
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) {
    notFound()
  }

  let input = ''
  try {
    input = (searchParamsResolved.input as string) || ''
  } catch (decodeError) {
    console.error('Error parsing input query parameter:', decodeError)
  }

  const length = (searchParamsResolved.length as string) || 'long'
  const shouldGenerate = searchParamsResolved.generate === 'true'
  const requestedAnalysisId = (searchParamsResolved.analysis as string) || ''

  let initialAnalysis: any = null
  let initialAnalysisId: string | null = null
  let initialAnalysisSessionId: string | null = null
  let initialLegacyAnalysisId: string | null = null

  if (!shouldGenerate) {
    const { data: sessions, error: sessionsError } = await supabase
      .from('analysis_sessions')
      .select(
        'id, legacy_analysis_id, title, prompt, detail_level, metadata, created_at'
      )
      .eq('project_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!sessionsError && sessions && sessions.length > 0) {
      const selectedSession =
        requestedAnalysisId && isValidUUID(requestedAnalysisId)
          ? sessions.find(
              (session: any) =>
                session.id === requestedAnalysisId ||
                session.legacy_analysis_id === requestedAnalysisId
            ) || sessions[0]
          : sessions[0]

      if (selectedSession) {
        const [{ data: sectionRows }, { data: legacyAnalysis }] = await Promise.all([
          supabase
            .from('analysis_sections')
            .select('section_id, content')
            .eq('session_id', selectedSession.id),
          selectedSession.legacy_analysis_id
            ? supabase
                .from('analyses')
                .select('id, result')
                .eq('id', selectedSession.legacy_analysis_id)
                .eq('project_id', id)
                .maybeSingle()
            : Promise.resolve({ data: null as any }),
        ])

        const sessionResult = buildResultFromSections(
          sectionRows || [],
          legacyAnalysis?.result || null,
          selectedSession.metadata || {}
        )

        initialAnalysis = withSessionMetadata(sessionResult, selectedSession)
        initialAnalysisId = selectedSession.id
        initialAnalysisSessionId = selectedSession.id
        initialLegacyAnalysisId = selectedSession.legacy_analysis_id || null
      }
    }

    if (!initialAnalysis && requestedAnalysisId && isValidUUID(requestedAnalysisId)) {
      const { data: selectedAnalysis } = await supabase
        .from('analyses')
        .select('id, result')
        .eq('id', requestedAnalysisId)
        .eq('project_id', id)
        .maybeSingle()

      if (selectedAnalysis) {
        initialAnalysis = {
          ...(selectedAnalysis.result || {}),
          metadata: {
            ...(selectedAnalysis.result?.metadata || {}),
            saved_analysis_id: selectedAnalysis.id,
            session_id: selectedAnalysis.id,
            session_title:
              selectedAnalysis.result?.metadata?.session_title ||
              selectedAnalysis.result?.overview_summary?.product_name ||
              `Analysis - ${project.name}`,
          },
        }
        initialAnalysisId = selectedAnalysis.id
        initialLegacyAnalysisId = selectedAnalysis.id
      }
    }

    if (!initialAnalysis) {
      const { data: latestAnalysis } = await supabase
        .from('analyses')
        .select('id, result')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestAnalysis) {
        initialAnalysis = {
          ...(latestAnalysis.result || {}),
          metadata: {
            ...(latestAnalysis.result?.metadata || {}),
            saved_analysis_id: latestAnalysis.id,
            session_id: latestAnalysis.id,
            session_title:
              latestAnalysis.result?.metadata?.session_title ||
              latestAnalysis.result?.overview_summary?.product_name ||
              `Analysis - ${project.name}`,
          },
        }
        initialAnalysisId = latestAnalysis.id
        initialLegacyAnalysisId = latestAnalysis.id
      }
    }
  }

  return (
    <ProjectOutputClient
      project={project}
      user={user}
      initialInput={input}
      outputLength={length as 'short' | 'medium' | 'long' | 'extra-long'}
      shouldGenerate={shouldGenerate}
      initialAnalysis={initialAnalysis}
      initialAnalysisId={initialAnalysisId}
      initialAnalysisSessionId={initialAnalysisSessionId}
      initialLegacyAnalysisId={initialLegacyAnalysisId}
    />
  )
}

export async function generateMetadata({ params }: OutputPageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: project?.name ? `${project.name} - Analysis | PMCopilot` : 'Analysis - PMCopilot',
  }
}
