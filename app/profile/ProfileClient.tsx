'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mail, Save, UserCircle2 } from 'lucide-react'
import AppShell from '@/components/dashboard/AppShell'
import { useToast } from '@/components/ui/Toast'
import type { ProfileRecord } from '@/types'

interface ProfileClientProps {
  user: {
    id: string
    email?: string | null
  }
  initialProfile: ProfileRecord | null
}

export default function ProfileClient({ user, initialProfile }: ProfileClientProps) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: initialProfile?.full_name || '',
    job_title: initialProfile?.job_title || '',
    timezone: initialProfile?.timezone || 'UTC',
    avatar_url: initialProfile?.avatar_url || '',
    bio: initialProfile?.bio || '',
  })

  const initials = useMemo(() => {
    if (form.full_name.trim()) {
      return form.full_name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    }
    return user.email?.slice(0, 2).toUpperCase() || 'U'
  }, [form.full_name, user.email])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to save profile')
      }

      showToast('Profile updated', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      user={user}
      title="Profile"
      description="Manage your account identity and personal preferences."
      actions={
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save'}
        </button>
      }
    >
      <div className="max-w-4xl mx-auto grid gap-6 lg:grid-cols-[320px_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6"
        >
          <div className="flex flex-col items-center text-center">
            {form.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.avatar_url}
                alt="Profile avatar"
                className="w-24 h-24 rounded-2xl object-cover border border-gray-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-3xl font-bold">
                {initials}
              </div>
            )}
            <h2 className="mt-4 text-xl font-semibold text-white">
              {form.full_name || user.email?.split('@')[0] || 'User'}
            </h2>
            <p className="text-sm text-gray-400">{form.job_title || 'Product Builder'}</p>
          </div>

          <div className="mt-6 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Account Email</p>
            <p className="text-sm text-gray-200 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              {user.email}
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Full name</span>
              <input
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your name"
                maxLength={120}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Job title</span>
              <input
                value={form.job_title}
                onChange={(event) => setForm((prev) => ({ ...prev, job_title: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Product Manager"
                maxLength={120}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Timezone</span>
              <input
                value={form.timezone}
                onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Asia/Kolkata"
                maxLength={80}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-gray-300">Avatar URL</span>
              <input
                value={form.avatar_url}
                onChange={(event) => setForm((prev) => ({ ...prev, avatar_url: event.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
                maxLength={400}
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm text-gray-300">Bio</span>
            <textarea
              value={form.bio}
              onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
              rows={6}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="What are you building with PMCopilot?"
            />
            <span className="text-xs text-gray-500">{form.bio.length}/500</span>
          </label>

          <div className="rounded-xl border border-blue-900/40 bg-blue-500/10 p-4 text-sm text-blue-100 flex items-start gap-2">
            <UserCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Email is managed by Supabase authentication and remains read-only here. Update name, title, timezone, avatar, and bio from this page.
            </span>
          </div>
        </motion.section>
      </div>
    </AppShell>
  )
}
