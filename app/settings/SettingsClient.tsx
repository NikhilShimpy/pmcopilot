'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Save } from 'lucide-react'
import AppShell from '@/components/dashboard/AppShell'
import { useToast } from '@/components/ui/Toast'
import type { UserSettings } from '@/types'

interface SettingsClientProps {
  user: {
    id: string
    email?: string | null
  }
  initialSettings: UserSettings | null
}

const DEFAULT_SETTINGS: UserSettings = {
  id: '',
  theme: 'system',
  shortcut_hints_enabled: true,
  notifications: {
    email: true,
    product: true,
    feedback: true,
    analysis: true,
  },
  dashboard_preferences: {
    compact_mode: false,
    default_project_view: 'grid',
    show_welcome_banner: true,
  },
  ai_preferences: {
    default_output_length: 'long',
    include_cost_estimation: true,
    include_timeline: true,
  },
  created_at: new Date().toISOString(),
}

export default function SettingsClient({ user, initialSettings }: SettingsClientProps) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<UserSettings>(
    initialSettings
      ? {
          ...DEFAULT_SETTINGS,
          ...initialSettings,
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...(initialSettings.notifications || {}),
          },
          dashboard_preferences: {
            ...DEFAULT_SETTINGS.dashboard_preferences,
            ...(initialSettings.dashboard_preferences || {}),
          },
          ai_preferences: {
            ...DEFAULT_SETTINGS.ai_preferences,
            ...(initialSettings.ai_preferences || {}),
          },
        }
      : DEFAULT_SETTINGS
  )

  const applyTheme = useCallback((theme: UserSettings['theme']) => {
    if (typeof window === 'undefined') return

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark)

    document.documentElement.classList.toggle('dark', shouldUseDark)
    window.localStorage.setItem('pmcopilot-theme', theme)
  }, [])

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme, applyTheme])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (settings.theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')

    mediaQuery.addEventListener('change', onChange)
    return () => mediaQuery.removeEventListener('change', onChange)
  }, [settings.theme, applyTheme])

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to save settings')
      }
      setSettings((prev) => ({
        ...prev,
        ...payload.data,
      }))
      showToast('Settings saved', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      user={user}
      title="Settings"
      description="Configure account behavior, notifications, and AI defaults."
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
      <div className="max-w-5xl mx-auto space-y-6">
        <SettingsSection title="Appearance" description="Choose your preferred theme.">
          <div className="grid gap-3 md:grid-cols-3">
            {(['system', 'light', 'dark'] as const).map((themeOption) => (
              <button
                key={themeOption}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    theme: themeOption,
                  }))
                }
                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  settings.theme === themeOption
                    ? 'border-blue-500 bg-blue-500/20 text-blue-100'
                    : 'border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500'
                }`}
              >
                {themeOption[0].toUpperCase() + themeOption.slice(1)}
              </button>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          title="Notifications"
          description="Control which updates are sent to your account."
        >
          <Toggle
            label="Email summaries"
            checked={settings.notifications.email}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  email: value,
                },
              }))
            }
          />
          <Toggle
            label="Product updates"
            checked={settings.notifications.product}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  product: value,
                },
              }))
            }
          />
          <Toggle
            label="Feedback hub activity"
            checked={settings.notifications.feedback}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  feedback: value,
                },
              }))
            }
          />
          <Toggle
            label="Analysis completion alerts"
            checked={settings.notifications.analysis}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                notifications: {
                  ...prev.notifications,
                  analysis: value,
                },
              }))
            }
          />
        </SettingsSection>

        <SettingsSection
          title="Dashboard Preferences"
          description="Tune how your workspace opens and behaves."
        >
          <Toggle
            label="Compact mode"
            checked={settings.dashboard_preferences.compact_mode}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                dashboard_preferences: {
                  ...prev.dashboard_preferences,
                  compact_mode: value,
                },
              }))
            }
          />
          <Toggle
            label="Show welcome banner"
            checked={settings.dashboard_preferences.show_welcome_banner}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                dashboard_preferences: {
                  ...prev.dashboard_preferences,
                  show_welcome_banner: value,
                },
              }))
            }
          />
          <label className="space-y-2 block">
            <span className="text-sm text-gray-300">Default project view</span>
            <select
              value={settings.dashboard_preferences.default_project_view}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  dashboard_preferences: {
                    ...prev.dashboard_preferences,
                    default_project_view: event.target.value as 'grid' | 'list',
                  },
                }))
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </select>
          </label>
        </SettingsSection>

        <SettingsSection
          title="AI Output Defaults"
          description="Set preferred defaults for section generation."
        >
          <label className="space-y-2 block">
            <span className="text-sm text-gray-300">Default output length</span>
            <select
              value={settings.ai_preferences.default_output_length}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  ai_preferences: {
                    ...prev.ai_preferences,
                    default_output_length: event.target.value as
                      | 'short'
                      | 'medium'
                      | 'long'
                      | 'extra-long',
                  },
                }))
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
              <option value="extra-long">Extra Long</option>
            </select>
          </label>
          <Toggle
            label="Include cost estimation by default"
            checked={settings.ai_preferences.include_cost_estimation}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                ai_preferences: {
                  ...prev.ai_preferences,
                  include_cost_estimation: value,
                },
              }))
            }
          />
          <Toggle
            label="Include timeline planning by default"
            checked={settings.ai_preferences.include_timeline}
            onChange={(value) =>
              setSettings((prev) => ({
                ...prev,
                ai_preferences: {
                  ...prev.ai_preferences,
                  include_timeline: value,
                },
              }))
            }
          />
        </SettingsSection>
      </div>
    </AppShell>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 flex items-center justify-between hover:border-gray-500 transition-colors"
    >
      <span className="text-sm text-gray-200">{label}</span>
      <span
        className={`w-11 h-6 rounded-full relative transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-700'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
