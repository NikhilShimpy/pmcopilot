import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import FeedbackHubClient from './FeedbackHubClient'

export default async function FeedbackHubPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: projects }, { data: feedbackRows }] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('feedbacks')
      .select('*, projects(name)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return (
    <FeedbackHubClient
      user={{ id: user.id, email: user.email }}
      projects={projects || []}
      initialFeedback={feedbackRows || []}
    />
  )
}
