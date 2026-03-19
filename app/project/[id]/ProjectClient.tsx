'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  Edit2,
  Trash2,
  MessageSquare,
  Sparkles,
  BarChart3,
  FileText,
  Plus,
  Upload,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { FeedbackPanel, IntegrationsPanel, AutoAnalysisNotification } from '@/components/feedback'
import { ComprehensiveStrategyView } from '@/components/strategy'
import { ChatPanel } from '@/components/chat/ChatPanel'
import { useRealtimeFeedback } from '@/hooks/useRealtimeFeedback'
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

  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Auto-analysis notification state
  const [autoAnalysisId, setAutoAnalysisId] = useState<string | null>(null)
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false)

  // Real-time feedback subscription
  const {
    feedbacks,
    isLoading: feedbacksLoading,
    error: feedbacksError,
    newCount,
    clearNewCount,
    refetch: refetchFeedbacks,
    stats: feedbackStats,
  } = useRealtimeFeedback({
    projectId: project.id,
    enabled: true,
    limit: 50,
    onNewFeedback: useCallback((feedback: { source?: string }) => {
      showToast(`New feedback received from ${feedback.source}`, 'info')
    }, [showToast]),
    onAnalysisTriggered: useCallback((analysisId: string) => {
      setAutoAnalysisId(analysisId)
      setIsAutoAnalyzing(false)
      showToast('Auto-analysis completed!', 'success')
    }, [showToast]),
  })

  // Handle analysis trigger notification dismiss
  const handleDismissAnalysisNotification = useCallback(() => {
    setAutoAnalysisId(null)
    setIsAutoAnalyzing(false)
  }, [])

  // Handle integration success - refresh feedbacks
  const handleIntegrationSuccess = useCallback(() => {
    refetchFeedbacks()
  }, [refetchFeedbacks])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

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

    setAnalyzing(true)
    setAnalysisResult(null)

    try {
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

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed')
      }

      setAnalysisResult(data.data)
      showToast('Analysis completed successfully!', 'success')
    } catch (error) {
      console.error('Analysis error:', error)
      showToast(
        error instanceof Error ? error.message : 'Failed to analyze feedback',
        'error'
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const generateReport = () => {
    if (!analysisResult) return

    const report = `
# Comprehensive Product Strategy Report
## ${project.name}
Generated on: ${new Date().toLocaleDateString()}

---

## 1. Executive Dashboard

**Innovation Score:** ${analysisResult.executive_dashboard?.innovation_score || 0}/10
**Complexity Level:** ${analysisResult.executive_dashboard?.complexity_level || 'N/A'}

### Key Insight
${analysisResult.executive_dashboard?.key_insight || 'N/A'}

### Idea Expansion
${analysisResult.executive_dashboard?.idea_expansion || 'N/A'}

### Market Opportunity
${analysisResult.executive_dashboard?.market_opportunity || 'N/A'}

### Recommended Strategy
${analysisResult.executive_dashboard?.recommended_strategy || 'N/A'}

---

## 2. Problem Analysis (${analysisResult.problem_analysis?.length || 0} Problems)

${analysisResult.problem_analysis?.map((p, i) => `
### ${i + 1}. ${p.title}
- **Severity:** ${p.severity_score}/10
- **Frequency:** ${p.frequency_score}/10
- **Technical Difficulty:** ${p.technical_difficulty || 'N/A'}

**Description:**
${p.deep_description || p.title}

**Root Cause:**
${p.root_cause || 'N/A'}

**Affected Users:**
${p.affected_users || 'N/A'}

**Current Solutions:**
${p.current_solutions || 'N/A'}

**Market Gaps:**
${p.gaps_in_market || 'N/A'}

**Evidence:**
${p.evidence_examples?.map(e => `- "${e}"`).join('\n') || 'N/A'}
`).join('\n') || 'No problems identified'}

---

## 3. Feature System (${analysisResult.feature_system?.length || 0} Features)

### Core Features
${analysisResult.feature_system?.filter(f => f.category === 'core').map((f) => `
#### ${f.name}
- **Complexity:** ${f.complexity}
- **Estimated Dev Time:** ${f.estimated_dev_time}
- **Linked Problems:** ${f.linked_problems?.join(', ') || 'N/A'}

${f.detailed_description}

**User Value:** ${f.user_value}
**Business Value:** ${f.business_value}

**Implementation Strategy:**
${f.implementation_strategy?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'N/A'}
`).join('\n') || 'No core features'}

### Advanced Features
${analysisResult.feature_system?.filter(f => f.category === 'advanced').map((f) => `
#### ${f.name}
- **Complexity:** ${f.complexity}
- **Estimated Dev Time:** ${f.estimated_dev_time}

${f.detailed_description}
`).join('\n') || 'No advanced features'}

### Futuristic Features
${analysisResult.feature_system?.filter(f => f.category === 'futuristic').map((f) => `
#### ${f.name}
- **Complexity:** ${f.complexity}
- **Estimated Dev Time:** ${f.estimated_dev_time}

${f.detailed_description}
`).join('\n') || 'No futuristic features'}

---

## 4. Gaps & Opportunities

### What Market Lacks
${analysisResult.gaps_opportunities?.market_lacks?.map(g => `- ${g}`).join('\n') || 'N/A'}

### Why Competitors Fail
${analysisResult.gaps_opportunities?.why_competitors_fail?.map(g => `- ${g}`).join('\n') || 'N/A'}

### Innovation Opportunities
${analysisResult.gaps_opportunities?.innovation_opportunities?.map(g => `- ${g}`).join('\n') || 'N/A'}

### Unfair Advantages
${analysisResult.gaps_opportunities?.unfair_advantages?.map(g => `- ${g}`).join('\n') || 'N/A'}

---

## 5. Product Requirements Document (PRD)

### Vision
${analysisResult.prd?.vision || 'N/A'}

### Mission
${analysisResult.prd?.mission || 'N/A'}

### Problem Statement
${analysisResult.prd?.problem_statement || 'N/A'}

### Target Users
${analysisResult.prd?.target_users?.map(u => `- ${u}`).join('\n') || 'N/A'}

### User Personas
${analysisResult.prd?.personas?.map(p => `
#### ${p.name}
${p.description}

**Goals:** ${p.goals?.join(', ') || 'N/A'}
**Pain Points:** ${p.pain_points?.join(', ') || 'N/A'}
`).join('\n') || 'No personas defined'}

### Short-term Goals
${analysisResult.prd?.goals_short_term?.map(g => `- ${g}`).join('\n') || 'N/A'}

### Long-term Goals
${analysisResult.prd?.goals_long_term?.map(g => `- ${g}`).join('\n') || 'N/A'}

### Non-Goals
${analysisResult.prd?.non_goals?.map(g => `- ${g}`).join('\n') || 'N/A'}

### User Stories (${analysisResult.prd?.user_stories?.length || 0})
${analysisResult.prd?.user_stories?.map(s => `- ${s.full_statement}`).join('\n') || 'No user stories'}

### Success Metrics
${analysisResult.prd?.success_metrics?.map(m => `- ${m}`).join('\n') || 'N/A'}

---

## 6. System Design

### Architecture Overview
${analysisResult.system_design?.architecture_overview || 'N/A'}

### Frontend Components
${analysisResult.system_design?.frontend_components?.map(c => `- **${c.name}:** ${c.description} (${c.technologies?.join(', ')})`).join('\n') || 'N/A'}

### Backend Services
${analysisResult.system_design?.backend_services?.map(s => `- **${s.name}:** ${s.description} (${s.technologies?.join(', ')})`).join('\n') || 'N/A'}

### Security Considerations
${analysisResult.system_design?.security_considerations?.map(s => `- ${s}`).join('\n') || 'N/A'}

### Scalability Strategy
${analysisResult.system_design?.scalability_strategy || 'N/A'}

---

## 7. Development Tasks (${analysisResult.development_tasks?.length || 0} Tasks)

${analysisResult.development_tasks?.map(t => `
### ${t.id}: ${t.title}
- **Type:** ${t.type}
- **Priority:** ${t.priority}
- **Estimated Time:** ${t.estimated_time}
- **Tech Stack:** ${t.tech_stack?.join(', ') || 'N/A'}

**Steps:**
${t.detailed_steps?.map((s, i) => `${i + 1}. ${s}`).join('\n') || 'N/A'}

**Expected Output:** ${t.expected_output || 'N/A'}
`).join('\n') || 'No tasks defined'}

---

## 8. Execution Roadmap

### Phase 1: MVP
**Timeline:** ${analysisResult.execution_roadmap?.phase_1_mvp?.timeline || 'N/A'}

**Features:**
${analysisResult.execution_roadmap?.phase_1_mvp?.features?.map(f => `- ${f}`).join('\n') || 'N/A'}

**Goals:**
${analysisResult.execution_roadmap?.phase_1_mvp?.goals?.map(g => `- ${g}`).join('\n') || 'N/A'}

### Phase 2: Scale
**Timeline:** ${analysisResult.execution_roadmap?.phase_2_scale?.timeline || 'N/A'}

**Features:**
${analysisResult.execution_roadmap?.phase_2_scale?.features?.map(f => `- ${f}`).join('\n') || 'N/A'}

### Phase 3: Advanced
**Timeline:** ${analysisResult.execution_roadmap?.phase_3_advanced?.timeline || 'N/A'}

**Features:**
${analysisResult.execution_roadmap?.phase_3_advanced?.features?.map(f => `- ${f}`).join('\n') || 'N/A'}

---

## 9. Manpower Planning

**Total Headcount:** ${analysisResult.manpower_planning?.total_headcount || 0}

### Minimum Team
${analysisResult.manpower_planning?.minimum_team?.description || 'N/A'}
- Total: ${analysisResult.manpower_planning?.minimum_team?.total || 0} people

### Ideal Team
${analysisResult.manpower_planning?.ideal_team?.description || 'N/A'}
- Total: ${analysisResult.manpower_planning?.ideal_team?.total || 0} people

### Hiring Priority
${analysisResult.manpower_planning?.hiring_priority?.map((r, i) => `${i + 1}. ${r}`).join('\n') || 'N/A'}

---

## 10. Resource Requirements

### Tools Needed
${analysisResult.resource_requirements?.tools_needed?.map(t => `- **${t.name}:** ${t.description} (${t.estimated_cost || 'N/A'})`).join('\n') || 'N/A'}

### Third-Party Services
${analysisResult.resource_requirements?.third_party_services?.map(s => `- **${s.name}:** ${s.description} (${s.estimated_cost || 'N/A'})`).join('\n') || 'N/A'}

---

## 11. Cost Estimation

**Total First Year:** $${analysisResult.cost_estimation?.total_first_year?.toLocaleString() || 0}

| Category | Cost |
|----------|------|
| Engineers | $${analysisResult.cost_estimation?.engineers_cost?.toLocaleString() || 0} |
| Cloud | $${analysisResult.cost_estimation?.cloud_cost?.toLocaleString() || 0} |
| AI APIs | $${analysisResult.cost_estimation?.ai_api_cost?.toLocaleString() || 0} |
| Tools | $${analysisResult.cost_estimation?.tools_cost?.toLocaleString() || 0} |

### Budget Options

**Low Budget:** $${analysisResult.cost_estimation?.low_budget_version?.monthly_cost?.toLocaleString() || 0}/month
${analysisResult.cost_estimation?.low_budget_version?.description || ''}

**Startup Budget:** $${analysisResult.cost_estimation?.startup_version?.monthly_cost?.toLocaleString() || 0}/month
${analysisResult.cost_estimation?.startup_version?.description || ''}

**Scale Budget:** $${analysisResult.cost_estimation?.scale_version?.monthly_cost?.toLocaleString() || 0}/month
${analysisResult.cost_estimation?.scale_version?.description || ''}

---

## 12. Time Estimation

**MVP Timeline:** ${analysisResult.time_estimation?.mvp_timeline || 'N/A'}
**Full Product Timeline:** ${analysisResult.time_estimation?.full_product_timeline || 'N/A'}
**Total Weeks:** ${analysisResult.time_estimation?.total_weeks || 0}

### Milestones
${analysisResult.time_estimation?.milestones?.map(m => `
- **Week ${m.target_week}: ${m.name}**
  - ${m.deliverables?.join(', ') || 'N/A'}
`).join('\n') || 'No milestones defined'}

---

## 13. Impact Analysis

| Metric | Score |
|--------|-------|
| User Impact | ${analysisResult.impact_analysis?.user_impact_score || 0}/10 |
| Business Impact | ${analysisResult.impact_analysis?.business_impact_score || 0}/10 |
| Confidence | ${analysisResult.impact_analysis?.confidence_score || 0}% |

**User Impact:** ${analysisResult.impact_analysis?.user_impact || 'N/A'}

**Business Impact:** ${analysisResult.impact_analysis?.business_impact || 'N/A'}

**Revenue Potential:** ${analysisResult.impact_analysis?.revenue_potential || 'N/A'}

**Scalability Potential:** ${analysisResult.impact_analysis?.scalability_potential || 'N/A'}

**Time to Value:** ${analysisResult.impact_analysis?.time_to_value || 'N/A'}

---

## Analysis Metadata
- **Analysis ID:** ${analysisResult.metadata?.analysis_id || 'N/A'}
- **Processing Time:** ${analysisResult.metadata?.processing_time_ms || 0}ms
- **Model Used:** ${analysisResult.metadata?.model_used || 'N/A'}

---
*Generated by PMCopilot - Complete Product Thinking Engine*
`

    const blob = new Blob([report], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/\s+/g, '_')}_comprehensive_strategy.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('Comprehensive strategy report downloaded!', 'success')
  }

  const features = [
    {
      icon: MessageSquare,
      title: 'Feedback Collection',
      description: 'Gather and organize customer feedback',
      status: 'available',
    },
    {
      icon: Sparkles,
      title: 'AI Analysis',
      description: 'Get AI-powered insights from feedback',
      status: 'available',
    },
    {
      icon: BarChart3,
      title: 'Analytics Dashboard',
      description: 'Visualize trends and patterns',
      status: 'available',
    },
    {
      icon: FileText,
      title: 'Report Generation',
      description: 'Create detailed reports automatically',
      status: 'available',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Chat button - only show when analysis exists */}
              {analysisResult && (
                <motion.button
                  onClick={() => setIsChatOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">AI Chat</span>
                </motion.button>
              )}
              <motion.button
                onClick={() => setIsEditing(!isEditing)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </motion.button>
              <motion.button
                onClick={handleDelete}
                disabled={deleting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{deleting ? 'Deleting...' : 'Delete'}</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 mb-8"
        >
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(project.name)
                    setEditDescription(project.description || '')
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
                  <p className="text-gray-500">
                    {project.description || 'No description provided'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>Created on {formatDate(project.created_at)}</span>
              </div>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Feedback Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Analyze Feedback
              </h2>
              <textarea
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Paste customer feedback, reviews, or survey responses here..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mb-4"
              />
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
                <motion.button
                  onClick={handleAnalyzeFeedback}
                  disabled={analyzing || !feedbackInput.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze with AI
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Analysis Output */}
            {!analysisResult ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-gray-200 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Analysis Results
                </h2>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">No analysis yet</p>
                  <p className="text-sm text-gray-400">
                    Enter your product idea or feedback above to get a comprehensive AI-powered product strategy
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <ComprehensiveStrategyView
                  result={analysisResult}
                  projectName={project.name}
                  onExport={generateReport}
                />
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Integrations Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <IntegrationsPanel
                projectId={project.id}
                onIntegrationSuccess={handleIntegrationSuccess}
              />
            </motion.div>

            {/* Feedback Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <FeedbackPanel
                feedbacks={feedbacks}
                isLoading={feedbacksLoading}
                error={feedbacksError}
                newCount={newCount}
                onClearNewCount={clearNewCount}
                onRefresh={refetchFeedbacks}
                stats={feedbackStats}
              />
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>
              <div className="space-y-3">
                {features.map((feature) => (
                  <div
                    key={feature.title}
                    className={`flex items-start gap-3 p-3 rounded-xl ${
                      feature.status === 'available'
                        ? 'bg-blue-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        feature.status === 'available'
                          ? 'bg-blue-100'
                          : 'bg-gray-200'
                      }`}
                    >
                      <feature.icon
                        className={`w-4 h-4 ${
                          feature.status === 'available'
                            ? 'text-blue-600'
                            : 'text-gray-500'
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium ${
                            feature.status === 'available'
                              ? 'text-gray-900'
                              : 'text-gray-500'
                          }`}
                        >
                          {feature.title}
                        </p>
                        {feature.status === 'coming-soon' && (
                          <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl border border-gray-200 p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors">
                  <Plus className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Add Feedback</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors">
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Import Data</span>
                </button>
                <button
                  onClick={generateReport}
                  disabled={!analysisResult}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl transition-colors ${
                    analysisResult
                      ? 'hover:bg-green-50 text-green-700'
                      : 'opacity-50 cursor-not-allowed text-gray-400'
                  }`}
                >
                  <FileText className={`w-5 h-5 ${analysisResult ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-sm font-medium">Generate Report</span>
                  {analysisResult && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Auto Analysis Notification */}
      <AutoAnalysisNotification
        projectId={project.id}
        analysisId={autoAnalysisId}
        isAnalyzing={isAutoAnalyzing}
        onDismiss={handleDismissAnalysisNotification}
      />

      {/* AI Chat Panel */}
      <AnimatePresence>
        {analysisResult && isChatOpen && (
          <ChatPanel
            analysis={analysisResult}
            projectId={project.id}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
