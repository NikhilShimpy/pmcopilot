'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Search,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import AppShell from '@/components/dashboard/AppShell'
import { useToast } from '@/components/ui/Toast'
import type { Feedback, FeedbackPriority, FeedbackStatus } from '@/types'
import { ContentSkeletonGrid } from '@/components/ui/SkeletonLoaders'
import { formatDateTimeStable } from '@/lib/dateFormat'

interface FeedbackHubClientProps {
  user: {
    id: string
    email?: string | null
  }
  projects: Array<{ id: string; name: string }>
  initialFeedback: Array<Feedback & { projects?: { name?: string } | { name?: string }[] | null }>
}

const STATUS_OPTIONS: FeedbackStatus[] = ['new', 'reviewed', 'planned', 'done']
const PRIORITY_OPTIONS: FeedbackPriority[] = ['low', 'medium', 'high', 'critical']

export default function FeedbackHubClient({
  user,
  projects,
  initialFeedback,
}: FeedbackHubClientProps) {
  const { showToast } = useToast()
  const [feedbackItems, setFeedbackItems] = useState(initialFeedback)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [filters, setFilters] = useState({
    project_id: '',
    status: '',
    priority: '',
    search: '',
  })
  const [form, setForm] = useState({
    project_id: projects[0]?.id || '',
    title: '',
    content: '',
    category: 'other',
    priority: 'medium',
  })

  const fetchFeedback = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.project_id) params.set('project_id', filters.project_id)
      if (filters.status) params.set('status', filters.status)
      if (filters.priority) params.set('priority', filters.priority)
      if (filters.search) params.set('search', filters.search)
      params.set('limit', '100')

      const response = await fetch(`/api/feedback?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load feedback')
      }

      setFeedbackItems(payload.data.feedback || [])
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load feedback', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedback()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.project_id, filters.status, filters.priority])

  const filteredBySearch = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    if (!query) return feedbackItems
    return feedbackItems.filter((item) => {
      return (
        item.content.toLowerCase().includes(query) ||
        (item.title || '').toLowerCase().includes(query)
      )
    })
  }, [feedbackItems, filters.search])

  const statusCounts = useMemo(() => {
    return filteredBySearch.reduce<Record<string, number>>((acc, item) => {
      const key = item.status || 'new'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  }, [filteredBySearch])

  const submitFeedback = async () => {
    if (!form.project_id || !form.content.trim()) {
      showToast('Project and feedback content are required', 'error')
      return
    }
    if (form.content.trim().length < 10) {
      showToast('Feedback content must be at least 10 characters', 'error')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          content: form.content.trim(),
          title: form.title.trim() || undefined,
        }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to submit feedback')
      }

      setForm((prev) => ({
        ...prev,
        title: '',
        content: '',
      }))
      showToast('Feedback submitted', 'success')
      await fetchFeedback()
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to submit feedback', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    const previous = feedbackItems
    setFeedbackItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)))
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update feedback status')
      }
      showToast('Feedback status updated', 'success')
    } catch (error) {
      setFeedbackItems(previous)
      showToast(
        error instanceof Error ? error.message : 'Failed to update feedback status',
        'error'
      )
    }
  }

  const deleteFeedback = async (id: string) => {
    const previous = feedbackItems
    setFeedbackItems((prev) => prev.filter((item) => item.id !== id))
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: 'DELETE',
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to delete feedback')
      }
      showToast('Feedback deleted', 'success')
    } catch (error) {
      setFeedbackItems(previous)
      showToast(error instanceof Error ? error.message : 'Failed to delete feedback', 'error')
    }
  }

  const getProjectName = (item: (typeof feedbackItems)[number]) => {
    const projectsValue = item.projects
    if (Array.isArray(projectsValue)) {
      return projectsValue[0]?.name || 'Unknown project'
    }
    if (projectsValue && typeof projectsValue === 'object') {
      return projectsValue.name || 'Unknown project'
    }
    return projects.find((project) => project.id === item.project_id)?.name || 'Unknown project'
  }

  return (
    <AppShell
      user={user}
      title="Feedback Hub"
      description="Capture, prioritize, and track customer feedback with project-level ownership."
      actions={
        <button
          onClick={fetchFeedback}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 bg-gray-900 text-gray-100 text-sm hover:border-gray-500 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      }
    >
      <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-[380px_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4 h-fit"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-200 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Submit Feedback</h2>
              <p className="text-sm text-gray-400">Create actionable items linked to projects.</p>
            </div>
          </div>

          <select
            value={form.project_id}
            onChange={(event) => setForm((prev) => ({ ...prev, project_id: event.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Title (optional)"
            maxLength={140}
            className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              className="px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="improvement">Improvement</option>
              <option value="ux">UX</option>
              <option value="performance">Performance</option>
              <option value="other">Other</option>
            </select>
            <select
              value={form.priority}
              onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
              className="px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={form.content}
            onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
            rows={6}
            placeholder="Describe user problem, context, and expected behavior..."
            className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />

          <button
            onClick={submitFeedback}
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
                <CheckCircle2 className="w-4 h-4" />
                Create Feedback Item
              </>
            )}
          </button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4"
        >
          <div className="grid gap-3 md:grid-cols-4">
            <FilterSelect
              value={filters.project_id}
              onChange={(value) => setFilters((prev) => ({ ...prev, project_id: value }))}
              options={[
                { value: '', label: 'All projects' },
                ...projects.map((project) => ({ value: project.id, label: project.name })),
              ]}
            />
            <FilterSelect
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              options={[{ value: '', label: 'All status' }, ...STATUS_OPTIONS.map((status) => ({ value: status, label: status }))]}
            />
            <FilterSelect
              value={filters.priority}
              onChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))}
              options={[
                { value: '', label: 'All priority' },
                ...PRIORITY_OPTIONS.map((priority) => ({ value: priority, label: priority })),
              ]}
            />
            <label className="relative">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => (
              <span
                key={status}
                className="px-3 py-1 rounded-full text-xs border border-gray-700 bg-gray-950 text-gray-300"
              >
                {status}: {statusCounts[status] || 0}
              </span>
            ))}
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-2">
                <ContentSkeletonGrid count={4} className="md:grid-cols-2 xl:grid-cols-2" />
              </div>
            ) : filteredBySearch.length === 0 ? (
              <div className="py-10 text-center text-gray-500">
                No feedback found for selected filters.
              </div>
            ) : (
              filteredBySearch.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.title || 'Untitled feedback'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {getProjectName(item)} - {formatDateTimeStable(item.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={item.status || 'new'}
                        onChange={(event) =>
                          updateStatus(item.id, event.target.value as FeedbackStatus)
                        }
                        className="px-2 py-1 rounded-lg border border-gray-700 bg-gray-900 text-xs text-gray-200"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteFeedback(item.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10"
                        title="Delete feedback"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{item.content}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full border border-gray-700 bg-gray-900 text-gray-300">
                      {item.category || 'other'}
                    </span>
                    <span className="px-2 py-1 rounded-full border border-gray-700 bg-gray-900 text-gray-300">
                      priority: {item.priority || 'medium'}
                    </span>
                    <span className="px-2 py-1 rounded-full border border-gray-700 bg-gray-900 text-gray-300">
                      source: {item.source || 'manual'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </div>
    </AppShell>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full px-3 py-3 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map((option) => (
        <option key={option.value || option.label} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

