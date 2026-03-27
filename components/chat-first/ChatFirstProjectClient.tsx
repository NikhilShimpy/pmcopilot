/**
 * ChatFirstProjectClient - Project page with chat-first interface
 * Replaces the old ChatGPTLayout with the new centered chat UI
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
  Sparkles,
  Loader2,
  Settings,
  Share2,
  Download,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { ChatFirstLayout, DragDropProvider } from '@/components/chat-first'
import { AnalysisProgressIndicator } from '@/components/AnalysisProgressIndicator'
import { useChatFirstStore } from '@/stores/chatFirstStore'
import type { Project } from '@/types'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'

interface ChatFirstProjectClientProps {
  project: Project
  user: {
    id: string
    email?: string | null
  }
}

export default function ChatFirstProjectClient({
  project: initialProject,
  user,
}: ChatFirstProjectClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [project, setProject] = useState(initialProject)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ComprehensiveStrategyResult | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(true)
  const [showSettings, setShowSettings] = useState(false)

  // Store actions
  const setStoreProject = useChatFirstStore((state) => state.setProject)
  const addMessage = useChatFirstStore((state) => state.addMessage)

  // Track if we've already set the project
  const hasSetProjectRef = useRef(false)

  // Fetch latest analysis on mount
  useEffect(() => {
    let mounted = true

    async function fetchLatestAnalysis() {
      try {
        const response = await fetch(`/api/analyze?project_id=${project.id}&limit=1`)
        const data = await response.json()

        if (!mounted) return

        const analyses = data.analyses || data.data?.analyses || (Array.isArray(data.data) ? data.data : null)

        if (data.success && analyses && analyses.length > 0) {
          const latestAnalysis = analyses[0]
          setAnalysisResult(latestAnalysis.result)

          // Add analysis summary to chat
          if (latestAnalysis.result) {
            addAnalysisSummaryToChat(latestAnalysis.result)
          }
        }
      } catch (error) {
        console.error('Failed to fetch analysis:', error)
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
    }

    fetchLatestAnalysis()

    return () => {
      mounted = false
    }
  }, [project.id, project.name, setStoreProject])

  // Add analysis summary to chat
  const addAnalysisSummaryToChat = useCallback((result: ComprehensiveStrategyResult) => {
    const problemCount = result.problem_analysis?.length || 0
    const featureCount = result.feature_system?.length || 0
    const taskCount = result.development_tasks?.length || 0

    addMessage({
      role: 'assistant',
      content: `# Analysis Complete

I've analyzed your project and identified:

- **${problemCount} Problems** - Key pain points and issues
- **${featureCount} Features** - Recommended solutions
- **${taskCount} Tasks** - Development breakdown

Use the sidebar to navigate different sections, or ask me specific questions like:
- "Show me the top 3 problems"
- "What's the estimated cost?"
- "Create a detailed PRD"
- "Explain the system architecture"

You can also drag any item from the analysis into the chat for detailed explanations.`,
    })
  }, [addMessage])

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

  const handleAnalyzeFeedback = async () => {
    if (!feedbackInput.trim() || feedbackInput.length < 10) {
      showToast('Please provide a more detailed description', 'warning')
      return
    }

    setAnalyzing(true)

    // Add user message to chat
    addMessage({
      role: 'user',
      content: feedbackInput,
    })

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          feedback: feedbackInput,
          detail_level: 'comprehensive',
          context: {
            project_name: project.name,
            project_context: project.description,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      setAnalysisResult(data.data || data)
      setFeedbackInput('')

      // Add summary to chat
      if (data.data) {
        addAnalysisSummaryToChat(data.data)
      }

      showToast('Analysis completed!', 'success')
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to analyze',
        'error'
      )
      addMessage({
        role: 'assistant',
        content: `**Error:** ${error instanceof Error ? error.message : 'Analysis failed'}

Please try again or check your input.`,
        error: error instanceof Error ? error.message : 'Analysis failed',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  // Loading state
  if (loadingAnalysis) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl shadow-blue-500/30"
          >
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Loading workspace...
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <DragDropProvider>
      <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        {/* Analysis Progress */}
        <AnalysisProgressIndicator isAnalyzing={analyzing} onComplete={() => {}} />

        {/* Chat-First Layout with custom header */}
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
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <button
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
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

        {/* Quick Analysis Panel (shows when no analysis) */}
        <AnimatePresence>
          {!analysisResult && !analyzing && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40
                w-full max-w-2xl px-4"
            >
              <div className="p-4 rounded-2xl
                bg-gradient-to-r from-blue-500/10 to-purple-500/10
                backdrop-blur-xl
                border border-blue-200/50 dark:border-blue-800/50
                shadow-xl"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/20">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Describe your product to get started
                    </p>
                    <textarea
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="What are you building? Who are your users? What problems are you solving?"
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl
                        bg-white/80 dark:bg-gray-900/80
                        border border-gray-200 dark:border-gray-700
                        text-gray-900 dark:text-white
                        placeholder-gray-400 dark:placeholder-gray-500
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        text-sm resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${
                        feedbackInput.length < 10 ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {feedbackInput.length}/10,000
                      </span>
                      <button
                        onClick={handleAnalyzeFeedback}
                        disabled={feedbackInput.length < 10}
                        className="px-4 py-2 rounded-xl
                          bg-gradient-to-r from-blue-500 to-purple-600
                          text-white text-sm font-medium
                          shadow-lg shadow-blue-500/30
                          hover:shadow-blue-500/50
                          disabled:opacity-50 disabled:cursor-not-allowed
                          transition-all"
                      >
                        Generate Analysis
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analyzing Overlay */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center
                bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="p-8 rounded-2xl bg-white dark:bg-gray-800 shadow-2xl text-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl
                    bg-gradient-to-br from-blue-500 to-purple-600
                    flex items-center justify-center"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Analyzing your product...
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  This may take 30-60 seconds
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DragDropProvider>
  )
}
