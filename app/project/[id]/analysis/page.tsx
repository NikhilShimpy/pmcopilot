import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import AnalysisPageClient from '@/components/analysis/AnalysisPageClient'

interface AnalysisPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ analysis?: string }>
}

export default async function AnalysisPage({ params, searchParams }: AnalysisPageProps) {
  const { id: projectId } = await params
  const { analysis: analysisId } = await searchParams

  const supabase = createServerSupabaseClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify project exists and belongs to user
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // If no specific analysis ID provided, get the most recent one
  let finalAnalysisId: string | undefined = analysisId

  if (!finalAnalysisId) {
    const { data: latestAnalysis } = await supabase
      .from('analyses')
      .select('id')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!latestAnalysis) {
      // No analysis exists yet, redirect to project page
      redirect(`/project/${projectId}`)
    }

    finalAnalysisId = latestAnalysis.id
  }

  // Verify analysis exists and belongs to the project
  const { data: analysis, error: analysisError } = await supabase
    .from('analyses')
    .select('id, project_id')
    .eq('id', finalAnalysisId)
    .eq('project_id', projectId)
    .single()

  if (analysisError || !analysis) {
    notFound()
  }

  return <AnalysisPageClient projectId={projectId} analysisId={finalAnalysisId!} />
}

export async function generateMetadata({ params }: AnalysisPageProps) {
  const { id: projectId } = await params
  const supabase = createServerSupabaseClient()

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

  return {
    title: project?.name
      ? `AI Analysis - ${project.name} - PMCopilot`
      : 'AI Analysis - PMCopilot',
    description: 'Comprehensive AI-powered analysis of user feedback and product insights',
  }
}
