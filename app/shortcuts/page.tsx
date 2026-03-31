import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ShortcutsClient from './ShortcutsClient'

export default async function ShortcutsPage() {
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
    <ShortcutsClient
      user={{ id: user.id, email: user.email }}
      shortcutHintsEnabled={settings?.shortcut_hints_enabled ?? true}
    />
  )
}
