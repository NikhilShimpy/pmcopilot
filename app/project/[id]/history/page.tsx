import { notFound, redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  REQUIRED_ANALYSIS_SECTIONS,
  calculateSectionCompletion,
} from '@/lib/analysisSessionStore'
import ProjectHistoryClient, { type AnalysisHistoryEntry } from './ProjectHistoryClient'

interface ProjectHistoryPageProps {
  params: Promise<{ id: string }>
}

function toLegacyEntry(analysis: any, projectName: string): AnalysisHistoryEntry {
  const generatedSections = Array.isArray(analysis?.result?.metadata?.generated_sections)
    ? analysis.result.metadata.generated_sections
    : []
  const title =
    analysis?.result?.metadata?.session_title ||
    analysis?.result?.overview_summary?.product_name ||
    `Legacy analysis - ${projectName}`
  const prompt =
    analysis?.result?.metadata?.source_input ||
    analysis?.result?.overview_summary?.one_line_summary ||
    ''

  return {
    analysis_id: analysis.id,
    session_id: null,
    source: 'legacy',
    title,
    prompt,
    prompt_preview: prompt.slice(0, 240),
    completion_percentage: calculateSectionCompletion(generatedSections),
    generated_sections: generatedSections,
    created_at: analysis.created_at,
    updated_at: analysis.created_at,
    detail_level: (analysis?.result?.metadata?.detail_level as string | undefined) || 'long',
    provider: (analysis?.result?.metadata?.provider as string | undefined) || 'gemini',
    model: (analysis?.result?.metadata?.model_used as string | undefined) || null,
  }
}

export default async function ProjectHistoryPage({ params }: ProjectHistoryPageProps) {
  const { id: projectId } = await params
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, description, created_at, updated_at')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  let historyEntries: AnalysisHistoryEntry[] = []

  const { data: sessions, error: sessionsError } = await supabase
    .from('analysis_sessions')
    .select(
      'id, legacy_analysis_id, title, prompt, completion_percentage, generated_sections, detail_level, provider, model, created_at, updated_at, metadata'
    )
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!sessionsError && sessions) {
    const sessionEntries: AnalysisHistoryEntry[] = sessions.map((session: any) => {
      const generatedSections = Array.isArray(session.generated_sections)
        ? session.generated_sections
        : []
      const prompt = session.prompt || ''
      const completionPercentage =
        typeof session.completion_percentage === 'number' && Number.isFinite(session.completion_percentage)
          ? session.completion_percentage
          : calculateSectionCompletion(generatedSections)

      return {
        analysis_id: session.id,
        session_id: session.id,
        source: 'session',
        title: session.title || `Analysis - ${project.name}`,
        prompt,
        prompt_preview: prompt.slice(0, 240),
        completion_percentage: completionPercentage,
        generated_sections: generatedSections,
        created_at: session.created_at,
        updated_at: session.updated_at || session.created_at,
        detail_level: session.detail_level || (session.metadata?.detail_level as string | undefined) || 'long',
        provider: session.provider || (session.metadata?.provider as string | undefined) || 'gemini',
        model:
          session.model ||
          (session.metadata?.model_used as string | undefined) ||
          null,
      }
    })

    const linkedLegacyIds = new Set(
      sessions
        .map((session: any) => session.legacy_analysis_id)
        .filter((value: string | null) => Boolean(value))
    )

    const { data: legacyRows } = await supabase
      .from('analyses')
      .select('id, result, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    const legacyEntries = (legacyRows || [])
      .filter((analysis: any) => !linkedLegacyIds.has(analysis.id))
      .map((analysis: any) => toLegacyEntry(analysis, project.name))

    historyEntries = [...sessionEntries, ...legacyEntries].sort(
      (a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at))
    )
  } else {
    const { data: legacyRows } = await supabase
      .from('analyses')
      .select('id, result, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    historyEntries = (legacyRows || []).map((analysis: any) =>
      toLegacyEntry(analysis, project.name)
    )
  }

  return (
    <ProjectHistoryClient
      user={{ id: user.id, email: user.email }}
      project={project}
      requiredSections={REQUIRED_ANALYSIS_SECTIONS}
      initialEntries={historyEntries}
    />
  )
}
