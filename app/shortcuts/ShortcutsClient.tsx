'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Command, Keyboard, Loader2, Search, X } from 'lucide-react'
import AppShell from '@/components/dashboard/AppShell'
import { useToast } from '@/components/ui/Toast'

interface ShortcutsClientProps {
  user: {
    id: string
    email?: string | null
  }
  shortcutHintsEnabled: boolean
}

type Shortcut = {
  id: string
  keys: string
  description: string
  category: 'Navigation' | 'Editing' | 'Productivity'
  action?: () => void
}

export default function ShortcutsClient({
  user,
  shortcutHintsEnabled: initialShortcutHintsEnabled,
}: ShortcutsClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [query, setQuery] = useState('')
  const [showPalette, setShowPalette] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shortcutHintsEnabled, setShortcutHintsEnabled] = useState(initialShortcutHintsEnabled)
  const [chordKey, setChordKey] = useState<string | null>(null)

  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        id: 'new-project',
        keys: 'Ctrl/Cmd + K',
        description: 'Open quick search and command panel',
        category: 'Productivity',
        action: () => setShowPalette(true),
      },
      {
        id: 'go-dashboard',
        keys: 'G then D',
        description: 'Go to Dashboard',
        category: 'Navigation',
        action: () => router.push('/dashboard'),
      },
      {
        id: 'go-analysis',
        keys: 'G then A',
        description: 'Open AI Analysis selector',
        category: 'Navigation',
        action: () => router.push('/analysis'),
      },
      {
        id: 'go-feedback',
        keys: 'G then F',
        description: 'Open Feedback Hub',
        category: 'Navigation',
        action: () => router.push('/feedback'),
      },
      {
        id: 'go-reports',
        keys: 'G then R',
        description: 'Open Reports',
        category: 'Navigation',
        action: () => router.push('/reports'),
      },
      {
        id: 'escape-close',
        keys: 'Esc',
        description: 'Close menus and modals',
        category: 'Editing',
        action: () => setShowPalette(false),
      },
      {
        id: 'question-help',
        keys: '?',
        description: 'Open support page',
        category: 'Navigation',
        action: () => router.push('/support'),
      },
    ],
    [router]
  )

  const filteredShortcuts = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return shortcuts
    return shortcuts.filter((shortcut) => {
      return (
        shortcut.keys.toLowerCase().includes(normalized) ||
        shortcut.description.toLowerCase().includes(normalized) ||
        shortcut.category.toLowerCase().includes(normalized)
      )
    })
  }, [query, shortcuts])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const activeTag = (event.target as HTMLElement)?.tagName?.toLowerCase()
      const typing =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        (event.target as HTMLElement)?.isContentEditable

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setShowPalette(true)
        return
      }

      if (event.key === 'Escape') {
        setShowPalette(false)
        setChordKey(null)
        return
      }

      if (typing) return

      if (event.key.toLowerCase() === 'g') {
        setChordKey('g')
        return
      }

      if (event.key === '?') {
        event.preventDefault()
        router.push('/support')
        return
      }

      if (chordKey === 'g') {
        const nextKey = event.key.toLowerCase()
        if (nextKey === 'd') router.push('/dashboard')
        if (nextKey === 'a') router.push('/analysis')
        if (nextKey === 'f') router.push('/feedback')
        if (nextKey === 'r') router.push('/reports')
        setChordKey(null)
      }
    }

    const resetChord = setInterval(() => {
      setChordKey((current) => (current ? null : current))
    }, 1400)

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearInterval(resetChord)
    }
  }, [chordKey, router])

  const updateShortcutHints = async (enabled: boolean) => {
    setSaving(true)
    setShortcutHintsEnabled(enabled)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortcut_hints_enabled: enabled,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to save shortcut preferences')
      }
      showToast(enabled ? 'Shortcut hints enabled' : 'Shortcut hints hidden', 'success')
    } catch (error) {
      setShortcutHintsEnabled(!enabled)
      showToast(
        error instanceof Error ? error.message : 'Failed to save shortcut preferences',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell
      user={user}
      title="Shortcuts"
      description="Keyboard-first navigation for faster workflow management."
    >
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Shortcut Hints</h2>
              <p className="text-sm text-gray-400 mt-1">
                Show contextual shortcut hints throughout dashboard pages.
              </p>
            </div>
            <button
              onClick={() => updateShortcutHints(!shortcutHintsEnabled)}
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                shortcutHintsEnabled
                  ? 'border-blue-500 bg-blue-500/20 text-blue-100'
                  : 'border-gray-700 bg-gray-950 text-gray-300'
              }`}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : shortcutHintsEnabled ? (
                'Hints Enabled'
              ) : (
                'Hints Hidden'
              )}
            </button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-200 flex items-center justify-center">
              <Search className="w-5 h-5" />
            </div>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search shortcuts..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            {filteredShortcuts.map((shortcut) => (
              <button
                key={shortcut.id}
                onClick={() => {
                  if (shortcut.action) {
                    shortcut.action()
                  }
                }}
                className="w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between hover:border-gray-600 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-white">{shortcut.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{shortcut.category}</p>
                </div>
                <kbd className="px-3 py-1 rounded-lg border border-gray-700 text-gray-300 text-xs font-mono">
                  {shortcut.keys}
                </kbd>
              </button>
            ))}
          </div>
        </motion.section>
      </div>

      <AnimatePresence>
        {showPalette && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowPalette(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
            >
              <div className="rounded-2xl border border-gray-700 bg-gray-950 shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <p className="text-sm text-gray-300 flex items-center gap-2">
                    <Command className="w-4 h-4" />
                    Command palette
                  </p>
                  <button
                    onClick={() => setShowPalette(false)}
                    className="p-1 rounded-md hover:bg-gray-800 text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2">
                  {shortcuts.slice(0, 6).map((shortcut) => (
                    <button
                      key={shortcut.id}
                      onClick={() => {
                        shortcut.action?.()
                        setShowPalette(false)
                        showToast(`Executed: ${shortcut.description}`, 'info')
                      }}
                      className="w-full px-3 py-2 rounded-lg hover:bg-gray-900 flex items-center justify-between"
                    >
                      <span className="text-sm text-gray-200">{shortcut.description}</span>
                      <span className="text-xs text-gray-500">{shortcut.keys}</span>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-500 flex items-center gap-2">
                  <Keyboard className="w-3.5 h-3.5" />
                  Press <kbd className="px-1 rounded border border-gray-700">Esc</kbd> to close
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
