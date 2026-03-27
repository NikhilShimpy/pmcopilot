import { redirect, notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ProjectInputClient from './ProjectInputClient'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params
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

  // Check if there's an existing analysis - if so, redirect to output page
  try {
    const { data: existingAnalysis } = await supabase
      .from('analyses')
      .select('id')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // If analysis exists, show the output page
    if (existingAnalysis) {
      redirect(`/project/${id}/output`)
    }
  } catch {
    // No analysis exists, continue to input page
  }

  // Show the input page for new projects
  return <ProjectInputClient project={project} user={user} />
}

export async function generateMetadata({ params }: ProjectPageProps) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: project?.name ? `${project.name} - PMCopilot` : 'Project - PMCopilot',
  }
}
