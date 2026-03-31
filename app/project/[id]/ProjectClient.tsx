/**
 * ProjectClient - Chat-First Project Workspace
 *
 * FIXED VERSION:
 * - Uses new ChatFirstLayout instead of old ChatGPTLayout
 * - Connects analyze flow to chat messages
 * - Uses chatFirstStore for state management
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Loader2,
  Share2,
  Download,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { ChatFirstLayout, DragDropProvider } from '@/components/chat-first'
import { useChatFirstStore } from '@/stores/chatFirstStore'
import type { Project } from '@/types'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'
import { DashboardSkeletonGrid } from '@/components/ui/SkeletonLoaders'

interface ProjectClientProps {
  project: Project
  user: {
    id: string
    email?: string | null
  }
}

export default function ProjectClient({ project: initialProject, user }: ProjectClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [project, setProject] = useState(initialProject)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(true)

  // Chat-First Store - CRITICAL: This connects to the new UI
  const {
    setProject: setStoreProject,
    addMessage,
  } = useChatFirstStore()

  // Track if we've already set the project
  const hasSetProjectRef = useRef(false)

  // Helper: Convert analysis result to chat message
  // Using 'any' type for flexible access since AI response structure can vary
  const convertAnalysisToChat = useCallback((result: ComprehensiveStrategyResult) => {
    const problems = (result.problem_analysis || []) as any[]
    const features = (result.feature_system || []) as any[]
    const tasks = (result.development_tasks || []) as any[]
    const costEstimation = result.cost_estimation as any
    const timeEstimation = result.time_estimation as any
    const prd = result.prd

    let content = `# Analysis Complete

I've analyzed your product and generated a comprehensive strategy.

## Executive Summary
${result.executive_dashboard?.idea_expansion || 'Your product idea has been analyzed and broken down into actionable components.'}

---

## Problems Identified (${problems.length})

`

    // Add top 5 problems
    problems.slice(0, 5).forEach((problem: any, i: number) => {
      const title = problem.title || problem.name || 'Problem'
      const severity = problem.severity_score ?? problem.severity ?? 'N/A'
      const frequency = problem.frequency_score ?? problem.frequency ?? 'N/A'
      const description = problem.deep_description || problem.description || 'No description'

      content += `### ${i + 1}. ${title}
- **Severity:** ${severity}/10
- **Frequency:** ${frequency}
- **Description:** ${description}
${problem.root_cause ? `- **Root Cause:** ${problem.root_cause}` : ''}

`
    })

    if (problems.length > 5) {
      content += `*...and ${problems.length - 5} more problems identified*\n\n`
    }

    content += `---

## Recommended Features (${features.length})

`

    // Add top 5 features
    features.slice(0, 5).forEach((feature: any, i: number) => {
      const name = feature.name || feature.title || 'Feature'
      const whyNeeded = feature.why_needed || feature.detailed_description || ''

      content += `### ${i + 1}. ${name}
- **Category:** ${feature.category || 'General'}
- **Complexity:** ${feature.complexity || 'Medium'}
- **Business Value:** ${feature.business_value || 'High'}
${whyNeeded ? `- **Why Needed:** ${whyNeeded}` : ''}

`
    })

    if (features.length > 5) {
      content += `*...and ${features.length - 5} more features suggested*\n\n`
    }

    // Add cost estimation if available
    if (costEstimation) {
      content += `---

## Cost Estimation (INR)

| Category | Cost |
|----------|------|
`
      // Use the budget versions from the actual type
      if (costEstimation.low_budget_version) {
        content += `| Low Budget | ₹${(costEstimation.low_budget_version.annual_cost / 100000).toFixed(1)}L/year |\n`
      }
      if (costEstimation.startup_version) {
        content += `| Startup | ₹${(costEstimation.startup_version.annual_cost / 100000).toFixed(1)}L/year |\n`
      }
      if (costEstimation.scale_version) {
        content += `| Scale | ₹${(costEstimation.scale_version.annual_cost / 100000).toFixed(1)}L/year |\n`
      }

      // Fallback display
      if (!costEstimation.low_budget_version && !costEstimation.startup_version) {
        content += `| Development | ₹${((costEstimation.development_cost || 2500000) / 100000).toFixed(1)}L |\n`
        content += `| Cloud Infrastructure | ₹${((costEstimation.cloud_cost || 180000) / 100000).toFixed(1)}L/year |\n`
        content += `| AI APIs | ₹${((costEstimation.ai_api_cost || 120000) / 100000).toFixed(1)}L/year |\n`
      }

      const totalCost = costEstimation.total_first_year || costEstimation.development_cost || 0
      content += `
**Total First Year:** ₹${(totalCost / 100000).toFixed(1)}L

`
    }

    // Add timeline if available
    if (timeEstimation) {
      content += `---

## Timeline

**Total Duration:** ${timeEstimation.total_weeks || 12} weeks

| Milestone | Target Week | Deliverables |
|-----------|-------------|--------------|
`
      if (timeEstimation.milestones && timeEstimation.milestones.length > 0) {
        timeEstimation.milestones.slice(0, 5).forEach((milestone: any) => {
          const deliverables = milestone.deliverables?.slice(0, 2).join(', ') || 'TBD'
          content += `| ${milestone.name} | Week ${milestone.target_week} | ${deliverables} |\n`
        })
      } else {
        content += `| MVP | Week 8 | Core features |\n`
        content += `| Beta | Week 12 | Full product |\n`
      }
      content += '\n'
    }

    // Add development tasks summary
    content += `---

## Development Tasks (${tasks.length})

| Priority | Task | Estimate |
|----------|------|----------|
`
    tasks.slice(0, 10).forEach((task: any) => {
      const title = task.title || task.name || 'Task'
      const estimate = task.estimated_time || task.estimate || 'TBD'
      content += `| ${task.priority || 'Medium'} | ${title} | ${estimate} |\n`
    })

    if (tasks.length > 10) {
      content += `\n*...and ${tasks.length - 10} more tasks*\n`
    }

    content += `

---

## What's Next?

You can:
- **Navigate sections** using the sidebar to see detailed breakdowns
- **Ask me questions** like "Show me more problems" or "Explain the cost breakdown"
- **Drag items** from sidebar to chat for detailed analysis
- **Adjust response depth** using the length selector

*Click any section in the sidebar to filter the view!*`

    return content
  }, [])

  // Fetch latest analysis on mount
  useEffect(() => {
    let mounted = true

    async function fetchLatestAnalysis() {
      console.log('[ProjectClient] Fetching latest analysis for project:', project.id)

      try {
        const response = await fetch(`/api/analyze?project_id=${project.id}&limit=1`)
        const data = await response.json()

        if (!mounted) return

        console.log('[ProjectClient] Fetch response:', { success: data.success, hasData: !!data.data })

        const analyses = data.analyses || data.data?.analyses || (Array.isArray(data.data) ? data.data : null)

        if (data.success && analyses && analyses.length > 0) {
          const latestAnalysis = analyses[0]
          console.log('[ProjectClient] Found existing analysis:', latestAnalysis.id)

          // CRITICAL: Add analysis result to chat messages
          if (latestAnalysis.result) {
            const chatContent = convertAnalysisToChat(latestAnalysis.result)
            addMessage({
              role: 'assistant',
              content: chatContent,
            })
          }
        } else {
          console.log('[ProjectClient] No existing analysis found')
        }
      } catch (error) {
        console.error('[ProjectClient] Failed to fetch analysis:', error)
      } finally {
        if (mounted) {
          setLoadingAnalysis(false)
        }
      }
    }

    // Only set project in store once
    if (!hasSetProjectRef.current) {
      hasSetProjectRef.current = true
      setStoreProject(project.id, project.name)
      console.log('[ProjectClient] Set project in store:', project.name)
    }

    fetchLatestAnalysis()

    return () => {
      mounted = false
    }
  }, [project.id, project.name, setStoreProject, addMessage, convertAnalysisToChat])

  const handleSave = async () => {
    if (!editName.trim()) {
      showToast('Project name cannot be empty', 'error')
      return
    }

    setSaving(true)
    try {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: editName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      setProject(data)
      setStoreProject(data.id, data.name)
      setIsEditing(false)
      showToast('Project updated successfully', 'success')
    } catch {
      showToast('Failed to update project', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) {
      return
    }

    setDeleting(true)
    try {
      const supabase = createClientSupabaseClient()
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
        .eq('user_id', user.id)

      if (error) throw error

      showToast('Project deleted', 'success')
      router.push('/dashboard')
    } catch {
      showToast('Failed to delete project', 'error')
      setDeleting(false)
    }
  }

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/project/${project.id}`
        : `/project/${project.id}`

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        showToast('Project link copied to clipboard', 'success')
        return
      }

      showToast('Clipboard is unavailable in this browser', 'warning')
    } catch {
      showToast('Failed to copy project link', 'error')
    }
  }

  const handleExport = () => {
    try {
      const payload = {
        id: project.id,
        name: project.name,
        description: project.description || null,
        created_at: project.created_at,
        updated_at: project.updated_at || null,
      }

      const json = JSON.stringify(payload, null, 2)
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${project.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'project'}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      showToast('Project exported as JSON', 'success')
    } catch {
      showToast('Failed to export project', 'error')
    }
  }

  // Loading state
  if (loadingAnalysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900 p-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto space-y-5">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
            <div className="h-6 w-56 rounded bg-gray-800 animate-pulse" />
            <div className="h-4 w-80 rounded bg-gray-800/80 animate-pulse mt-2" />
          </div>
          <DashboardSkeletonGrid count={6} />
        </motion.div>
      </div>
    )
  }

  // MAIN RENDER: Chat-First Layout
  return (
    <DragDropProvider>
      <ChatFirstLayout
        projectId={project.id}
        projectName={project.name}
      >
        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg
              text-gray-600 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Dashboard</span>
          </Link>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Edit project"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleShare}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleExport}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded-lg text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
              hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            title="Delete project"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </ChatFirstLayout>

      {/* Edit Project Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setIsEditing(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Edit Project
              </h2>

              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Project name"
                className="w-full px-4 py-3 rounded-xl
                  bg-gray-50 dark:bg-gray-900
                  border border-gray-200 dark:border-gray-700
                  text-gray-900 dark:text-white
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  mb-4"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(project.name)
                  }}
                  className="px-4 py-2 rounded-xl
                    text-gray-600 dark:text-gray-400
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl
                    bg-blue-500 text-white
                    hover:bg-blue-600
                    disabled:opacity-50
                    transition-colors"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DragDropProvider>
  )
}
