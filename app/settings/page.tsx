import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <SettingsClient
      user={{ id: user.id, email: user.email }}
      initialSettings={settings}
    />
  )
}
