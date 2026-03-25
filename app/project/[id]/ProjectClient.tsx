'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { ChatGPTLayout } from '@/components/workspace/ChatGPTLayout'
import { AnalysisProgressIndicator } from '@/components/AnalysisProgressIndicator'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { Project } from '@/types'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'

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
  const [editDescription, setEditDescription] = useState(project.description || '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [feedbackInput, setFeedbackInput] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ComprehensiveStrategyResult | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(true)

  // Store selectors
  const setStoreProject = useWorkspaceStore((state) => state.setProject)

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

  // Memoize analysisResult to prevent unnecessary re-renders
  const stableAnalysisResult = useMemo(() => analysisResult, [
    analysisResult?.metadata?.analysis_id,
    analysisResult?.problem_analysis?.length,
    analysisResult?.feature_system?.length,
  ])

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
          description: editDescription.trim() || null,
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
    if (!confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
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

      showToast('Project deleted successfully', 'success')
      router.push('/dashboard')
    } catch {
      showToast('Failed to delete project', 'error')
      setDeleting(false)
    }
  }

  const handleAnalyzeFeedback = async () => {
    if (!feedbackInput.trim()) {
      showToast('Please enter some feedback to analyze', 'warning')
      return
    }

    if (feedbackInput.trim().length < 10) {
      showToast('Feedback must be at least 10 characters long. Please provide a more detailed description.', 'warning')
      return
    }

    if (feedbackInput.trim().length > 10000) {
      showToast('Feedback is too long. Please keep it under 10,000 characters.', 'warning')
      return
    }

    setAnalyzing(true)

    try {
      console.log('[Analysis] Starting analysis for project:', project.id)

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      console.log('[Analysis] Response status:', response.status)

      const data = await response.json()
      console.log('[Analysis] Response data:', {
        success: data.success,
        hasData: !!data.data,
        metadata: data.data?.metadata,
        problemsCount: data.data?.problem_analysis?.length,
        featuresCount: data.data?.feature_system?.length,
        tasksCount: data.data?.development_tasks?.length,
        provider: data.data?.provider || data.provider,
      })

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      // Store the result
      setAnalysisResult(data.data || data)
      setFeedbackInput('')
      showToast('Analysis completed successfully!', 'success')

      console.log('[Analysis] Analysis result set successfully')
    } catch (error) {
      console.error('[Analysis] Error:', error)
      showToast(
        error instanceof Error ? error.message : 'Failed to analyze feedback',
        'error'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  // Show loading state
  if (loadingAnalysis) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-slate-600 font-medium">Loading workspace...</p>
        </div>
      </div>
    )
  }

  // WORKSPACE VIEW ONLY - No Classic View
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Real-time Analysis Progress Indicator */}
      <AnalysisProgressIndicator
        isAnalyzing={analyzing}
        onComplete={() => {}}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">Edit</span>
              </button>

              {/* Delete Button */}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="text-sm hidden sm:inline">{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>

          {/* Project Title */}
          {isEditing ? (
            <div className="mt-4 flex items-center gap-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Project name"
              />
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditName(project.name)
                  setEditDescription(project.description || '')
                }}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-slate-500 mt-1">{project.description}</p>
              )}
            </div>
          )}

          {/* Analysis Trigger (if no analysis yet) */}
          {!analysisResult && !analyzing && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900 mb-2">
                    Start by analyzing your product idea
                  </p>
                  <div className="relative">
                    <textarea
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="Describe your product idea, target users, and key problems you're solving... (minimum 10 characters)"
                      rows={3}
                      className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm mb-2"
                    />
                    <div className="flex justify-between items-center mb-2">
                      <div className={`text-xs ${
                        feedbackInput.length < 10 ? 'text-red-500' :
                        feedbackInput.length > 10000 ? 'text-red-500' : 'text-slate-500'
                      }`}>
                        {feedbackInput.length}/10,000 characters
                        {feedbackInput.length < 10 && ` (${10 - feedbackInput.length} more needed)`}
                      </div>
                      <div className="text-xs text-slate-400">
                        {feedbackInput.length < 10 ? '⚠️ Too short' :
                         feedbackInput.length > 10000 ? '⚠️ Too long' : '✓ Ready to analyze'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleAnalyzeFeedback}
                    disabled={!feedbackInput.trim() || feedbackInput.length < 10 || feedbackInput.length > 10000}
                    className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Analyze Idea
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {analyzing && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Analyzing your product...</p>
                  <p className="text-xs text-blue-600 mt-1">Using AI to generate comprehensive strategy (30-60 seconds)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Workspace Content - ChatGPT Style Layout */}
      {stableAnalysisResult ? (
        <ChatGPTLayout
          project={project}
          analysisResult={stableAnalysisResult}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Welcome to Your Workspace
            </h2>
            <p className="text-slate-600 mb-6">
              Enter your product idea above to generate a comprehensive AI-powered strategy with:
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-500">
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <strong className="text-slate-700">10+ Problems</strong>
                <p className="text-xs mt-1">Identified pain points</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <strong className="text-slate-700">15+ Features</strong>
                <p className="text-xs mt-1">Solution recommendations</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <strong className="text-slate-700">25+ Tasks</strong>
                <p className="text-xs mt-1">Development breakdown</p>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg">
                <strong className="text-slate-700">AI Chat</strong>
                <p className="text-xs mt-1">Ask follow-up questions</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
