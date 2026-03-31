'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Loader2,
  Search,
  Sparkles,
} from 'lucide-react'
import AppShell from '@/components/dashboard/AppShell'
import { formatDateStable, formatDateTimeStable } from '@/lib/dateFormat'

interface AnalysisSelectorClientProps {
  user: {
    id: string
    email?: string | null
  }
  projects: Array<{
    id: string
    name: string
    description?: string | null
    created_at: string
    updated_at?: string | null
  }>
  analyses: Array<{
    id: string
    session_id?: string
    project_id: string
    created_at: string
    title?: string
    prompt?: string
    completion_percentage?: number
    generated_sections?: string[]
  }>
  selectedProjectId?: string
}

export default function AnalysisSelectorClient({
  user,
  projects,
  analyses,
  selectedProjectId,
}: AnalysisSelectorClientProps) {
  const router = useRouter()
  const [redirectingProjectId, setRedirectingProjectId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [onlyWithHistory, setOnlyWithHistory] = useState(false)

  const latestAnalysisByProject = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string
        created_at: string
        title?: string
        completion_percentage: number
        generated_sections: string[]
        prompt?: string
      }
    >()
    for (const analysis of analyses) {
      const existing = map.get(analysis.project_id)
      if (!existing || Number(new Date(analysis.created_at)) > Number(new Date(existing.created_at))) {
        map.set(analysis.project_id, {
          id: analysis.id,
          created_at: analysis.created_at,
          title: analysis.title,
          completion_percentage: analysis.completion_percentage || 0,
          generated_sections: Array.isArray(analysis.generated_sections)
            ? analysis.generated_sections
            : [],
          prompt: analysis.prompt,
        })
      }
    }
    return map
  }, [analyses])

  const historyCountByProject = useMemo(() => {
    const map = new Map<string, number>()
    for (const analysis of analyses) {
      map.set(analysis.project_id, (map.get(analysis.project_id) || 0) + 1)
    }
    return map
  }, [analyses])

  const filteredProjects = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    return projects.filter((project) => {
      const hasHistory = (historyCountByProject.get(project.id) || 0) > 0
      if (onlyWithHistory && !hasHistory) {
        return false
      }
      if (!normalized) {
        return true
      }
      return (
        project.name.toLowerCase().includes(normalized) ||
        (project.description || '').toLowerCase().includes(normalized)
      )
    })
  }, [historyCountByProject, onlyWithHistory, projects, searchQuery])

  const withHistoryCount = useMemo(
    () => projects.filter((project) => (historyCountByProject.get(project.id) || 0) > 0).length,
    [historyCountByProject, projects]
  )

  const openProjectAnalysis = (projectId: string) => {
    setRedirectingProjectId(projectId)
    router.push(`/project/${projectId}/history`)
  }

  useEffect(() => {
    if (selectedProjectId && projects.some((project) => project.id === selectedProjectId)) {
      openProjectAnalysis(selectedProjectId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId])

  return (
    <AppShell
      user={user}
      title="AI Analysis"
      description="Choose a project, then manage complete analysis history for that project."
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <InsightCard
            label="Projects"
            value={projects.length}
            caption="Total available projects"
            icon={FolderKanban}
          />
          <InsightCard
            label="With Analysis History"
            value={withHistoryCount}
            caption="Projects with saved analyses"
            icon={Sparkles}
          />
          <InsightCard
            label="Analysis Sessions"
            value={analyses.length}
            caption="Total generated sessions"
            icon={Clock3}
          />
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="relative w-full md:max-w-md">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-xl border border-gray-700 bg-gray-950 text-white pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </label>
            <button
              onClick={() => setOnlyWithHistory((prev) => !prev)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                onlyWithHistory
                  ? 'border-blue-500/60 bg-blue-500/20 text-blue-200'
                  : 'border-gray-700 bg-gray-950 text-gray-300 hover:border-gray-600'
              }`}
            >
              {onlyWithHistory ? 'Showing: History only' : 'Show only projects with history'}
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-10 text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">Create a project first</h2>
            <p className="text-gray-400 mb-6">
              AI Analysis requires project context. Start by creating a project from dashboard.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/60 p-10 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">No matching projects</h2>
            <p className="text-gray-400">Try a different search term or disable history-only filter.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project, index) => {
              const latestAnalysis = latestAnalysisByProject.get(project.id)
              const historyCount = historyCountByProject.get(project.id) || 0
              const isRedirecting = redirectingProjectId === project.id

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {project.description || 'No description available'}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-200 flex items-center justify-center shrink-0">
                      <Brain className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-xs text-gray-500">
                    <p>Updated: {formatDateStable(project.updated_at || project.created_at)}</p>
                    <p>History sessions: {historyCount}</p>
                    {latestAnalysis ? (
                      <>
                        <p>Latest run: {formatDateTimeStable(latestAnalysis.created_at)}</p>
                        <p className="truncate text-gray-400">
                          {latestAnalysis.title || 'Untitled analysis session'}
                        </p>
                        <div className="pt-1 flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-800 text-[11px]">
                            {latestAnalysis.completion_percentage}% complete
                          </span>
                          {latestAnalysis.completion_percentage >= 100 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-300">
                              <Clock3 className="w-3 h-3" />
                              In progress
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p>No analysis generated yet</p>
                    )}
                  </div>

                  <button
                    onClick={() => openProjectAnalysis(project.id)}
                    disabled={isRedirecting}
                    className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    {isRedirecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Opening...
                      </>
                    ) : (
                      <>
                        {latestAnalysis ? 'Open History' : 'Start Analysis'}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function InsightCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string
  value: number
  caption: string
  icon: ElementType
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-2">{caption}</p>
    </motion.div>
  )
}
