import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AnalysisSelectorClient from './AnalysisSelectorClient'

export default async function AnalysisSelectorPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const resolvedSearch = await searchParams
  const selectedProjectId = resolvedSearch.project || ''

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, description, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const projectIds = (projects || []).map((project) => project.id)

  let analyses: Array<{
    id: string
    session_id?: string
    project_id: string
    created_at: string
    title?: string
    prompt?: string
    completion_percentage?: number
    generated_sections?: string[]
  }> = []

  if (projectIds.length > 0) {
    const { data: sessions, error: sessionsError } = await supabase
      .from('analysis_sessions')
      .select('id, legacy_analysis_id, project_id, created_at, title, prompt, completion_percentage, generated_sections')
      .eq('user_id', user.id)
      .in('project_id', projectIds)
      .order('created_at', { ascending: false })

    if (!sessionsError && sessions) {
      analyses = sessions.map((session: any) => ({
        id: session.id,
        session_id: session.id,
        project_id: session.project_id,
        created_at: session.created_at,
        title: session.title,
        prompt: session.prompt,
        completion_percentage: session.completion_percentage || 0,
        generated_sections: Array.isArray(session.generated_sections)
          ? session.generated_sections
          : [],
      }))
    } else {
      const { data: legacyAnalyses } = await supabase
        .from('analyses')
        .select('id, project_id, created_at')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })

      analyses = legacyAnalyses || []
    }
  }

  return (
    <AnalysisSelectorClient
      user={{ id: user.id, email: user.email }}
      projects={projects || []}
      analyses={analyses || []}
      selectedProjectId={selectedProjectId}
    />
  )
}
