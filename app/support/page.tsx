import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import SupportClient from './SupportClient'

export default async function SupportPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: tickets }, { data: projects }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <SupportClient
      user={{ id: user.id, email: user.email }}
      projects={projects || []}
      initialTickets={tickets || []}
    />
  )
}
