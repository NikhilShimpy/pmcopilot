'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'
import AppShell from '@/components/dashboard/AppShell'
import { useToast } from '@/components/ui/Toast'
import { ContentSkeletonGrid, TableSkeleton } from '@/components/ui/SkeletonLoaders'
import { formatDateTimeStable, formatMonthKeyStable } from '@/lib/dateFormat'

interface ReportsClientProps {
  user: {
    id: string
    email?: string | null
  }
  projects: Array<{ id: string; name: string }>
}

interface ReportsSummary {
  totals: {
    projects: number
    feedback: number
    analyses: number
    analyzed_projects: number
  }
  status_distribution: Record<string, number>
  priority_distribution: Record<string, number>
  source_distribution: Record<string, number>
  monthly_activity: Array<{
    month: string
    feedback: number
    analyses: number
  }>
  project_summaries: Array<{
    project_id: string
    project_name: string
    feedback_count: number
    analysis_count: number
    completion_score: number
    last_activity_at: string
  }>
}

const PIE_COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#f97316', '#ef4444']

type CompletionFilter = 'all' | 'healthy' | 'at-risk'

export default function ReportsClient({ user, projects }: ReportsClientProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState('')
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('all')

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (projectId) {
        params.set('project_id', projectId)
      }
      const response = await fetch(`/api/reports/summary?${params.toString()}`)
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to load reports')
      }
      setSummary(payload.data)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load reports', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const statusChartData = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.status_distribution).map(([name, value]) => ({
      name,
      value,
    }))
  }, [summary])

  const priorityChartData = useMemo(() => {
    if (!summary) return []
    return Object.entries(summary.priority_distribution).map(([name, value]) => ({
      name,
      value,
    }))
  }, [summary])

  const monthlyActivityData = useMemo(() => {
    if (!summary) return []
    return summary.monthly_activity.map((item) => ({
      ...item,
      month_label: formatMonthKeyStable(item.month),
    }))
  }, [summary])

  const sortedProjectSummaries = useMemo(() => {
    if (!summary) {
      return []
    }

    const normalized = searchQuery.trim().toLowerCase()
    let rows = summary.project_summaries.filter((project) => {
      if (!normalized) {
        return true
      }
      return project.project_name.toLowerCase().includes(normalized)
    })

    if (completionFilter === 'healthy') {
      rows = rows.filter((project) => project.completion_score >= 70)
    } else if (completionFilter === 'at-risk') {
      rows = rows.filter((project) => project.completion_score < 70)
    }

    return rows.sort(
      (a, b) =>
        Number(new Date(b.last_activity_at || 0)) - Number(new Date(a.last_activity_at || 0))
    )
  }, [completionFilter, searchQuery, summary])

  const reportInsights = useMemo(() => {
    if (!summary) {
      return {
        avgCompletion: 0,
        completeProjects: 0,
        atRiskProjects: 0,
        activeProjects: 0,
      }
    }

    const total = summary.project_summaries.length || 1
    const avgCompletion = Math.round(
      summary.project_summaries.reduce((acc, item) => acc + (item.completion_score || 0), 0) / total
    )
    const completeProjects = summary.project_summaries.filter((item) => item.completion_score >= 100).length
    const atRiskProjects = summary.project_summaries.filter((item) => item.completion_score < 50).length
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const activeProjects = summary.project_summaries.filter(
      (item) => Number(new Date(item.last_activity_at || 0)) >= thirtyDaysAgo
    ).length

    return {
      avgCompletion,
      completeProjects,
      atRiskProjects,
      activeProjects,
    }
  }, [summary])

  const completionHealthData = useMemo(() => {
    if (!summary) return []
    const complete = summary.project_summaries.filter((item) => item.completion_score >= 100).length
    const progressing = summary.project_summaries.filter(
      (item) => item.completion_score >= 50 && item.completion_score < 100
    ).length
    const atRisk = summary.project_summaries.filter((item) => item.completion_score < 50).length
    return [
      { name: 'Complete', value: complete, color: '#22c55e' },
      { name: 'Progressing', value: progressing, color: '#3b82f6' },
      { name: 'At Risk', value: atRisk, color: '#f97316' },
    ]
  }, [summary])

  const topOpportunities = useMemo(() => {
    return sortedProjectSummaries
      .filter((item) => item.completion_score < 100)
      .sort((a, b) => a.completion_score - b.completion_score)
      .slice(0, 4)
  }, [sortedProjectSummaries])

  const exportCsv = () => {
    if (!summary || summary.project_summaries.length === 0) {
      showToast('No report data available for export', 'warning')
      return
    }

    const header = [
      'Project Name',
      'Feedback Count',
      'Analysis Count',
      'Completion Score',
      'Last Activity',
    ]
    const rows = summary.project_summaries.map((row) => [
      row.project_name,
      row.feedback_count,
      row.analysis_count,
      `${row.completion_score}%`,
      formatDateTimeStable(row.last_activity_at),
    ])

    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = projectId ? 'project-report.csv' : 'workspace-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      user={user}
      title="Reports"
      description="Actionable project intelligence from real feedback and analysis coverage."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSummary}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-700 bg-gray-900 text-gray-100 text-sm hover:border-gray-500 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Scope & Filters</h2>
              <p className="text-sm text-gray-400">
                Narrow this report by project and completion health to focus decisions faster.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search project..."
                  className="pl-9 pr-3 py-2.5 rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() =>
                  setCompletionFilter((prev) =>
                    prev === 'all' ? 'healthy' : prev === 'healthy' ? 'at-risk' : 'all'
                  )
                }
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-950 text-gray-200 hover:border-gray-600"
              >
                <Filter className="w-4 h-4" />
                {completionFilter === 'all'
                  ? 'All Health'
                  : completionFilter === 'healthy'
                  ? 'Healthy'
                  : 'At Risk'}
              </button>
            </div>
          </div>
        </motion.section>

        {loading ? (
          <div className="space-y-5">
            <ContentSkeletonGrid count={3} className="md:grid-cols-3 xl:grid-cols-3" />
            <ContentSkeletonGrid count={3} className="md:grid-cols-2 xl:grid-cols-3" />
            <TableSkeleton rows={8} />
          </div>
        ) : !summary ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-12 text-center text-gray-400">
            Could not load report data.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Average Completion"
                value={`${reportInsights.avgCompletion}%`}
                tone="blue"
                hint="Across visible projects"
                icon={TrendingUp}
              />
              <MetricCard
                label="Complete Projects"
                value={reportInsights.completeProjects}
                tone="emerald"
                hint="Reached 100% section coverage"
                icon={CheckCircle2}
              />
              <MetricCard
                label="At Risk Projects"
                value={reportInsights.atRiskProjects}
                tone="amber"
                hint="Below 50% completion"
                icon={AlertTriangle}
              />
              <MetricCard
                label="Active (30 Days)"
                value={reportInsights.activeProjects}
                tone="violet"
                hint="Recent report activity"
                icon={Sparkles}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <ChartCard title="Feedback Status Mix">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" outerRadius={90}>
                      {statusChartData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Priority Distribution">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={priorityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#38bdf8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Monthly Activity">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={monthlyActivityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month_label" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="feedback" stroke="#22c55e" strokeWidth={2.5} />
                    <Line type="monotone" dataKey="analyses" stroke="#3b82f6" strokeWidth={2.5} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5"
              >
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Completion Health</h3>
                <div className="space-y-3">
                  {completionHealthData.map((bucket) => (
                    <div key={bucket.name}>
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>{bucket.name}</span>
                        <span>{bucket.value} projects</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(
                              8,
                              (bucket.value / Math.max(1, summary.project_summaries.length)) * 100
                            )}%`,
                            background: bucket.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5"
              >
                <h3 className="text-sm font-semibold text-gray-200 mb-4">Top Opportunities</h3>
                <div className="space-y-3">
                  {topOpportunities.length === 0 ? (
                    <p className="text-sm text-gray-500">No incomplete projects in this filter scope.</p>
                  ) : (
                    topOpportunities.map((project) => (
                      <div
                        key={project.project_id}
                        className="rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-100">{project.project_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Last activity: {formatDateTimeStable(project.last_activity_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-amber-300 font-semibold">{project.completion_score}%</p>
                          <p className="text-[11px] text-gray-500">completion</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.section>
            </div>

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-white">Project Performance Table</h3>
                <span className="text-xs text-gray-500">
                  {sortedProjectSummaries.length} project
                  {sortedProjectSummaries.length === 1 ? '' : 's'} in current scope
                </span>
              </div>
              {sortedProjectSummaries.length === 0 ? (
                <p className="text-sm text-gray-500">No project data matches current filters.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-gray-800">
                        <th className="py-2 pr-4 font-medium">Project</th>
                        <th className="py-2 pr-4 font-medium">Feedback</th>
                        <th className="py-2 pr-4 font-medium">Analyses</th>
                        <th className="py-2 pr-4 font-medium">Completion</th>
                        <th className="py-2 pr-0 font-medium">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedProjectSummaries.map((project) => (
                        <tr key={project.project_id} className="border-b border-gray-900 last:border-none">
                          <td className="py-3 pr-4 text-gray-200">
                            <div className="flex items-center gap-2">
                              <span>{project.project_name}</span>
                              {project.completion_score >= 100 && (
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-300">
                                  complete
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-gray-300">{project.feedback_count}</td>
                          <td className="py-3 pr-4 text-gray-300">{project.analysis_count}</td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2 rounded-full bg-gray-800 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                                  style={{ width: `${project.completion_score}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400">{project.completion_score}%</span>
                            </div>
                          </td>
                          <td className="py-3 pr-0 text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              {formatDateTimeStable(project.last_activity_at)}
                              <ArrowUpRight className="w-3 h-3 text-gray-600" />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  hint: string
  icon: ElementType
  tone: 'blue' | 'emerald' | 'amber' | 'violet'
}) {
  const toneClass: Record<typeof tone, string> = {
    blue: 'from-blue-500 to-cyan-500',
    emerald: 'from-emerald-500 to-teal-500',
    amber: 'from-amber-500 to-orange-500',
    violet: 'from-violet-500 to-purple-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <div
          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${toneClass[tone]} text-white flex items-center justify-center`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-2">{hint}</p>
    </motion.div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5"
    >
      <h3 className="text-sm font-semibold text-gray-200 mb-3">{title}</h3>
      {children}
    </motion.section>
  )
}
