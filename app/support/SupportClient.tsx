'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { HelpCircle, Loader2, MessageSquarePlus, Send } from 'lucide-react'
import AppShell from '@/components/dashboard/AppShell'
import { useToast } from '@/components/ui/Toast'
import type { SupportTicket } from '@/types'

interface SupportClientProps {
  user: {
    id: string
    email?: string | null
  }
  projects: Array<{ id: string; name: string }>
  initialTickets: SupportTicket[]
}

const FAQ_ITEMS = [
  {
    q: 'How does section-on-demand generation work?',
    a: 'PMCopilot generates overview first, then each section only when you open it. This keeps responses token-safe and focused.',
  },
  {
    q: 'How do I run AI analysis for a project?',
    a: 'Open AI Analysis from sidebar, select a project, and PMCopilot routes you to project-specific analysis automatically.',
  },
  {
    q: 'Can I update profile and settings later?',
    a: 'Yes. Profile, Settings, and Shortcuts are fully editable and saved to your Supabase-backed account preferences.',
  },
  {
    q: 'Where can I track product feedback and reports?',
    a: 'Use Feedback Hub to submit/manage feedback items and Reports for analytics generated from projects, feedback, and analyses.',
  },
]

export default function SupportClient({ user, projects, initialTickets }: SupportClientProps) {
  const { showToast } = useToast()
  const [tickets, setTickets] = useState(initialTickets)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium',
    project_id: '',
  })

  const submitTicket = async () => {
    if (!form.subject.trim() || form.message.trim().length < 10) {
      showToast('Add subject and at least 10 characters in the message', 'error')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_id: form.project_id || null,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to submit support ticket')
      }

      setTickets((prev) => [payload.data, ...prev])
      setForm({
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium',
        project_id: '',
      })
      showToast('Support request submitted', 'success')
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to submit support ticket',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell
      user={user}
      title="Help & Support"
      description="Find answers quickly and contact support with project context."
    >
      <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-200 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">FAQ</h2>
              <p className="text-sm text-gray-400">Common questions about product workflows.</p>
            </div>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.q}
                className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 group"
              >
                <summary className="cursor-pointer text-sm font-medium text-gray-100 list-none flex items-center justify-between">
                  {item.q}
                  <span className="text-gray-500 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          <div className="rounded-xl border border-indigo-900/40 bg-indigo-500/10 p-4 text-sm text-indigo-100">
            Need direct help? Submit a support ticket on the right. Ticket history stays linked to your account.
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-200 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Contact Support</h2>
              <p className="text-sm text-gray-400">Share issue details and project context.</p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              placeholder="Subject"
              maxLength={160}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="technical">Technical</option>
                <option value="feature">Feature Request</option>
                <option value="billing">Billing</option>
              </select>
              <select
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                className="px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <select
              value={form.project_id}
              onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No specific project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <textarea
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              rows={5}
              placeholder="Describe the issue, expected behavior, and impact..."
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />

            <button
              onClick={submitTicket}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
          </div>

          <div className="pt-2 border-t border-gray-800">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">Recent Tickets</h3>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {tickets.length === 0 ? (
                <p className="text-sm text-gray-500">No tickets submitted yet.</p>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2"
                  >
                    <p className="text-sm font-medium text-white truncate">{ticket.subject}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {ticket.status.replace('_', ' ')} - {ticket.priority}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.section>
      </div>
    </AppShell>
  )
}

