'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  Sparkles,
  FileText,
  LayoutDashboard,
  AlertTriangle,
  Layers,
  Target,
  Server,
  CheckSquare,
  Map,
  Users,
  Package,
  IndianRupee,
  Calendar,
  TrendingUp,
  Download,
  Share2,
  RefreshCw,
  MessageSquare,
  X,
  Copy,
  Check,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import type { Project } from '@/types'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'

type OutputLength = 'short' | 'medium' | 'long' | 'extra-long'

type SectionId =
  | 'all'
  | 'prd'
  | 'executive-dashboard'
  | 'problem-analysis'
  | 'feature-system'
  | 'gaps-opportunities'
  | 'system-design'
  | 'development-tasks'
  | 'execution-roadmap'
  | 'manpower-planning'
  | 'resources'
  | 'cost-estimation'
  | 'timeline'
  | 'impact-analysis'

interface SectionInfo {
  id: SectionId
  label: string
  icon: React.ElementType
  description: string
  category: 'document' | 'strategy' | 'execution' | 'planning'
}

const SECTIONS: SectionInfo[] = [
  { id: 'all', label: 'All Sections', icon: LayoutDashboard, description: 'View complete analysis', category: 'document' },
  { id: 'prd', label: 'PRD Document', icon: FileText, description: 'Product Requirements Document', category: 'document' },
  { id: 'executive-dashboard', label: 'Executive Dashboard', icon: TrendingUp, description: 'High-level overview', category: 'strategy' },
  { id: 'problem-analysis', label: 'Problem Analysis', icon: AlertTriangle, description: 'Identified problems', category: 'strategy' },
  { id: 'feature-system', label: 'Feature System', icon: Layers, description: 'Suggested features', category: 'strategy' },
  { id: 'gaps-opportunities', label: 'Gaps & Opportunities', icon: Target, description: 'Market opportunities', category: 'strategy' },
  { id: 'system-design', label: 'System Design', icon: Server, description: 'Technical architecture', category: 'execution' },
  { id: 'development-tasks', label: 'Development Tasks', icon: CheckSquare, description: 'Implementation tasks', category: 'execution' },
  { id: 'execution-roadmap', label: 'Execution Roadmap', icon: Map, description: 'Project phases', category: 'execution' },
  { id: 'manpower-planning', label: 'Manpower Planning', icon: Users, description: 'Team structure', category: 'planning' },
  { id: 'resources', label: 'Resources', icon: Package, description: 'Required resources', category: 'planning' },
  { id: 'cost-estimation', label: 'Cost Estimation', icon: IndianRupee, description: 'Budget in INR', category: 'planning' },
  { id: 'timeline', label: 'Timeline', icon: Calendar, description: 'Project schedule', category: 'planning' },
  { id: 'impact-analysis', label: 'Impact Analysis', icon: TrendingUp, description: 'Expected outcomes', category: 'planning' },
]

interface ProjectOutputClientProps {
  project: Project
  user: {
    id: string
    email?: string | null
  }
  initialInput: string
  outputLength: OutputLength
  shouldGenerate: boolean
}

export default function ProjectOutputClient({
  project,
  user,
  initialInput,
  outputLength,
  shouldGenerate,
}: ProjectOutputClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // Start collapsed like dashboard
  const [activeSection, setActiveSection] = useState<SectionId>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [analysisResult, setAnalysisResult] = useState<ComprehensiveStrategyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Chat state - Right side panel with fullscreen mode
  const [chatPanelOpen, setChatPanelOpen] = useState(false)
  const [chatFullscreen, setChatFullscreen] = useState(false)
  const [chatZoomLevel, setChatZoomLevel] = useState(1) // 1 = normal, 0.8 = zoom out, 1.2 = zoom in
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [isChatStreaming, setIsChatStreaming] = useState(false)

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Generate analysis on mount if shouldGenerate is true
  useEffect(() => {
    if (shouldGenerate && initialInput && !analysisResult && !isGenerating) {
      handleGenerate()
    }
  }, [shouldGenerate, initialInput])

  const handleGenerate = async () => {
    if (!initialInput.trim()) {
      showToast('No input provided', 'error')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationProgress('Starting AI analysis...')

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: initialInput,
          project_id: project.id,
          detail_level: outputLength,
          context: {
            project_name: project.name,
            project_context: project.description,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()

      if (result.success === false) {
        throw new Error(result.error || 'Analysis failed')
      }

      // The API returns the result directly, not nested
      setAnalysisResult(result.data || result)
      setGenerationProgress('')
      showToast('Analysis complete!', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      setError(message)
      showToast(message, 'error')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatStreaming) return

    const userMessage = chatInput.trim()
    setChatInput('')

    // Add user message immediately
    const newUserMessage = { role: 'user' as const, content: userMessage }
    setChatMessages(prev => [...prev, newUserMessage])
    setIsChatStreaming(true)

    try {
      // Build context from current analysis
      const context = analysisResult
        ? `Current analysis includes: ${analysisResult.problem_analysis?.length || 0} problems, ${analysisResult.feature_system?.length || 0} features, ${analysisResult.development_tasks?.length || 0} tasks.`
        : ''

      const response = await fetch('/api/chat-first', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${context}\n\nUser question: ${userMessage}`,
          depth: 'medium',
          section: activeSection,
          projectId: project.id,
          history: chatMessages.slice(-6),
        }),
      })

      if (!response.ok) throw new Error('Chat failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantMessage = ''
      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantMessage += parsed.content
                setChatMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: assistantMessage }
                  return updated
                })
              }
            } catch {}
          }
        }
      }

      // Save chat to database after completion
      try {
        const supabase = createClientSupabaseClient()
        await supabase
          .from('chat_history')
          .insert({
            project_id: project.id,
            user_id: user.id,
            user_message: userMessage,
            assistant_message: assistantMessage,
            section: activeSection,
            created_at: new Date().toISOString(),
          })
      } catch (dbError) {
        console.error('Failed to save chat to database:', dbError)
        // Don't show error to user, just log it
      }

    } catch (err) {
      showToast('Failed to send message', 'error')
      // Remove the empty assistant message on error
      setChatMessages(prev => prev.slice(0, -1))
    } finally {
      setIsChatStreaming(false)
    }
  }

  const handleCopySection = (content: string) => {
    navigator.clipboard.writeText(content)
    showToast('Copied to clipboard', 'success')
  }

  const generateComprehensiveContent = () => {
    if (!analysisResult) return { title: '', content: '', summary: '' }

    const title = `${project.name} - AI Product Strategy Analysis`
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    let content = `# ${title}\n\n`
    content += `**Generated on:** ${date}\n\n`
    content += `**Project ID:** ${project.id}\n\n`
    content += `---\n\n`

    // Executive Dashboard
    if (analysisResult.executive_dashboard) {
      content += `## Executive Dashboard\n\n`
      content += `**Innovation Score:** ${analysisResult.executive_dashboard.innovation_score || 'N/A'}\n`
      content += `**Complexity Level:** ${analysisResult.executive_dashboard.complexity_level || 'N/A'}\n\n`
      if (analysisResult.executive_dashboard.idea_expansion) {
        content += `### Idea Expansion\n${analysisResult.executive_dashboard.idea_expansion}\n\n`
      }
      if (analysisResult.executive_dashboard.key_insight) {
        content += `### Key Insight\n${analysisResult.executive_dashboard.key_insight}\n\n`
      }
      if (analysisResult.executive_dashboard.market_opportunity) {
        content += `### Market Opportunity\n${analysisResult.executive_dashboard.market_opportunity}\n\n`
      }
      if (analysisResult.executive_dashboard.recommended_strategy) {
        content += `### Recommended Strategy\n${analysisResult.executive_dashboard.recommended_strategy}\n\n`
      }
    }

    // Problem Analysis
    if (analysisResult.problem_analysis && analysisResult.problem_analysis.length > 0) {
      content += `## Problem Analysis\n\n`
      content += `**Total Problems Identified:** ${analysisResult.problem_analysis.length}\n\n`
      analysisResult.problem_analysis.forEach((problem, index) => {
        content += `### ${index + 1}. ${problem.title}\n\n`
        if (problem.deep_description || problem.description) {
          content += `**Description:** ${problem.deep_description || problem.description}\n\n`
        }
        if (problem.root_cause) {
          content += `**Root Cause:** ${problem.root_cause}\n\n`
        }
        if (problem.affected_users) {
          content += `**Affected Users:** ${problem.affected_users}\n\n`
        }
        if (problem.severity_score !== undefined) {
          content += `**Severity Score:** ${problem.severity_score}/10\n\n`
        }
        if (problem.business_impact) {
          content += `**Business Impact:** ${problem.business_impact}\n\n`
        }
        content += `---\n\n`
      })
    }

    // Feature System
    if (analysisResult.feature_system && analysisResult.feature_system.length > 0) {
      content += `## Feature System\n\n`
      content += `**Total Features Proposed:** ${analysisResult.feature_system.length}\n\n`
      analysisResult.feature_system.forEach((feature, index) => {
        content += `### ${index + 1}. ${feature.name || feature.title}\n\n`
        if (feature.category) {
          content += `**Category:** ${feature.category}\n\n`
        }
        if (feature.detailed_description || feature.description) {
          content += `**Description:** ${feature.detailed_description || feature.description}\n\n`
        }
        if (feature.why_needed) {
          content += `**Why Needed:** ${feature.why_needed}\n\n`
        }
        if (feature.user_value) {
          content += `**User Value:** ${feature.user_value}\n\n`
        }
        if (feature.business_value) {
          content += `**Business Value:** ${feature.business_value}\n\n`
        }
        if (feature.complexity) {
          content += `**Complexity:** ${feature.complexity}\n\n`
        }
        if (feature.estimated_dev_time || feature.estimated_hours) {
          content += `**Estimated Time:** ${feature.estimated_dev_time || feature.estimated_hours + 'h'}\n\n`
        }
        content += `---\n\n`
      })
    }

    // PRD Section
    if (analysisResult.prd) {
      content += `## Product Requirements Document (PRD)\n\n`

      if (typeof analysisResult.prd === 'string') {
        content += `${analysisResult.prd}\n\n`
      } else {
        if (analysisResult.prd.vision) {
          content += `### Vision\n${analysisResult.prd.vision}\n\n`
        }
        if (analysisResult.prd.mission) {
          content += `### Mission\n${analysisResult.prd.mission}\n\n`
        }
        if (analysisResult.prd.problem_statement) {
          content += `### Problem Statement\n${analysisResult.prd.problem_statement}\n\n`
        }
      }
    }

    // System Design
    if (analysisResult.system_design) {
      content += `## System Design\n\n`
      if (analysisResult.system_design.architecture_overview) {
        content += `### Architecture Overview\n${analysisResult.system_design.architecture_overview}\n\n`
      }
      if (analysisResult.system_design.technology_stack) {
        content += `### Technology Stack\n\n`
        const stack = analysisResult.system_design.technology_stack
        if (stack.frontend) {
          content += `**Frontend:** ${Array.isArray(stack.frontend) ? stack.frontend.join(', ') : stack.frontend}\n\n`
        }
        if (stack.backend) {
          content += `**Backend:** ${Array.isArray(stack.backend) ? stack.backend.join(', ') : stack.backend}\n\n`
        }
        if (stack.database) {
          content += `**Database:** ${Array.isArray(stack.database) ? stack.database.join(', ') : stack.database}\n\n`
        }
      }
    }

    // Development Tasks
    if (analysisResult.development_tasks && analysisResult.development_tasks.length > 0) {
      content += `## Development Tasks\n\n`
      content += `**Total Tasks:** ${analysisResult.development_tasks.length}\n\n`
      analysisResult.development_tasks.forEach((task, index) => {
        content += `### ${index + 1}. ${task.title}\n\n`
        if (task.type) {
          content += `**Type:** ${task.type}\n\n`
        }
        if (task.priority) {
          content += `**Priority:** ${task.priority}\n\n`
        }
        if (task.complexity) {
          content += `**Complexity:** ${task.complexity}\n\n`
        }
        if (task.estimated_time || task.estimated_hours) {
          content += `**Estimated Time:** ${task.estimated_time || task.estimated_hours + 'h'}\n\n`
        }
        if (task.description) {
          content += `**Description:** ${task.description}\n\n`
        }
        if (task.detailed_steps && task.detailed_steps.length > 0) {
          content += `**Implementation Steps:**\n`
          task.detailed_steps.forEach((step, stepIndex) => {
            content += `${stepIndex + 1}. ${step}\n`
          })
          content += `\n`
        }
        content += `---\n\n`
      })
    }

    // Cost Estimation
    if (analysisResult.cost_planning) {
      content += `## Cost Estimation\n\n`
      if (analysisResult.cost_planning.total_first_year_cost_inr) {
        content += `**Total First Year Cost:** ₹${analysisResult.cost_planning.total_first_year_cost_inr.toLocaleString('en-IN')}\n\n`
      }
      if (analysisResult.cost_planning.development_phase_cost_inr) {
        content += `### Development Phase Costs\n`
        const devCosts = analysisResult.cost_planning.development_phase_cost_inr
        if (devCosts.mvp) content += `- **MVP:** ₹${devCosts.mvp.toLocaleString('en-IN')}\n`
        if (devCosts.growth) content += `- **Growth:** ₹${devCosts.growth.toLocaleString('en-IN')}\n`
        if (devCosts.scale) content += `- **Scale:** ₹${devCosts.scale.toLocaleString('en-IN')}\n`
        content += `\n`
      }
    }

    // Timeline
    if (analysisResult.time_planning) {
      content += `## Timeline\n\n`
      if (analysisResult.time_planning.mvp_timeline) {
        content += `### MVP Timeline\n`
        content += `**Total Weeks:** ${analysisResult.time_planning.mvp_timeline.total_weeks}\n\n`
        if (analysisResult.time_planning.mvp_timeline.key_milestones) {
          content += `**Key Milestones:**\n`
          analysisResult.time_planning.mvp_timeline.key_milestones.forEach((milestone, index) => {
            content += `${index + 1}. Week ${milestone.week}: ${milestone.milestone}\n`
          })
          content += `\n`
        }
      }
    }

    // Impact Analysis
    if (analysisResult.impact_analysis) {
      content += `## Impact Analysis\n\n`
      if (analysisResult.impact_analysis.user_impact_score) {
        content += `**User Impact Score:** ${analysisResult.impact_analysis.user_impact_score}/10\n\n`
      }
      if (analysisResult.impact_analysis.business_impact_score) {
        content += `**Business Impact Score:** ${analysisResult.impact_analysis.business_impact_score}/10\n\n`
      }
      if (analysisResult.impact_analysis.user_impact) {
        content += `### User Impact\n${analysisResult.impact_analysis.user_impact}\n\n`
      }
      if (analysisResult.impact_analysis.business_impact) {
        content += `### Business Impact\n${analysisResult.impact_analysis.business_impact}\n\n`
      }
    }

    // Generate summary
    const problemCount = analysisResult.problem_analysis?.length || 0
    const featureCount = analysisResult.feature_system?.length || 0
    const taskCount = analysisResult.development_tasks?.length || 0

    const summary = `This comprehensive product strategy analysis for ${project.name} identified ${problemCount} key problems, proposed ${featureCount} strategic features, and outlined ${taskCount} development tasks. Generated using AI-powered analysis on ${date}.`

    return { title, content, summary }
  }

  const handleExport = (format: 'md' | 'txt' | 'pdf' | 'docx') => {
    if (!analysisResult) {
      showToast('No analysis to export', 'error')
      return
    }

    const { title, content, summary } = generateComprehensiveContent()
    const fileName = `${project.name.replace(/\s+/g, '-')}-analysis`

    try {
      switch (format) {
        case 'md':
          exportAsMarkdown(content, fileName)
          break
        case 'txt':
          exportAsText(content, fileName)
          break
        case 'pdf':
          exportAsPDF(title, content, fileName)
          break
        case 'docx':
          exportAsDocx(title, content, fileName)
          break
        default:
          showToast('Unsupported format', 'error')
          return
      }

      showToast(`Analysis exported as ${format.toUpperCase()}`, 'success')
    } catch (error) {
      console.error('Export error:', error)
      showToast(`Failed to export as ${format.toUpperCase()}`, 'error')
    }

    setShowExportMenu(false)
  }

  const exportAsMarkdown = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    downloadFile(blob, `${fileName}.md`)
  }

  const exportAsText = (content: string, fileName: string) => {
    // Convert markdown to plain text
    const plainText = content
      .replace(/#{1,6}\s?/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/^\s*[-+*]\s+/gm, '• ') // Convert lists
      .replace(/^\s*\d+\.\s+/gm, '• ') // Convert numbered lists
      .replace(/\n\n\n+/g, '\n\n') // Normalize spacing
      .trim()

    const blob = new Blob([plainText], { type: 'text/plain' })
    downloadFile(blob, `${fileName}.txt`)
  }

  const exportAsPDF = async (title: string, content: string, fileName: string) => {
    // For PDF generation, we'll create a simplified version
    // In a production app, you'd want to use proper PDF libraries like jsPDF or PDFKit

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; line-height: 1.6; color: #333; margin: 40px; }
        h1 { color: #1a202c; border-bottom: 3px solid #3182ce; padding-bottom: 10px; margin-bottom: 30px; }
        h2 { color: #2d3748; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin: 30px 0 15px; }
        h3 { color: #4a5568; margin: 20px 0 10px; }
        p { margin-bottom: 12px; }
        hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
        strong { color: #2d3748; }
        .metadata { background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 30px; font-size: 14px; }
        @media print { body { margin: 20px; } }
    </style>
</head>
<body>
    <div class="metadata">
        <strong>Document:</strong> ${title}<br>
        <strong>Generated:</strong> ${new Date().toLocaleDateString()}<br>
        <strong>Export Format:</strong> PDF
    </div>
    ${content.replace(/\n/g, '<br>').replace(/#{1,6}\s?([^\n]+)/g, (match, text) => {
      const level = match.split('#').length - 1
      return `<h${Math.min(level, 3)}>${text}</h${Math.min(level, 3)}>`
    }).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}
</body>
</html>`

    // Create a new window for printing
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()

      // Wait for content to load, then trigger print dialog
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 250)
      }
    } else {
      throw new Error('Could not open print window. Please check your popup blocker.')
    }
  }

  const exportAsDocx = (title: string, content: string, fileName: string) => {
    // For DOCX, we'll create a simplified RTF format that Word can read
    // In production, consider using libraries like PizZip with Docxtemplater

    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
\\f0\\fs24
{\\b\\fs32 ${title}\\par}
\\par
{\\i Generated on ${new Date().toLocaleDateString()}\\par}
\\par
${content
  .replace(/\n/g, '\\par ')
  .replace(/#{1,6}\s?([^\n]+)/g, '{\\b\\fs28 $1\\par}')
  .replace(/\*\*(.*?)\*\*/g, '{\\b $1}')
  .replace(/\*(.*?)\*/g, '{\\i $1}')
}
}`

    const blob = new Blob([rtfContent], { type: 'application/rtf' })
    downloadFile(blob, `${fileName}.rtf`)
  }

  const downloadFile = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Render different sections based on activeSection
  const renderContent = () => {
    if (isGenerating) {
      return <GeneratingState progress={generationProgress} />
    }

    if (error) {
      return <ErrorState message={error} onRetry={handleGenerate} />
    }

    if (!analysisResult) {
      return <EmptyState input={initialInput} onGenerate={handleGenerate} />
    }

    switch (activeSection) {
      case 'prd':
        return <PRDSection data={analysisResult.prd} onCopy={handleCopySection} />
      case 'executive-dashboard':
        return <ExecutiveDashboardSection data={analysisResult.executive_dashboard} />
      case 'problem-analysis':
        return <ProblemAnalysisSection data={analysisResult.problem_analysis} />
      case 'feature-system':
        return <FeatureSystemSection data={analysisResult.feature_system} />
      case 'gaps-opportunities':
        return <GapsOpportunitiesSection data={analysisResult.gaps_opportunities} />
      case 'system-design':
        return <SystemDesignSection data={analysisResult.system_design} />
      case 'development-tasks':
        return <DevelopmentTasksSection data={analysisResult.development_tasks} />
      case 'execution-roadmap':
        return <ExecutionRoadmapSection data={analysisResult.execution_roadmap} />
      case 'manpower-planning':
        return <ManpowerPlanningSection data={analysisResult.manpower_planning} />
      case 'resources':
        return <ResourcesSection data={analysisResult.resource_requirements} />
      case 'cost-estimation':
        return <CostEstimationSection data={analysisResult.cost_estimation} />
      case 'timeline':
        return <TimelineSection data={analysisResult.time_estimation} />
      case 'impact-analysis':
        return <ImpactAnalysisSection data={analysisResult.impact_analysis} />
      case 'all':
      default:
        return <AllSectionsView data={analysisResult} onSectionClick={setActiveSection} />
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 280 }}
        onMouseEnter={() => setSidebarCollapsed(false)}
        onMouseLeave={() => setSidebarCollapsed(true)}
        className="sticky top-0 h-screen flex flex-col
          bg-white dark:bg-gray-900
          border-r border-gray-200 dark:border-gray-800
          z-40 transition-all duration-300"
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
          {!sidebarCollapsed && (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700
                dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Project Title */}
        {!sidebarCollapsed && (
          <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white truncate">
              {project.name}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              AI Workspace
            </p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {/* Document Section */}
          {!sidebarCollapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
              Document
            </p>
          )}
          {SECTIONS.filter(s => s.category === 'document').map((section) => (
            <SidebarItem
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              isCollapsed={sidebarCollapsed}
              onClick={() => setActiveSection(section.id)}
            />
          ))}

          {/* Strategy Section */}
          {!sidebarCollapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase mt-4">
              Strategy
            </p>
          )}
          {SECTIONS.filter(s => s.category === 'strategy').map((section) => (
            <SidebarItem
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              isCollapsed={sidebarCollapsed}
              onClick={() => setActiveSection(section.id)}
            />
          ))}

          {/* Execution Section */}
          {!sidebarCollapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase mt-4">
              Execution
            </p>
          )}
          {SECTIONS.filter(s => s.category === 'execution').map((section) => (
            <SidebarItem
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              isCollapsed={sidebarCollapsed}
              onClick={() => setActiveSection(section.id)}
            />
          ))}

          {/* Planning Section */}
          {!sidebarCollapsed && (
            <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase mt-4">
              Planning & Costs
            </p>
          )}
          {SECTIONS.filter(s => s.category === 'planning').map((section) => (
            <SidebarItem
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              isCollapsed={sidebarCollapsed}
              onClick={() => setActiveSection(section.id)}
            />
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => router.push(`/project/${project.id}`)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800 transition-all
              ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <RefreshCw className="w-4 h-4" />
            {!sidebarCollapsed && <span className="text-sm">New Analysis</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content - Flex row to accommodate right chat panel */}
      <div className="flex-1 flex">
        {/* Content Area */}
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 h-16 px-6
            bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
            border-b border-gray-200/50 dark:border-gray-800/50
            flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {SECTIONS.find(s => s.id === activeSection)?.label || 'Analysis'}
              </h1>
              {analysisResult && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium
                  bg-emerald-100 dark:bg-emerald-900/30
                  text-emerald-600 dark:text-emerald-400">
                  Complete
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setChatPanelOpen(!chatPanelOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg
                  transition-all ${chatPanelOpen
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">Ask Questions</span>
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                  text-gray-600 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg
                    text-gray-600 dark:text-gray-400
                    hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Export</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                <AnimatePresence>
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 w-56
                          bg-white dark:bg-gray-800
                          rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700
                          overflow-hidden z-50"
                      >
                        <div className="p-2">
                          <p className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                            Export Format
                          </p>

                          <ExportOption
                            icon={FileText}
                            label="Markdown (.md)"
                            description="GitHub-compatible markdown"
                            onClick={() => handleExport('md')}
                          />

                          <ExportOption
                            icon={FileText}
                            label="Plain Text (.txt)"
                            description="Simple text file"
                            onClick={() => handleExport('txt')}
                          />

                          <ExportOption
                            icon={FileText}
                            label="PDF Document"
                            description="Print-friendly PDF"
                            onClick={() => handleExport('pdf')}
                          />

                          <ExportOption
                            icon={FileText}
                            label="Word Document (.rtf)"
                            description="Microsoft Word compatible"
                            onClick={() => handleExport('docx')}
                          />
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto p-6"
          >
            <div className="max-w-4xl mx-auto">
              {renderContent()}
            </div>
          </div>
        </main>

        {/* Right Chat Panel */}
        <AnimatePresence>
          {chatPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{
                width: chatFullscreen ? '100vw' : 400,
                opacity: 1
              }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`sticky top-0 h-screen flex flex-col
                bg-white dark:bg-gray-900
                border-l border-gray-200 dark:border-gray-800
                overflow-hidden z-50
                ${chatFullscreen
                  ? 'fixed inset-0 w-screen h-screen border-l-0 z-50'
                  : 'relative'
                }`}
            >
              {/* Chat Header */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {chatFullscreen ? 'AI Assistant (Fullscreen)' : 'Ask Follow-up'}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setChatFullscreen(!chatFullscreen)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600
                      hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    title={chatFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {chatFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </button>

                  {/* Zoom Controls */}
                  <button
                    onClick={() => setChatZoomLevel(prev => Math.min(1.5, prev + 0.1))}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600
                      hover:bg-gray-100 dark:hover:bg-gray-800 transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom in"
                    disabled={chatZoomLevel >= 1.5}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setChatZoomLevel(prev => Math.max(0.7, prev - 0.1))}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600
                      hover:bg-gray-100 dark:hover:bg-gray-800 transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom out"
                    disabled={chatZoomLevel <= 0.7}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  {/* Reset Zoom (when not at 1.0) */}
                  {chatZoomLevel !== 1 && (
                    <button
                      onClick={() => setChatZoomLevel(1)}
                      className="p-1.5 px-2.5 rounded-lg text-xs font-medium
                        bg-blue-100 text-blue-600 hover:bg-blue-200
                        dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50
                        transition-all"
                      title="Reset zoom"
                    >
                      {Math.round(chatZoomLevel * 100)}%
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setChatPanelOpen(false)
                      setChatFullscreen(false)
                      setChatZoomLevel(1)
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600
                      hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    title="Close chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
                chatFullscreen ? 'max-w-4xl mx-auto w-full p-6' : ''
              }`}>
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <Sparkles className="w-12 h-12 text-blue-500 mb-4" />
                    <p className="text-gray-900 dark:text-white font-medium mb-2">
                      Ask anything about the analysis
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {chatFullscreen
                        ? 'Get detailed analysis, comparisons, and strategic insights'
                        : 'Get clarifications, request expansions, or explore different tech stacks'
                      }
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`${chatFullscreen ? 'max-w-[80%]' : 'max-w-[85%]'} px-4 py-3 rounded-2xl
                      ${msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}>
                      {msg.role === 'assistant' ? (
                        <ReactMarkdown
                          className={`prose dark:prose-invert max-w-none
                            prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                            prose-p:my-2 prose-p:leading-relaxed
                            prose-ul:my-2 prose-ol:my-2 prose-li:my-1
                            prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-white
                            prose-code:bg-gray-200 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                            prose-pre:bg-gray-200 dark:prose-pre:bg-gray-700 prose-pre:p-3 prose-pre:rounded-lg
                            prose-table:border-collapse prose-table:w-full
                            prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:p-2 prose-th:bg-gray-100 dark:prose-th:bg-gray-800
                            prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:p-2
                            prose-a:text-blue-600 hover:prose-a:text-blue-700
                            ${chatFullscreen
                              ? 'prose-lg prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg'
                              : 'prose-sm prose-h1:text-xl prose-h2:text-lg prose-h3:text-base'
                            }`}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        <p className={`whitespace-pre-wrap ${chatFullscreen ? 'text-base' : 'text-sm'}`}>
                          {msg.content}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {isChatStreaming && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className={`p-4 border-t border-gray-200 dark:border-gray-800 ${
                chatFullscreen ? 'max-w-4xl mx-auto w-full px-6' : ''
              }`}>
                <div className="flex items-end gap-3">
                  <textarea
                    ref={chatInputRef}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleChatSubmit()
                      }
                    }}
                    placeholder={chatFullscreen
                      ? "Ask detailed questions about the analysis, request comparisons, or explore strategic options..."
                      : "Ask about the analysis..."
                    }
                    rows={chatFullscreen ? 4 : 3}
                    className={`flex-1 px-4 py-3 rounded-xl
                      bg-gray-100 dark:bg-gray-800
                      border border-gray-200 dark:border-gray-700
                      text-gray-900 dark:text-white
                      placeholder-gray-500
                      focus:outline-none focus:ring-2 focus:ring-blue-500
                      resize-none
                      ${chatFullscreen ? 'text-base' : 'text-sm'}`}
                  />
                  <button
                    onClick={handleChatSubmit}
                    disabled={!chatInput.trim() || isChatStreaming}
                    className={`rounded-xl
                      bg-blue-500 hover:bg-blue-600
                      text-white disabled:opacity-50
                      transition-colors
                      ${chatFullscreen ? 'p-4' : 'p-3'}`}
                  >
                    {isChatStreaming ? (
                      <Loader2 className={`animate-spin ${chatFullscreen ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    ) : (
                      <Send className={chatFullscreen ? 'w-6 h-6' : 'w-5 h-5'} />
                    )}
                  </button>
                </div>
                {chatFullscreen && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd> to send,{' '}
                    <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Shift+Enter</kbd> for new line
                  </p>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Sidebar Item Component
interface SidebarItemProps {
  section: SectionInfo
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
}

function SidebarItem({ section, isActive, isCollapsed, onClick }: SidebarItemProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        transition-all duration-200
        ${isActive
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }
        ${isCollapsed ? 'justify-center' : ''}`}
    >
      <section.icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : ''}`} />
      {!isCollapsed && (
        <span className="text-sm font-medium truncate">{section.label}</span>
      )}
    </motion.button>
  )
}

// Export Option Component
interface ExportOptionProps {
  icon: React.ElementType
  label: string
  description: string
  onClick: () => void
}

function ExportOption({ icon: Icon, label, description, onClick }: ExportOptionProps) {
  return (
    <motion.button
      whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.05)' }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg
        text-gray-700 dark:text-gray-300 text-left
        hover:text-blue-600 dark:hover:text-blue-400
        transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </motion.button>
  )
}

// Loading/Generating State
function GeneratingState({ progress }: { progress: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-20 h-20 rounded-2xl
          bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
          flex items-center justify-center shadow-xl shadow-purple-500/30 mb-6"
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Generating Analysis...
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        {progress || 'AI is analyzing your input and generating comprehensive insights'}
      </p>
      <div className="w-64 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 30, ease: 'linear' }}
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        />
      </div>
    </div>
  )
}

// Error State
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/30
        flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Generation Failed
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-6 py-3 rounded-xl
          bg-blue-500 hover:bg-blue-600 text-white font-medium
          transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  )
}

// Empty State
function EmptyState({ input, onGenerate }: { input: string; onGenerate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-2xl
        bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700
        flex items-center justify-center mb-6">
        <FileText className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Ready to Analyze
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-center max-w-md">
        {input ? 'Click the button below to start the AI analysis' : 'No input provided'}
      </p>
      {input && (
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-6 py-3 rounded-xl
            bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
            text-white font-semibold shadow-lg shadow-purple-500/25
            transition-all"
        >
          <Sparkles className="w-5 h-5" />
          Generate Analysis
        </button>
      )}
    </div>
  )
}

// Section Components - Placeholder implementations
// These would be much more detailed in production

function PRDSection({ data, onCopy }: { data: any; onCopy: (content: string) => void }) {
  if (!data) return <EmptySection name="PRD" />

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Product Requirements Document"
        subtitle="Comprehensive product specification"
        onCopy={() => onCopy(JSON.stringify(data, null, 2))}
      />

      {/* Vision & Mission */}
      <ContentCard title="Vision">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.vision}</p>
      </ContentCard>

      <ContentCard title="Mission">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.mission}</p>
      </ContentCard>

      <ContentCard title="Problem Statement">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.problem_statement}</p>
      </ContentCard>

      {/* Target Users */}
      {data.target_users && (
        <ContentCard title="Target Users">
          <ul className="space-y-2">
            {data.target_users.map((user: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30
                  flex items-center justify-center text-xs font-bold text-blue-600">{i + 1}</span>
                <span className="text-gray-700 dark:text-gray-300">{user}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {/* Personas */}
      {data.personas && data.personas.length > 0 && (
        <ContentCard title="User Personas">
          <div className="grid gap-6">
            {data.personas.map((persona: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {persona.name}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{persona.description}</p>
                {persona.goals && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Goals</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                      {persona.goals.map((goal: string, j: number) => (
                        <li key={j}>{goal}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {/* Goals */}
      {data.goals_short_term && (
        <ContentCard title="Short-term Goals (3-6 months)">
          <ul className="space-y-2">
            {data.goals_short_term.map((goal: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{goal}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {data.goals_long_term && (
        <ContentCard title="Long-term Goals (1-3 years)">
          <ul className="space-y-2">
            {data.goals_long_term.map((goal: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{goal}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {/* Feature Requirements */}
      {data.feature_requirements && (
        <ContentCard title="Feature Requirements">
          <ul className="space-y-2">
            {data.feature_requirements.map((req: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/30
                  flex items-center justify-center text-xs font-bold text-purple-600">F{i + 1}</span>
                <span className="text-gray-700 dark:text-gray-300">{req}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {/* Success Metrics */}
      {data.success_metrics && (
        <ContentCard title="Success Metrics">
          <ul className="space-y-2">
            {data.success_metrics.map((metric: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-emerald-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{metric}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {/* Risks */}
      {data.risks && (
        <ContentCard title="Risks & Mitigations">
          <ul className="space-y-2">
            {data.risks.map((risk: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{risk}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
    </div>
  )
}

function ExecutiveDashboardSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Executive Dashboard" />

  return (
    <div className="space-y-8">
      <SectionHeader title="Executive Dashboard" subtitle="Strategic overview at a glance" />

      <ContentCard title="Idea Expansion">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.idea_expansion}</p>
      </ContentCard>

      <ContentCard title="Key Insight">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
          <p className="text-gray-800 dark:text-gray-200 font-medium">{data.key_insight}</p>
        </div>
      </ContentCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Innovation Score" value={`${data.innovation_score || 0}/10`} color="blue" />
        <MetricCard label="Complexity" value={data.complexity_level || 'Medium'} color="purple" />
        <MetricCard label="Market Size" value="Large" color="emerald" />
        <MetricCard label="Confidence" value="High" color="amber" />
      </div>

      <ContentCard title="Market Opportunity">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.market_opportunity}</p>
      </ContentCard>

      <ContentCard title="Recommended Strategy">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.recommended_strategy}</p>
      </ContentCard>
    </div>
  )
}

function ProblemAnalysisSection({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptySection name="Problem Analysis" />

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Problem Analysis"
        subtitle={`${data.length} problems identified`}
      />

      <div className="space-y-6">
        {data.map((problem: any, i: number) => (
          <div key={i} className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-red-500 uppercase">{problem.id}</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {problem.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium
                  bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  Severity: {problem.severity_score}/10
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium
                  bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  Frequency: {problem.frequency_score}/10
                </span>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{problem.deep_description}</p>
            {problem.root_cause && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Root Cause</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{problem.root_cause}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function FeatureSystemSection({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptySection name="Feature System" />

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Feature System"
        subtitle={`${data.length} features suggested`}
      />

      <div className="space-y-6">
        {data.map((feature: any, i: number) => (
          <div key={i} className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-bold text-blue-500 uppercase">{feature.id}</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                  {feature.name}
                </h3>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium
                ${feature.category === 'core'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                  : feature.category === 'advanced'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                }`}>
                {feature.category}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{feature.detailed_description}</p>
            {feature.why_needed && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Why Needed</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">{feature.why_needed}</p>
              </div>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Complexity: {feature.complexity}</span>
              <span>Est. Time: {feature.estimated_dev_time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function GapsOpportunitiesSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Gaps & Opportunities" />

  return (
    <div className="space-y-8">
      <SectionHeader title="Gaps & Opportunities" subtitle="Market analysis and strategic openings" />

      {data.market_lacks && (
        <ContentCard title="What the Market Lacks">
          <ul className="space-y-2">
            {data.market_lacks.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <Target className="w-5 h-5 text-red-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {data.why_competitors_fail && (
        <ContentCard title="Why Competitors Fail">
          <ul className="space-y-2">
            {data.why_competitors_fail.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {data.innovation_opportunities && (
        <ContentCard title="Innovation Opportunities">
          <ul className="space-y-2">
            {data.innovation_opportunities.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
    </div>
  )
}

function SystemDesignSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="System Design" />

  return (
    <div className="space-y-8">
      <SectionHeader title="System Design" subtitle="Technical architecture overview" />

      <ContentCard title="Architecture Overview">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.architecture_overview}</p>
      </ContentCard>

      {data.technology_stack && (
        <ContentCard title="Technology Stack">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(data.technology_stack).map(([key, value]: [string, any]) => (
              <div key={key} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{key}</p>
                <ul className="space-y-1">
                  {(Array.isArray(value) ? value : [value]).map((item: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ContentCard>
      )}
    </div>
  )
}

function DevelopmentTasksSection({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <EmptySection name="Development Tasks" />

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Development Tasks"
        subtitle={`${data.length} tasks planned`}
      />

      <div className="space-y-4">
        {data.map((task: any, i: number) => (
          <div key={i} className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400">{task.id}</span>
                <h4 className="font-medium text-gray-900 dark:text-white">{task.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                  ${task.priority === 'Critical' || task.priority === 'High'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                    : task.priority === 'Medium'
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                  }`}>
                  {task.priority}
                </span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium
                  bg-blue-100 dark:bg-blue-900/30 text-blue-600">
                  {task.type}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Est: {task.estimated_time}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExecutionRoadmapSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Execution Roadmap" />

  return (
    <div className="space-y-8">
      <SectionHeader title="Execution Roadmap" subtitle="Phased implementation plan" />

      {data.phase_1_mvp && (
        <ContentCard title="Phase 1: MVP">
          <p className="text-sm text-gray-500 mb-3">Duration: {data.phase_1_mvp.duration}</p>
          <ul className="space-y-2">
            {data.phase_1_mvp.key_features?.map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {data.phase_2_growth && (
        <ContentCard title="Phase 2: Growth">
          <p className="text-sm text-gray-500 mb-3">Duration: {data.phase_2_growth.duration}</p>
          <ul className="space-y-2">
            {data.phase_2_growth.key_features?.map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}

      {data.phase_3_scale && (
        <ContentCard title="Phase 3: Scale">
          <p className="text-sm text-gray-500 mb-3">Duration: {data.phase_3_scale.duration}</p>
          <ul className="space-y-2">
            {data.phase_3_scale.key_features?.map((feature: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
    </div>
  )
}

function ManpowerPlanningSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Manpower Planning" />

  return (
    <div className="space-y-8">
      <SectionHeader title="Manpower Planning" subtitle="Team structure and roles" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Team Size" value={data.total_team_size || 'TBD'} color="blue" />
        <MetricCard
          label="Monthly Cost"
          value={`₹${((data.total_monthly_cost_inr || 0) / 100000).toFixed(1)}L`}
          color="emerald"
        />
      </div>

      {data.team_composition && (
        <ContentCard title="Team Composition">
          <div className="space-y-4">
            {data.team_composition.map((member: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{member.role}</h4>
                  <p className="text-sm text-gray-500">{member.seniority} • {member.count} person(s)</p>
                </div>
                <span className="font-medium text-emerald-600">
                  ₹{((member.monthly_cost_inr || 0) / 1000).toFixed(0)}K/mo
                </span>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      <ContentCard title="Hiring Plan">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.hiring_plan}</p>
      </ContentCard>
    </div>
  )
}

function ResourcesSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Resources" />

  return (
    <div className="space-y-8">
      <SectionHeader title="Resource Planning" subtitle="Infrastructure and tools" />

      {data.infrastructure_costs && (
        <ContentCard title="Infrastructure Costs">
          <div className="space-y-3">
            {data.infrastructure_costs.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.service}</p>
                  <p className="text-sm text-gray-500">{item.purpose}</p>
                </div>
                <span className="font-medium text-blue-600">
                  ₹{((item.monthly_cost_inr || 0) / 1000).toFixed(0)}K/mo
                </span>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {data.third_party_services && (
        <ContentCard title="Third-party Services">
          <div className="space-y-3">
            {data.third_party_services.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.service}</p>
                  <p className="text-sm text-gray-500">{item.purpose}</p>
                </div>
                <span className="font-medium text-purple-600">
                  ₹{((item.monthly_cost_inr || 0) / 1000).toFixed(0)}K/mo
                </span>
              </div>
            ))}
          </div>
        </ContentCard>
      )}
    </div>
  )
}

function CostEstimationSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Cost Estimation" />

  // Handle both API response format and typed format
  const totalFirstYear = data.total_first_year || data.total_first_year_cost_inr || 0

  return (
    <div className="space-y-8">
      <SectionHeader title="Cost Estimation" subtitle="Budget breakdown in INR" />

      {/* Budget Versions */}
      {(data.low_budget_version || data.startup_version || data.scale_version) && (
        <ContentCard title="Budget Options">
          <div className="grid md:grid-cols-3 gap-4">
            {data.low_budget_version && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center">
                <p className="text-sm text-emerald-600 mb-1">Low Budget</p>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{((data.low_budget_version.annual_cost || 0) / 100000).toFixed(1)}L/yr
                </p>
                <p className="text-xs text-emerald-600 mt-1">{data.low_budget_version.description}</p>
              </div>
            )}
            {data.startup_version && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                <p className="text-sm text-blue-600 mb-1">Startup Version</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  ₹{((data.startup_version.annual_cost || 0) / 100000).toFixed(1)}L/yr
                </p>
                <p className="text-xs text-blue-600 mt-1">{data.startup_version.description}</p>
              </div>
            )}
            {data.scale_version && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                <p className="text-sm text-purple-600 mb-1">Scale Version</p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  ₹{((data.scale_version.annual_cost || 0) / 100000).toFixed(1)}L/yr
                </p>
                <p className="text-xs text-purple-600 mt-1">{data.scale_version.description}</p>
              </div>
            )}
          </div>
        </ContentCard>
      )}

      {/* Cost Breakdown */}
      <ContentCard title="Cost Breakdown">
        <div className="space-y-3">
          {data.development_cost > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Development Cost</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₹{(data.development_cost / 100000).toFixed(1)}L
              </span>
            </div>
          )}
          {data.engineers_cost > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Engineering Team</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₹{(data.engineers_cost / 100000).toFixed(1)}L
              </span>
            </div>
          )}
          {data.cloud_cost > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Cloud Infrastructure</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₹{(data.cloud_cost / 100000).toFixed(1)}L/yr
              </span>
            </div>
          )}
          {data.ai_api_cost > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">AI APIs</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₹{(data.ai_api_cost / 100000).toFixed(1)}L/yr
              </span>
            </div>
          )}
          {data.tools_cost > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Tools & Services</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₹{(data.tools_cost / 100000).toFixed(1)}L/yr
              </span>
            </div>
          )}
          {data.operational_cost > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300">Operations</span>
              <span className="font-medium text-gray-900 dark:text-white">
                ₹{(data.operational_cost / 100000).toFixed(1)}L/yr
              </span>
            </div>
          )}
        </div>
      </ContentCard>

      {/* Total First Year Cost */}
      <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white">
        <p className="text-sm opacity-80 mb-1">Total First Year Investment</p>
        <p className="text-4xl font-bold">
          ₹{(totalFirstYear / 100000).toFixed(1)}L
        </p>
        <p className="text-sm opacity-80 mt-2">
          (~₹{(totalFirstYear / 10000000).toFixed(2)} Cr)
        </p>
      </div>

      {data.break_even_analysis && (
        <ContentCard title="Break-even Analysis">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.break_even_analysis}</p>
        </ContentCard>
      )}
    </div>
  )
}

function TimelineSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Timeline" />

  return (
    <div className="space-y-8">
      <SectionHeader title="Timeline" subtitle="Project schedule and milestones" />

      {data.mvp_timeline && (
        <ContentCard title="MVP Timeline">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Total Duration: {data.mvp_timeline.total_weeks} weeks
          </p>
          <div className="space-y-4">
            {data.mvp_timeline.key_milestones?.map((milestone: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30
                  flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-blue-600">W{milestone.week}</span>
                </div>
                <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <p className="font-medium text-gray-900 dark:text-white">{milestone.milestone}</p>
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {data.critical_path && (
        <ContentCard title="Critical Path">
          <ul className="space-y-2">
            {data.critical_path.map((item: string, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30
                  flex items-center justify-center text-xs font-bold text-red-600">{i + 1}</span>
                <span className="text-gray-700 dark:text-gray-300">{item}</span>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
    </div>
  )
}

function ImpactAnalysisSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Impact Analysis" />

  return (
    <div className="space-y-8">
      <SectionHeader title="Impact Analysis" subtitle="Expected outcomes and projections" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="User Impact" value={`${data.user_impact_score || 0}/10`} color="blue" />
        <MetricCard label="Business Impact" value={`${data.business_impact_score || 0}/10`} color="emerald" />
        <MetricCard label="Confidence" value={`${((data.confidence_score || 0) * 100).toFixed(0)}%`} color="purple" />
        <MetricCard label="Time to Value" value={data.time_to_value || 'TBD'} color="amber" />
      </div>

      <ContentCard title="User Impact">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.user_impact}</p>
      </ContentCard>

      <ContentCard title="Business Impact">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.business_impact}</p>
      </ContentCard>

      {data.competitive_advantage && (
        <ContentCard title="Competitive Advantage">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.competitive_advantage}</p>
        </ContentCard>
      )}

      {data.long_term_vision && (
        <ContentCard title="Long-term Vision">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.long_term_vision}</p>
        </ContentCard>
      )}
    </div>
  )
}

// All Sections Overview
function AllSectionsView({ data, onSectionClick }: { data: ComprehensiveStrategyResult; onSectionClick: (id: SectionId) => void }) {
  const sectionSummaries = [
    {
      id: 'prd' as SectionId,
      title: 'PRD Document',
      icon: FileText,
      summary: data.prd?.vision?.slice(0, 100) + '...' || 'Product requirements document',
      color: 'blue',
    },
    {
      id: 'problem-analysis' as SectionId,
      title: 'Problems',
      icon: AlertTriangle,
      summary: `${data.problem_analysis?.length || 0} problems identified`,
      color: 'red',
    },
    {
      id: 'feature-system' as SectionId,
      title: 'Features',
      icon: Layers,
      summary: `${data.feature_system?.length || 0} features suggested`,
      color: 'purple',
    },
    {
      id: 'development-tasks' as SectionId,
      title: 'Tasks',
      icon: CheckSquare,
      summary: `${data.development_tasks?.length || 0} development tasks`,
      color: 'emerald',
    },
    {
      id: 'cost-estimation' as SectionId,
      title: 'Cost Estimation',
      icon: IndianRupee,
      summary: `₹${((data.cost_estimation?.total_first_year || 0) / 100000).toFixed(1)}L first year`,
      color: 'amber',
    },
    {
      id: 'timeline' as SectionId,
      title: 'Timeline',
      icon: Calendar,
      summary: `${data.time_estimation?.total_weeks || 12} weeks to MVP`,
      color: 'cyan',
    },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Analysis Overview"
        subtitle="Click any section to view details"
      />

      {/* Executive Summary */}
      {data.executive_dashboard && (
        <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white">
          <h3 className="text-lg font-semibold mb-3">Executive Summary</h3>
          <p className="opacity-90 leading-relaxed">
            {data.executive_dashboard.idea_expansion?.slice(0, 300)}...
          </p>
        </div>
      )}

      {/* Section Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionSummaries.map((section) => (
          <motion.button
            key={section.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSectionClick(section.id)}
            className="p-6 bg-white dark:bg-gray-900 rounded-2xl
              border border-gray-200 dark:border-gray-800
              hover:border-gray-300 dark:hover:border-gray-700
              text-left transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl mb-4
              flex items-center justify-center
              bg-${section.color}-100 dark:bg-${section.color}-900/30`}>
              <section.icon className={`w-6 h-6 text-${section.color}-500`} />
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2
              group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {section.title}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {section.summary}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// Helper Components
function SectionHeader({ title, subtitle, onCopy }: { title: string; subtitle?: string; onCopy?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="flex items-center gap-2 px-3 py-2 rounded-lg
            text-gray-500 hover:text-gray-700
            hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
        >
          <Copy className="w-4 h-4" />
          <span className="text-sm">Copy</span>
        </button>
      )}
    </div>
  )
}

function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-amber-600',
    cyan: 'from-cyan-500 to-cyan-600',
    red: 'from-red-500 to-red-600',
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
      <p className={`text-2xl font-bold bg-gradient-to-r ${colorClasses[color] || colorClasses.blue} bg-clip-text text-transparent`}>
        {value}
      </p>
    </div>
  )
}

function EmptySection({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800
        flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No {name} Data
      </h3>
      <p className="text-gray-500 dark:text-gray-400">
        This section will be populated after analysis.
      </p>
    </div>
  )
}
