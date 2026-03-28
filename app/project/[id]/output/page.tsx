import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/utils/helpers'
import ProjectOutputClient from './ProjectOutputClient'

interface OutputPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
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

  // Fetch project with user_id check for security
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !project) {
    notFound()
  }

  // Get input and length from search params
  // Safe decoding: searchParams are already decoded by Next.js, no manual decode needed
  let input = ''
  try {
    // searchParams are automatically decoded by Next.js
    input = (searchParamsResolved.input as string) || ''
  } catch (error) {
    console.error('Error decoding input:', error)
    // Fallback to empty string if decoding fails
  }

  const length = (searchParamsResolved.length as string) || 'long'
  const shouldGenerate = searchParamsResolved.generate === 'true'
  const requestedAnalysisId = (searchParamsResolved.analysis as string) || ''

  let initialAnalysis: any = null
  let initialAnalysisId: string | null = null

  if (!shouldGenerate) {
    if (requestedAnalysisId && isValidUUID(requestedAnalysisId)) {
      const { data: selectedAnalysis } = await supabase
        .from('analyses')
        .select('id, result')
        .eq('id', requestedAnalysisId)
        .eq('project_id', id)
        .single()

      if (selectedAnalysis) {
        initialAnalysis = selectedAnalysis.result
        initialAnalysisId = selectedAnalysis.id
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
        initialAnalysis = latestAnalysis.result
        initialAnalysisId = latestAnalysis.id
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
