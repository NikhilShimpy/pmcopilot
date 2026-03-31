'use client'

import { useMemo, useState, type ElementType } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import AppShell from '@/components/dashboard/AppShell'
import { useToast } from '@/components/ui/Toast'
import { formatDateTimeStable } from '@/lib/dateFormat'

type SortMode = 'latest' | 'oldest' | 'az' | 'za'
type StatusFilter = 'all' | 'complete' | 'in-progress' | 'incomplete'

export type AnalysisHistoryEntry = {
  analysis_id: string
  session_id: string | null
  source: 'session' | 'legacy'
  title: string
  prompt: string
  prompt_preview: string
  completion_percentage: number
  generated_sections: string[]
  created_at: string
  updated_at: string
  detail_level?: string
  provider?: string
  model?: string | null
}

interface ProjectHistoryClientProps {
  user: {
    id: string
    email?: string | null
  }
  project: {
    id: string
    name: string
    description?: string | null
  }
  requiredSections: string[]
  initialEntries: AnalysisHistoryEntry[]
}

function getStatus(entry: AnalysisHistoryEntry): StatusFilter {
  if ((entry.completion_percentage || 0) >= 100) {
    return 'complete'
  }
  if ((entry.generated_sections?.length || 0) > 0) {
    return 'in-progress'
  }
  return 'incomplete'
}

export default function ProjectHistoryClient({
  user,
  project,
  requiredSections,
  initialEntries,
}: ProjectHistoryClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [entries, setEntries] = useState<AnalysisHistoryEntry[]>(initialEntries)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('latest')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const filteredEntries = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    let rows = entries.filter((entry) => {
      const matchSearch =
        !normalized ||
        (entry.title || '').toLowerCase().includes(normalized) ||
        (entry.prompt || '').toLowerCase().includes(normalized)
      const matchStatus = statusFilter === 'all' || getStatus(entry) === statusFilter
      return matchSearch && matchStatus
    })

    rows = [...rows].sort((a, b) => {
      if (sortMode === 'oldest') {
        return Number(new Date(a.created_at)) - Number(new Date(b.created_at))
      }
      if (sortMode === 'az') {
        return (a.title || '').localeCompare(b.title || '')
      }
      if (sortMode === 'za') {
        return (b.title || '').localeCompare(a.title || '')
      }
      return Number(new Date(b.created_at)) - Number(new Date(a.created_at))
    })

    return rows
  }, [entries, searchQuery, sortMode, statusFilter])

  const summary = useMemo(() => {
    const complete = entries.filter((entry) => getStatus(entry) === 'complete').length
    const inProgress = entries.filter((entry) => getStatus(entry) === 'in-progress').length
    const avgCompletion =
      entries.length > 0
        ? Math.round(
            entries.reduce((acc, item) => acc + (item.completion_percentage || 0), 0) /
              entries.length
          )
        : 0

    return {
      total: entries.length,
      complete,
      inProgress,
      avgCompletion,
    }
  }, [entries])

  const handleOpen = (entry: AnalysisHistoryEntry) => {
    setOpeningId(entry.analysis_id)
    router.push(`/project/${project.id}/output?analysis=${entry.analysis_id}`)
  }

  const handleDelete = async (entry: AnalysisHistoryEntry) => {
    const confirmed = window.confirm(
      `Delete "${entry.title}"? This will permanently remove the saved analysis session.`
    )
    if (!confirmed) {
      return
    }

    setDeletingId(entry.analysis_id)
    try {
      const response = await fetch(`/api/analyze/${entry.analysis_id}`, {
        method: 'DELETE',
      })
      const payload = await response.json().catch(() => ({}))

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || payload.message || 'Failed to delete analysis session')
      }

      setEntries((prev) => prev.filter((item) => item.analysis_id !== entry.analysis_id))
      showToast('Analysis deleted successfully', 'success')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete analysis session'
      showToast(message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRegenerate = async (entry: AnalysisHistoryEntry) => {
    if (!entry.prompt?.trim()) {
      showToast('Cannot regenerate because prompt text is unavailable for this session.', 'error')
      return
    }

    setRegeneratingId(entry.analysis_id)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: entry.prompt,
          project_id: project.id,
          detail_level: entry.detail_level || 'long',
          reuse_cached: false,
          context: {
            project_name: project.name,
            project_context: project.description || '',
          },
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || payload.success === false) {
        throw new Error(payload.error || payload.message || 'Failed to regenerate analysis')
      }

      const analysisData = payload.data || payload
      const nextAnalysisId =
        analysisData?.metadata?.session_id ||
        analysisData?.saved_id ||
        analysisData?.analysis_id ||
        null

      if (!nextAnalysisId) {
        throw new Error('Regeneration completed but no analysis ID was returned')
      }

      showToast('Analysis regenerated successfully', 'success')
      router.push(`/project/${project.id}/output?analysis=${nextAnalysisId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate analysis'
      showToast(message, 'error')
    } finally {
      setRegeneratingId(null)
    }
  }

  return (
    <AppShell
      user={user}
      title={`${project.name} History`}
      description="Manage previous analysis sessions, continue incomplete work, and regenerate safely."
      actions={
        <Link
          href={`/project/${project.id}?new=1`}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Start New Analysis
        </Link>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total Sessions" value={summary.total} icon={FolderKanban} />
          <SummaryCard label="Completed" value={summary.complete} icon={CheckCircle2} />
          <SummaryCard label="In Progress" value={summary.inProgress} icon={Clock3} />
          <SummaryCard label="Avg Completion" value={`${summary.avgCompletion}%`} icon={Sparkles} />
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by analysis title or prompt..."
                className="w-full rounded-xl border border-gray-700 bg-gray-950 py-2.5 pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value as SortMode)}
                className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="latest">Sort: Latest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="az">Sort: A to Z</option>
                <option value="za">Sort: Z to A</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Status: All</option>
                <option value="complete">Complete</option>
                <option value="in-progress">In Progress</option>
                <option value="incomplete">Incomplete</option>
              </select>
            </div>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-10 text-center">
            <h2 className="text-xl font-semibold text-white">No analysis sessions found</h2>
            <p className="mt-2 text-sm text-gray-400">
              Adjust search and filters, or create a new analysis for this project.
            </p>
            <Link
              href={`/project/${project.id}?new=1`}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Start New Analysis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredEntries.map((entry, index) => {
              const status = getStatus(entry)
              const generatedCount = Array.isArray(entry.generated_sections)
                ? entry.generated_sections.filter((section) => requiredSections.includes(section)).length
                : 0
              const missingCount = Math.max(0, requiredSections.length - generatedCount)

              return (
                <motion.article
                  key={entry.analysis_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-white">
                        {entry.title || 'Untitled analysis session'}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span>{formatDateTimeStable(entry.created_at)}</span>
                      </div>
                    </div>
                    <StatusBadge status={status} completion={entry.completion_percentage} />
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm text-gray-400">
                    {entry.prompt_preview || 'No prompt preview available for this session.'}
                  </p>

                  <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/70 p-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Sections generated</span>
                      <span>
                        {generatedCount}/{requiredSections.length}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{
                          width: `${Math.min(100, Math.max(0, entry.completion_percentage || 0))}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                      <span className="rounded-full border border-gray-700 px-2 py-0.5">
                        {missingCount === 0 ? 'No missing sections' : `${missingCount} sections missing`}
                      </span>
                      {entry.detail_level ? (
                        <span className="rounded-full border border-gray-700 px-2 py-0.5">
                          Detail: {entry.detail_level}
                        </span>
                      ) : null}
                      {entry.provider ? (
                        <span className="rounded-full border border-gray-700 px-2 py-0.5">
                          Provider: {entry.provider}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpen(entry)}
                      disabled={openingId === entry.analysis_id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {openingId === entry.analysis_id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleOpen(entry)}
                      disabled={openingId === entry.analysis_id}
                      className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm font-medium text-gray-200 hover:border-gray-600 disabled:opacity-60"
                    >
                      {status === 'complete' ? 'Review' : 'Continue'}
                    </button>

                    <button
                      onClick={() => handleRegenerate(entry)}
                      disabled={regeneratingId === entry.analysis_id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-900/20 px-3 py-2.5 text-sm font-medium text-emerald-300 hover:bg-emerald-900/30 disabled:opacity-60"
                    >
                      {regeneratingId === entry.analysis_id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Regenerate
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDelete(entry)}
                      disabled={deletingId === entry.analysis_id}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-800 bg-red-900/10 px-3 py-2.5 text-sm font-medium text-red-300 hover:bg-red-900/20 disabled:opacity-60"
                    >
                      {deletingId === entry.analysis_id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </motion.article>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number | string
  icon: ElementType
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <div className="rounded-lg bg-blue-500/20 p-2 text-blue-300">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  )
}

function StatusBadge({
  status,
  completion,
}: {
  status: StatusFilter
  completion: number
}) {
  if (status === 'complete') {
    return (
      <span className="rounded-full border border-emerald-700 bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-300">
        Complete {completion}%
      </span>
    )
  }

  if (status === 'in-progress') {
    return (
      <span className="rounded-full border border-amber-700 bg-amber-900/25 px-2.5 py-1 text-xs font-semibold text-amber-200">
        In Progress {completion}%
      </span>
    )
  }

  return (
    <span className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-200">
      Incomplete {completion}%
    </span>
  )
}
