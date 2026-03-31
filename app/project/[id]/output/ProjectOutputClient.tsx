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
  History,
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

type CostIntakeState = {
  market_business: Record<string, string>
  user_scale: Record<string, string>
  feature_complexity: Record<string, string>
  technical_complexity: Record<string, string>
  infrastructure_hosting: Record<string, string>
  integrations_apis: Record<string, string>
  design_ux: Record<string, string>
  security_compliance: Record<string, string>
  development_factors: Record<string, string>
  maintenance_scaling: Record<string, string>
  performance_requirements: Record<string, string>
  business_model_impact: Record<string, string>
  product_type: Record<string, string>
  notes: string
}

type CostIntakeField = {
  key: string
  label: string
  options: string[]
}

type CostIntakeSectionConfig = {
  id: keyof Omit<CostIntakeState, 'notes'>
  title: string
  fields: CostIntakeField[]
}

const COST_INTAKE_SECTIONS: CostIntakeSectionConfig[] = [
  {
    id: 'market_business',
    title: '1. Market & Business Factors',
    fields: [
      { key: 'target_market_size', label: 'Target market size', options: ['Niche (<₹5Cr TAM)', 'Mid-size (₹5-50Cr TAM)', 'Large (₹50Cr+ TAM)'] },
      { key: 'audience_type', label: 'Audience type', options: ['B2C', 'B2B', 'Hybrid B2B2C'] },
      { key: 'monetization_model', label: 'Monetization model', options: ['Subscription', 'Freemium', 'Marketplace/Transaction'] },
      { key: 'competition_level', label: 'Competition level', options: ['Low', 'Medium', 'High'] },
      { key: 'launch_geography', label: 'Launch geography', options: ['Single city/region', 'India-wide', 'Multi-country'] },
    ],
  },
  {
    id: 'user_scale',
    title: '2. User & Scale Factors',
    fields: [
      { key: 'expected_users', label: 'Expected DAU/MAU', options: ['Early-stage (<10k MAU)', 'Growth (10k-100k MAU)', 'Scale (100k+ MAU)'] },
      { key: 'concurrent_users', label: 'Concurrent users', options: ['Low (<500)', 'Medium (500-5k)', 'High (5k+)'] },
      { key: 'growth_expectation', label: 'Growth expectation', options: ['Steady', 'Fast', 'Aggressive'] },
      { key: 'user_roles', label: 'User roles', options: ['Single role', '2-3 roles', '4+ roles'] },
      { key: 'retention_needs', label: 'Retention focus', options: ['Basic', 'Moderate', 'Critical'] },
    ],
  },
  {
    id: 'feature_complexity',
    title: '3. Feature Complexity',
    fields: [
      { key: 'basic_features', label: 'Basic features scope', options: ['Few essentials', 'Moderate set', 'Extensive'] },
      { key: 'advanced_features', label: 'Advanced features', options: ['Minimal', 'Moderate', 'Heavy'] },
      { key: 'ai_features', label: 'AI/recommendation features', options: ['None', 'Basic AI', 'Advanced AI'] },
      { key: 'realtime_features', label: 'Realtime requirements', options: ['None', 'Some realtime', 'Core realtime'] },
      { key: 'integrations_complexity', label: 'Integrations complexity', options: ['1-2 simple integrations', '3-5 moderate integrations', '6+ complex integrations'] },
      { key: 'automation_level', label: 'Automation level', options: ['Low', 'Medium', 'High'] },
    ],
  },
  {
    id: 'technical_complexity',
    title: '4. Technical Complexity',
    fields: [
      { key: 'frontend_complexity', label: 'Frontend complexity', options: ['Basic CRUD UI', 'Interactive app UI', 'Complex real-time UI'] },
      { key: 'backend_complexity', label: 'Backend complexity', options: ['Simple APIs', 'Moderate services', 'Complex distributed services'] },
      { key: 'database_complexity', label: 'Database complexity', options: ['Simple relational', 'Relational + analytics', 'Multi-model + heavy scaling'] },
      { key: 'ai_ml_level', label: 'AI/ML level', options: ['No custom ML', 'Prompt + API orchestration', 'Custom model workflows'] },
      { key: 'security_level', label: 'Security level', options: ['Standard auth', 'Enhanced security', 'Enterprise-grade controls'] },
    ],
  },
  {
    id: 'infrastructure_hosting',
    title: '5. Infrastructure & Hosting',
    fields: [
      { key: 'cloud_preference', label: 'Cloud provider', options: ['Any cost-effective option', 'Google Cloud', 'AWS/Azure'] },
      { key: 'hosting_scale', label: 'Hosting scale', options: ['MVP', 'Growth', 'Scale-ready'] },
      { key: 'storage_bandwidth', label: 'Storage/bandwidth', options: ['Low', 'Moderate', 'High'] },
      { key: 'cdn_autoscaling', label: 'CDN/autoscaling', options: ['Not required', 'Recommended', 'Required from day 1'] },
    ],
  },
  {
    id: 'integrations_apis',
    title: '6. Integrations & APIs',
    fields: [
      { key: 'payment', label: 'Payment integration', options: ['None', 'Single gateway', 'Multiple gateways'] },
      { key: 'maps_location', label: 'Maps/location', options: ['None', 'Basic geolocation', 'Advanced mapping + routing'] },
      { key: 'communication', label: 'SMS/email/notifications', options: ['Email only', 'Email + SMS', 'Multi-channel + automation'] },
      { key: 'ai_apis', label: 'AI APIs', options: ['None', 'Basic AI usage', 'Advanced AI usage'] },
      { key: 'social_login', label: 'Social login', options: ['Not needed', '1 provider', 'Multiple providers'] },
      { key: 'domain_integrations', label: 'Domain integrations', options: ['None', 'Calendar/Wearables/CRM', 'Multiple deep integrations'] },
    ],
  },
  {
    id: 'design_ux',
    title: '7. Design & UX Quality',
    fields: [
      { key: 'design_quality', label: 'Design quality target', options: ['Basic', 'Standard', 'Premium'] },
      { key: 'animations', label: 'Animations and motion', options: ['Minimal', 'Moderate', 'Rich interactive motion'] },
      { key: 'accessibility', label: 'Accessibility target', options: ['Basic', 'WCAG AA focused', 'WCAG AA+ with audits'] },
      { key: 'responsiveness', label: 'Responsiveness scope', options: ['Desktop-first', 'Responsive web', 'Web + mobile parity'] },
    ],
  },
  {
    id: 'security_compliance',
    title: '8. Security & Compliance',
    fields: [
      { key: 'auth_level', label: 'Auth level', options: ['Email/password', 'OAuth + RBAC', 'Enterprise SSO + granular RBAC'] },
      { key: 'encryption', label: 'Encryption requirements', options: ['At rest only', 'At rest + in transit', 'Enhanced encryption + key controls'] },
      { key: 'compliance', label: 'Compliance requirements', options: ['None', 'Basic legal/privacy', 'Regulated compliance'] },
      { key: 'backup_disaster_recovery', label: 'Backup/DR', options: ['Basic daily backup', 'Automated backup + restore drills', 'High-availability DR plan'] },
    ],
  },
  {
    id: 'development_factors',
    title: '9. Development Factors',
    fields: [
      { key: 'team_mode', label: 'Team setup', options: ['Solo/lean', 'Small team', 'Full cross-functional team'] },
      { key: 'seniority', label: 'Team seniority', options: ['Junior-heavy', 'Balanced mid-level', 'Senior-heavy'] },
      { key: 'delivery_speed', label: 'Delivery speed', options: ['Steady', 'Balanced', 'Aggressive'] },
      { key: 'stack_preference', label: 'Stack preference', options: ['Use existing stack', 'Flexible stack', 'Specific custom stack'] },
    ],
  },
  {
    id: 'maintenance_scaling',
    title: '10. Maintenance & Scaling',
    fields: [
      { key: 'bug_fixing', label: 'Bug-fix coverage', options: ['Basic', 'Moderate', 'High'] },
      { key: 'update_frequency', label: 'Update frequency', options: ['Monthly', 'Bi-weekly', 'Weekly'] },
      { key: 'support_level', label: 'Support level', options: ['Business hours', 'Extended hours', '24x7'] },
      { key: 'scaling_plan', label: 'Scaling plan', options: ['Later', 'Planned in growth phase', 'Built from MVP'] },
      { key: 'monitoring_logging', label: 'Monitoring/logging', options: ['Basic logs', 'Monitoring + alerts', 'Full observability'] },
    ],
  },
  {
    id: 'performance_requirements',
    title: '11. Performance Requirements',
    fields: [
      { key: 'page_speed', label: 'Page speed target', options: ['Good enough', '<2.5s', '<1.5s'] },
      { key: 'realtime_response', label: 'Realtime response target', options: ['Not critical', '<2s updates', 'Sub-second updates'] },
      { key: 'uptime_sla', label: 'Uptime target', options: ['99.0%', '99.5%', '99.9%+'] },
      { key: 'optimization_level', label: 'Optimization intensity', options: ['Basic', 'Moderate', 'High'] },
    ],
  },
  {
    id: 'business_model_impact',
    title: '12. Business Model Impact',
    fields: [
      { key: 'business_model', label: 'Business model', options: ['SaaS subscription', 'Freemium', 'Marketplace / transaction'] },
    ],
  },
  {
    id: 'product_type',
    title: '13. Product Type',
    fields: [
      { key: 'product_type', label: 'Product type', options: ['Web app', 'SaaS platform', 'AI platform'] },
    ],
  },
]

const createEmptyCostIntake = (): CostIntakeState => ({
  market_business: {},
  user_scale: {},
  feature_complexity: {},
  technical_complexity: {},
  infrastructure_hosting: {},
  integrations_apis: {},
  design_ux: {},
  security_compliance: {},
  development_factors: {},
  maintenance_scaling: {},
  performance_requirements: {},
  business_model_impact: {},
  product_type: {},
  notes: '',
})

const normalizeCostIntakeState = (raw: any): CostIntakeState => {
  const base = createEmptyCostIntake()
  if (!raw || typeof raw !== 'object') {
    return base
  }

  for (const section of COST_INTAKE_SECTIONS) {
    const bucket = raw[section.id]
    if (bucket && typeof bucket === 'object' && !Array.isArray(bucket)) {
      const normalized: Record<string, string> = {}
      for (const [key, value] of Object.entries(bucket)) {
        if (typeof value === 'string' && value.trim()) {
          normalized[key] = value.trim()
        }
      }
      ;(base as any)[section.id] = normalized
    }
  }

  if (typeof raw.notes === 'string') {
    base.notes = raw.notes.trim()
  }

  return base
}

const hasCostIntakeSelections = (intake: CostIntakeState) => {
  return COST_INTAKE_SECTIONS.some((section) => Object.keys(intake[section.id] || {}).length > 0)
}

const normalizeScoreOutOfTen = (value: unknown, fallback = 0) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  if (numeric <= 10) return Number(Math.max(0, Math.min(10, numeric)).toFixed(1))
  if (numeric <= 100) return Number((numeric / 10).toFixed(1))
  return 10
}

interface ProjectOutputClientProps {
  project: Project
  user: {
    id: string
    email?: string | null
  }
  initialInput: string
  outputLength: OutputLength
  shouldGenerate: boolean
  initialAnalysis?: Partial<ComprehensiveStrategyResult> | null
  initialAnalysisId?: string | null
  initialAnalysisSessionId?: string | null
}

interface StructuredChatAnswer {
  direct_answer: string
  key_insights: string[]
  recommended_action: string[]
  risks_notes: string[]
  next_step: string[]
}

interface ChatPanelMessage {
  role: 'user' | 'assistant'
  content: string
  structured?: StructuredChatAnswer | null
}

type AnalysisResultState = Partial<ComprehensiveStrategyResult> & {
  overview_summary?: {
    product_name?: string
    one_line_summary?: string
    core_value_props?: string[]
    critical_unknowns?: string[]
  }
  metadata?: {
    analysis_id?: string
    provider?: string
    generated_sections?: string[]
    section_providers?: Record<string, string>
    source_input?: string
    detail_level?: string
    input_hash?: string
    section_input_hashes?: Record<string, string>
    stale_sections?: string[]
    saved_analysis_id?: string
    cost_intake?: CostIntakeState
    [key: string]: any
  }
  saved_id?: string
  provider?: string
  generation_mode?: string
  time_planning?: any
}

export default function ProjectOutputClient({
  project,
  user,
  initialInput,
  outputLength,
  shouldGenerate,
  initialAnalysis,
  initialAnalysisId,
  initialAnalysisSessionId,
}: ProjectOutputClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const incomingAnalysisResult = shouldGenerate
    ? null
    : ((initialAnalysis as AnalysisResultState | null) || null)
  const incomingAnalysisId =
    initialAnalysisId ||
    incomingAnalysisResult?.metadata?.saved_analysis_id ||
    incomingAnalysisResult?.saved_id ||
    null
  const incomingAnalysisSessionId =
    initialAnalysisSessionId ||
    ((incomingAnalysisResult?.metadata?.session_id as string | null) || null)

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true) // Start collapsed like dashboard
  const [activeSection, setActiveSection] = useState<SectionId>('all')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState('')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultState | null>(
    incomingAnalysisResult
  )
  const [analysisId, setAnalysisId] = useState<string | null>(incomingAnalysisId)
  const [analysisSessionId, setAnalysisSessionId] = useState<string | null>(
    incomingAnalysisSessionId
  )
  const [error, setError] = useState<string | null>(null)
  const [loadingSections, setLoadingSections] = useState<Partial<Record<SectionId, boolean>>>({})
  const [costIntake, setCostIntake] = useState<CostIntakeState>(() =>
    normalizeCostIntakeState((initialAnalysis as any)?.metadata?.cost_intake)
  )
  const [showCostIntake, setShowCostIntake] = useState(false)

  // Chat state - Right side panel with fullscreen mode
  const [chatPanelOpen, setChatPanelOpen] = useState(false)
  const [chatFullscreen, setChatFullscreen] = useState(false)
  const [chatZoomLevel, setChatZoomLevel] = useState(1) // 1 = normal, 0.8 = zoom out, 1.2 = zoom in
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatPanelMessage[]>([])
  const [isChatStreaming, setIsChatStreaming] = useState(false)

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Request-in-flight lock to prevent duplicate requests (React Strict Mode / fast re-renders)
  const generationStartedRef = useRef(false)
  const requestIdRef = useRef<string | null>(null)
  const mountedRef = useRef(false)
  const hasGeneratedRef = useRef(false) // Track if we've ever generated in this session
  const sectionRequestRef = useRef<Set<SectionId>>(new Set())
  const lastSyncedViewKeyRef = useRef<string | null>(null)

  const isOverviewReady = useCallback((result: AnalysisResultState | null) => {
    if (!result) return false
    return Boolean(
      result.executive_dashboard ||
      (result as any).overview_summary
    )
  }, [])

  const isPrdComplete = useCallback((prd: any) => {
    if (!prd || typeof prd !== 'object') return false
    const hasItems = (value: any) => Array.isArray(value) && value.length > 0
    return Boolean(
      prd.product_overview?.product_name &&
      prd.product_overview?.problem_statement &&
      hasItems(prd.objectives_goals?.business_goals) &&
      hasItems(prd.target_users_personas?.user_segments) &&
      prd.problem_statement_structured &&
      hasItems(prd.scope?.in_scope) &&
      hasItems(prd.features_requirements?.functional_requirements) &&
      hasItems(prd.user_stories) &&
      hasItems(prd.user_flow_journey) &&
      hasItems(prd.wireframes_mockups?.screens) &&
      hasItems(prd.acceptance_criteria) &&
      hasItems(prd.success_metrics) &&
      hasItems(prd.risks_assumptions?.risks) &&
      hasItems(prd.risks_assumptions?.assumptions) &&
      hasItems(prd.dependencies) &&
      hasItems(prd.timeline_milestones) &&
      hasItems(prd.release_plan?.phases) &&
      hasItems(prd.constraints) &&
      hasItems(prd.compliance_legal) &&
      hasItems(prd.stakeholders) &&
      hasItems(prd.open_questions) &&
      hasItems(prd.appendix?.research_assumptions) &&
      hasItems(prd.appendix?.competitor_notes) &&
      hasItems(prd.appendix?.references)
    )
  }, [])

  const hasSectionContent = useCallback((section: SectionId, result: AnalysisResultState | null = analysisResult) => {
    if (!result) return false

    switch (section) {
      case 'all':
        return isOverviewReady(result)
      case 'executive-dashboard':
        return !!result.executive_dashboard
      case 'problem-analysis':
        return Array.isArray(result.problem_analysis) && result.problem_analysis.length > 0
      case 'feature-system':
        return Array.isArray(result.feature_system) && result.feature_system.length > 0
      case 'gaps-opportunities':
        return !!result.gaps_opportunities
      case 'prd':
        return !!result.prd
      case 'system-design':
        return !!result.system_design
      case 'development-tasks':
        return Array.isArray(result.development_tasks) && result.development_tasks.length > 0
      case 'execution-roadmap':
        return !!result.execution_roadmap
      case 'manpower-planning':
        return !!result.manpower_planning
      case 'resources':
        return !!result.resource_requirements
      case 'cost-estimation':
        return !!result.cost_estimation
      case 'timeline':
        return !!result.time_estimation || !!result.time_planning
      case 'impact-analysis':
        return !!result.impact_analysis
      default:
        return false
    }
  }, [analysisResult, isOverviewReady])

  const isSectionFresh = useCallback(
    (section: SectionId, result: AnalysisResultState | null = analysisResult) => {
      if (!result || !hasSectionContent(section, result)) {
        return false
      }

      const inputSample = (result.metadata?.source_input || initialInput || '') as string
      const minimumCount = inputSample.trim().length >= 80 ? 10 : 8

      if (section === 'problem-analysis') {
        return Array.isArray(result.problem_analysis) && result.problem_analysis.length >= minimumCount
      }

      if (section === 'feature-system') {
        return Array.isArray(result.feature_system) && result.feature_system.length >= minimumCount
      }

      if (section === 'prd') {
        return isPrdComplete(result.prd)
      }

      if (
        section === 'all' ||
        section === 'executive-dashboard'
      ) {
        return true
      }

      const inputHash = result.metadata?.input_hash
      const sectionInputHash = result.metadata?.section_input_hashes?.[section]
      const isStale = result.metadata?.stale_sections?.includes(section) === true

      if (!inputHash || !sectionInputHash) {
        return !isStale
      }

      return sectionInputHash === inputHash && !isStale
    },
    [analysisResult, hasSectionContent, initialInput, isPrdComplete]
  )

  // Clean URL after generation to prevent re-triggers on refresh/navigation
  const cleanUrlParams = useCallback((savedAnalysisId?: string | null) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('generate')
      if (savedAnalysisId) {
        url.searchParams.set('analysis', savedAnalysisId)
      }
      window.history.replaceState({}, '', url.toString())
      console.log('[PMCopilot] Cleaned URL params - removed generate flag')
    }
  }, [])

  // Generate analysis on mount if shouldGenerate is true
  // FIX: Use ref to prevent duplicate calls - removed isGenerating from deps
  useEffect(() => {
    // Track mount state to prevent double-execution in Strict Mode
    if (mountedRef.current) {
      console.log('[PMCopilot] Skip duplicate mount execution (Strict Mode)')
      return // Already mounted, skip duplicate execution
    }
    mountedRef.current = true

    // Only generate if:
    // 1. shouldGenerate flag is true (from URL params)
    // 2. We have input to analyze
    // 3. No existing result
    // 4. Generation hasn't been started yet in this mount cycle
    // 5. Haven't generated before in this session
    if (
      shouldGenerate && 
      initialInput && 
      !analysisResult && 
      !generationStartedRef.current &&
      !hasGeneratedRef.current
    ) {
      // Set refs immediately to block any concurrent calls
      generationStartedRef.current = true
      hasGeneratedRef.current = true
      const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      requestIdRef.current = reqId
      console.log(`[PMCopilot] Starting generation (${reqId})`, {
        shouldGenerate,
        inputLength: initialInput.length,
        outputLength,
      })
      handleGenerate(reqId)
    } else if (shouldGenerate && (generationStartedRef.current || hasGeneratedRef.current)) {
      console.log('[PMCopilot] Generation already started/completed, skipping duplicate trigger')
      cleanUrlParams(analysisId) // Clean URL even if we skip
    }

    // Cleanup: Reset on unmount
    return () => {
      mountedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run on mount

  useEffect(() => {
    if (shouldGenerate) {
      lastSyncedViewKeyRef.current = null
      return
    }

    const nextSyncKey = [
      project.id,
      incomingAnalysisSessionId || '',
      incomingAnalysisId || '',
    ].join('|')

    if (lastSyncedViewKeyRef.current === nextSyncKey) {
      return
    }
    lastSyncedViewKeyRef.current = nextSyncKey

    setAnalysisResult(incomingAnalysisResult)
    setAnalysisId(incomingAnalysisId)
    setAnalysisSessionId(incomingAnalysisSessionId)
    setError(null)
    setLoadingSections({})
    setCostIntake(normalizeCostIntakeState((incomingAnalysisResult as any)?.metadata?.cost_intake))
    sectionRequestRef.current.clear()
  }, [
    incomingAnalysisId,
    incomingAnalysisResult,
    incomingAnalysisSessionId,
    project.id,
    shouldGenerate,
  ])

  useEffect(() => {
    if (analysisResult?.metadata?.cost_intake) {
      setCostIntake(normalizeCostIntakeState(analysisResult.metadata.cost_intake))
    }
  }, [analysisResult?.metadata?.cost_intake])

  const handleGenerate = async (requestId?: string) => {
    const reqId = requestId || requestIdRef.current || `req-${Date.now()}`
    
    if (!initialInput.trim()) {
      showToast('No input provided', 'error')
      generationStartedRef.current = false
      return
    }

    // Double-check we're not already generating (belt and suspenders)
    if (isGenerating) {
      console.log(`[PMCopilot] Duplicate request blocked (${reqId}) - already generating`)
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationProgress('Generating AI overview...')
    console.log(`[PMCopilot] API call starting (${reqId})`, {
      inputLength: initialInput.length,
      outputLength,
      projectId: project.id
    })

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Request-Id': reqId, // Pass request ID for server-side logging
        },
        body: JSON.stringify({
          feedback: initialInput.trim(),
          project_id: project.id,
          detail_level: outputLength,
          reuse_cached: true,
          context: {
            project_name: project.name,
            project_context: project.description,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Analysis failed with status ${response.status}`)
      }

      const result = await response.json()

      if (result.success === false) {
        throw new Error(result.error || 'Analysis failed')
      }

      const analysisData = result.data || result
      const savedId =
        analysisData.saved_id ||
        analysisData.metadata?.saved_analysis_id ||
        result.saved_id ||
        null
      const savedSessionId =
        analysisData.metadata?.session_id ||
        analysisData.session_id ||
        null

      setAnalysisResult(analysisData)
      setAnalysisId(savedId)
      setAnalysisSessionId(savedSessionId)
      setGenerationProgress('')
      
      const provider = analysisData.provider || result.provider || 'unknown'
      console.log(`[PMCopilot] Analysis complete (${reqId})`, {
        provider,
        problemsCount: analysisData.problem_analysis?.length || 0,
        featuresCount: analysisData.feature_system?.length || 0,
        tasksCount: analysisData.development_tasks?.length || 0,
      })
      
      showToast(
        provider === 'gemini'
          ? 'AI overview is ready. Open any section to generate only that section.'
          : `Analysis complete!`,
        'success'
      )
      
      cleanUrlParams(savedId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      console.error(`[PMCopilot] Analysis error (${reqId}):`, message)
      setError(message)
      showToast(message, 'error')
      // Allow retry on error
      generationStartedRef.current = false
      hasGeneratedRef.current = false // Allow retry
      
      cleanUrlParams(analysisId)
    } finally {
      setIsGenerating(false)
    }
  }

  const loadSection = useCallback(async (
    section: SectionId,
    options?: { force?: boolean; costIntake?: CostIntakeState }
  ) => {
    if (
      section === 'all' ||
      section === 'executive-dashboard'
    ) {
      return
    }

    if (!analysisId) {
      showToast('Generate the AI overview first', 'error')
      return
    }

    if (isSectionFresh(section) || loadingSections[section] || sectionRequestRef.current.has(section)) {
      return
    }

    sectionRequestRef.current.add(section)
    setLoadingSections(prev => ({ ...prev, [section]: true }))
    setGenerationProgress(`Generating ${SECTIONS.find(s => s.id === section)?.label || section} with AI...`)

    try {
      const effectiveCostIntake = options?.costIntake || costIntake
      const includeCostIntake =
        (section === 'cost-estimation' ||
          section === 'timeline' ||
          section === 'manpower-planning') &&
        hasCostIntakeSelections(effectiveCostIntake)

      const requestPayload = {
        section,
        analysis_id: analysisId,
        feedback: initialInput.trim() || undefined,
        force: options?.force === true,
        detail_level: outputLength,
        context: {
          project_name: project.name,
          project_context: project.description,
        },
        cost_intake: includeCostIntake ? effectiveCostIntake : undefined,
      }

      const endpoints = [
        `/api/analyze/${analysisId}/section`,
        '/api/analyze/section',
      ]

      let payload: any = null
      let provider = 'gemini'
      let resolvedAnalysisId = analysisId
      let updatedResult: AnalysisResultState | null = null

      for (let index = 0; index < endpoints.length; index++) {
        const endpoint = endpoints[index]
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': `section-${Date.now()}-${section}`,
          },
          body: JSON.stringify(requestPayload),
        })

        const contentType = response.headers.get('content-type') || ''
        payload = contentType.includes('application/json')
          ? await response.json().catch(() => ({}))
          : {}

        if (response.ok && payload.success !== false) {
          provider = payload.data?.provider || payload.provider || 'gemini'
          resolvedAnalysisId = payload.data?.analysis_id || analysisId
          updatedResult = (payload.data?.result || payload.result || null) as AnalysisResultState | null
          break
        }

        const message =
          payload?.error ||
          payload?.message ||
          `Failed to generate ${section} (status ${response.status})`

        if (response.status === 404 && index === 0) {
          console.warn(`[PMCopilot] Primary section route 404, falling back to /api/analyze/section for ${section}`)
          continue
        }

        throw new Error(message)
      }

      if (!updatedResult) {
        throw new Error(`Failed to generate ${section}`)
      }

      if (!hasSectionContent(section, updatedResult)) {
        throw new Error(
          `${SECTIONS.find(s => s.id === section)?.label || section} generation returned empty data. Please retry.`
        )
      }

      setAnalysisResult(updatedResult)
      setAnalysisId(resolvedAnalysisId)
      setAnalysisSessionId(
        (updatedResult?.metadata?.session_id as string | null) || analysisSessionId
      )
      cleanUrlParams(resolvedAnalysisId)

      showToast(`${SECTIONS.find(s => s.id === section)?.label || section} generated via ${provider}`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to generate ${section}`
      console.error(`[PMCopilot] Section generation error (${section}):`, message)
      showToast(message, 'error')
    } finally {
      sectionRequestRef.current.delete(section)
      setLoadingSections(prev => ({ ...prev, [section]: false }))
      setGenerationProgress('')
    }
  }, [analysisId, analysisSessionId, cleanUrlParams, costIntake, hasSectionContent, initialInput, isSectionFresh, loadingSections, outputLength, project.description, project.name, showToast])

  const handleSectionChange = useCallback((section: SectionId) => {
    setActiveSection(section)

    if (section === 'cost-estimation') {
      const hasCurrentCostData = hasSectionContent('cost-estimation')
      const hasSelections = hasCostIntakeSelections(costIntake)
      setShowCostIntake(!hasCurrentCostData || !hasSelections)
      if (!hasSelections) {
        return
      }
    } else {
      setShowCostIntake(false)
    }

    if (!isSectionFresh(section)) {
      void loadSection(section)
    }
  }, [costIntake, hasSectionContent, isSectionFresh, loadSection])

  const handleCostIntakeSubmit = useCallback(async () => {
    if (!analysisId) {
      showToast('Generate the overview first', 'error')
      return
    }

    setAnalysisResult((prev) =>
      prev
        ? ({
            ...prev,
            metadata: {
              ...(prev.metadata || {}),
              cost_intake: costIntake,
            },
          } as AnalysisResultState)
        : prev
    )

    setShowCostIntake(false)
    await loadSection('cost-estimation', { force: true, costIntake })
  }, [analysisId, costIntake, loadSection, showToast])

  const buildChatAnalysisContext = useCallback((result: AnalysisResultState | null) => {
    if (!result) {
      return null
    }

    return {
      executive_dashboard: result.executive_dashboard
        ? {
            key_insight: result.executive_dashboard.key_insight,
            recommended_strategy: result.executive_dashboard.recommended_strategy,
          }
        : null,
      problem_analysis: (result.problem_analysis || []).slice(0, 8).map((problem) => ({
        id: problem.id,
        title: problem.title,
        severity_score: problem.severity_score,
        business_impact: problem.business_impact,
      })),
      feature_system: (result.feature_system || []).slice(0, 10).map((feature) => ({
        id: feature.id,
        name: feature.name || feature.title,
        category: feature.category,
        complexity: feature.complexity,
        user_value: feature.user_value,
      })),
      prd: result.prd || null,
      development_tasks: (result.development_tasks || []).slice(0, 12).map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        estimated_time: task.estimated_time,
      })),
      manpower_planning: result.manpower_planning || null,
      cost_estimation: result.cost_estimation || null,
      time_estimation: result.time_estimation || result.time_planning || null,
      impact_analysis: result.impact_analysis || null,
      metadata: {
        input_hash: result.metadata?.input_hash,
        detail_level: result.metadata?.detail_level,
        cost_intake: result.metadata?.cost_intake,
      },
    }
  }, [])

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatStreaming) return

    const userMessage = chatInput.trim()
    setChatInput('')

    // Add user message immediately
    const newUserMessage = { role: 'user' as const, content: userMessage }
    setChatMessages(prev => [...prev, newUserMessage])
    setIsChatStreaming(true)

    try {
      const analysisContext = buildChatAnalysisContext(analysisResult)

      const response = await fetch('/api/chat-first', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          depth: 'medium',
          section: activeSection,
          projectId: project.id,
          projectName: project.name,
          projectIdea: analysisResult?.metadata?.source_input || initialInput || '',
          analysis: analysisContext,
          history: chatMessages.slice(-6).map(({ role, content }) => ({ role, content })),
        }),
      })

      if (!response.ok) throw new Error('Chat failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let assistantMessage = ''
      let structuredAnswer: StructuredChatAnswer | null = null
      let sseBuffer = ''
      setChatMessages(prev => [...prev, { role: 'assistant', content: '', structured: null }])

      const normalizeStructured = (value: any): StructuredChatAnswer => ({
        direct_answer: typeof value?.direct_answer === 'string' ? value.direct_answer : '',
        key_insights: Array.isArray(value?.key_insights) ? value.key_insights.map(String).filter(Boolean) : [],
        recommended_action: Array.isArray(value?.recommended_action) ? value.recommended_action.map(String).filter(Boolean) : [],
        risks_notes: Array.isArray(value?.risks_notes) ? value.risks_notes.map(String).filter(Boolean) : [],
        next_step: Array.isArray(value?.next_step) ? value.next_step.map(String).filter(Boolean) : [],
      })

      const updateAssistantMessage = () => {
        setChatMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: assistantMessage,
            structured: structuredAnswer,
          }
          return updated
        })
      }

      const handleSseEvent = (rawEvent: string) => {
        const lines = rawEvent
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload || payload === '[DONE]') continue

          const parsed = JSON.parse(payload)

          if (typeof parsed.content === 'string') {
            assistantMessage += parsed.content
          }

          if (parsed.structured && typeof parsed.structured === 'object') {
            structuredAnswer = normalizeStructured(parsed.structured)
          }

          if (parsed.error) {
            throw new Error(parsed.error)
          }

          updateAssistantMessage()
        }
      }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        sseBuffer += decoder.decode(value, { stream: true })
        const events = sseBuffer.split('\n\n')
        sseBuffer = events.pop() || ''

        for (const event of events) {
          if (!event.trim()) continue
          handleSseEvent(event)
        }
      }

      if (sseBuffer.trim()) {
        handleSseEvent(sseBuffer)
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

    const renderUnknown = (value: unknown) => {
      if (value === null || value === undefined) return ''
      if (typeof value === 'string') return value
      if (typeof value === 'number' || typeof value === 'boolean') return String(value)
      return JSON.stringify(value, null, 2)
    }

    const title =
      (analysisResult.metadata?.session_title as string | undefined) ||
      (analysisResult.overview_summary?.product_name
        ? `Analysis - ${analysisResult.overview_summary.product_name}`
        : `${project.name} - AI Product Strategy Analysis`)
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
      const innovationScore = normalizeScoreOutOfTen(
        analysisResult.executive_dashboard.innovation_score,
        0
      )
      content += `## Executive Dashboard\n\n`
      content += `**Innovation Score:** ${innovationScore.toFixed(1)}/10\n`
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
        const productOverview = (analysisResult.prd as any).product_overview || {}
        if (productOverview.product_name) {
          content += `### Product Name\n${productOverview.product_name}\n\n`
        }
        if (productOverview.one_line_summary) {
          content += `### One-line Summary\n${productOverview.one_line_summary}\n\n`
        }
        if (productOverview.vision || analysisResult.prd.vision) {
          content += `### Vision\n${productOverview.vision || analysisResult.prd.vision}\n\n`
        }
        if (analysisResult.prd.mission || productOverview.one_line_summary) {
          content += `### Mission\n${analysisResult.prd.mission || productOverview.one_line_summary}\n\n`
        }
        if (productOverview.problem_statement || analysisResult.prd.problem_statement) {
          content += `### Problem Statement\n${productOverview.problem_statement || analysisResult.prd.problem_statement}\n\n`
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
        if (task.why_this_task_matters) {
          content += `**Why This Matters:** ${task.why_this_task_matters}\n\n`
        }
        if (task.owner_role) {
          content += `**Owner Role:** ${task.owner_role}\n\n`
        }
        if (Array.isArray(task.linked_features) && task.linked_features.length > 0) {
          content += `**Linked Features:** ${task.linked_features.join(', ')}\n\n`
        }
        if (Array.isArray(task.section_dependencies) && task.section_dependencies.length > 0) {
          content += `**Section Dependencies:** ${task.section_dependencies.join(', ')}\n\n`
        }
        if (Array.isArray(task.dependencies) && task.dependencies.length > 0) {
          content += `**Task Dependencies:** ${task.dependencies.join(', ')}\n\n`
        }
        if (task.detailed_steps && task.detailed_steps.length > 0) {
          content += `**Implementation Steps:**\n`
          task.detailed_steps.forEach((step, stepIndex) => {
            content += `${stepIndex + 1}. ${step}\n`
          })
          content += `\n`
        }
        if (Array.isArray(task.deliverables) && task.deliverables.length > 0) {
          content += `**Deliverables:**\n`
          task.deliverables.forEach((deliverable, deliverableIndex) => {
            content += `${deliverableIndex + 1}. ${deliverable}\n`
          })
          content += `\n`
        }
        if (Array.isArray(task.done_criteria) && task.done_criteria.length > 0) {
          content += `**Done Criteria:**\n`
          task.done_criteria.forEach((criterion, criterionIndex) => {
            content += `${criterionIndex + 1}. ${criterion}\n`
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
          analysisResult.time_planning.mvp_timeline.key_milestones.forEach((milestone: any, index: number) => {
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
        content += `**User Impact Score:** ${normalizeScoreOutOfTen(analysisResult.impact_analysis.user_impact_score, 0).toFixed(1)}/10\n\n`
      }
      if (analysisResult.impact_analysis.business_impact_score) {
        content += `**Business Impact Score:** ${normalizeScoreOutOfTen(analysisResult.impact_analysis.business_impact_score, 0).toFixed(1)}/10\n\n`
      }
      if (analysisResult.impact_analysis.user_impact) {
        content += `### User Impact\n${analysisResult.impact_analysis.user_impact}\n\n`
      }
      if (analysisResult.impact_analysis.business_impact) {
        content += `### Business Impact\n${analysisResult.impact_analysis.business_impact}\n\n`
      }
    }

    // Include all remaining generated sections that are not yet covered above.
    const supplementalSections: Array<{ key: string; heading: string }> = [
      { key: 'gaps_opportunities', heading: 'Gaps & Opportunities' },
      { key: 'execution_roadmap', heading: 'Execution Roadmap' },
      { key: 'manpower_planning', heading: 'Manpower Planning' },
      { key: 'resource_requirements', heading: 'Resource Requirements' },
      { key: 'resources', heading: 'Resources' },
      { key: 'cost_estimation', heading: 'Cost Estimation' },
      { key: 'time_estimation', heading: 'Timeline' },
    ]

    supplementalSections.forEach((section) => {
      if (section.key === 'cost_estimation' && (analysisResult as any).cost_planning) return
      if (section.key === 'time_estimation' && (analysisResult as any).time_planning) return
      const value = (analysisResult as any)?.[section.key]
      if (!value) return

      content += `## ${section.heading}\n\n`
      if (typeof value === 'string') {
        content += `${value}\n\n`
      } else {
        content += `\`\`\`json\n${renderUnknown(value)}\n\`\`\`\n\n`
      }
    })

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
    const firstLoadingSectionEntry = Object.entries(loadingSections).find(([, loading]) => loading)
    const sectionInFlight = (firstLoadingSectionEntry?.[0] as SectionId | undefined) || activeSection
    const hasSectionGenerationInFlight = Boolean(firstLoadingSectionEntry)

    if (isGenerating) {
      return <GeneratingState progress={generationProgress} section="all" />
    }

    if (hasSectionGenerationInFlight) {
      return <GeneratingState progress={generationProgress} section={sectionInFlight} />
    }

    if (error) {
      return <ErrorState message={error} onRetry={handleGenerate} />
    }

    if (!analysisResult) {
      return <EmptyState input={initialInput} onGenerate={handleGenerate} />
    }

    // Defensive check: ensure key data structures are arrays
    const hasValidData =
      isOverviewReady(analysisResult) ||
      (Array.isArray(analysisResult.problem_analysis) && analysisResult.problem_analysis.length > 0) ||
      (Array.isArray(analysisResult.feature_system) && analysisResult.feature_system.length > 0) ||
      !!analysisResult.prd ||
      !!analysisResult.system_design ||
      !!analysisResult.execution_roadmap ||
      !!analysisResult.manpower_planning ||
      !!analysisResult.resource_requirements ||
      !!analysisResult.cost_estimation ||
      !!analysisResult.time_estimation ||
      !!analysisResult.impact_analysis ||
      Array.isArray(analysisResult.development_tasks);
    
    if (!hasValidData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md p-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Analysis Data Processing
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                  The analysis data is being normalized. Please refresh the page in a moment or generate a new analysis.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'prd':
        return <PRDSection data={analysisResult.prd} onCopy={handleCopySection} />
      case 'executive-dashboard':
        return <ExecutiveDashboardSection data={analysisResult.executive_dashboard} />
      case 'problem-analysis':
        return <ProblemAnalysisSection data={analysisResult.problem_analysis || []} />
      case 'feature-system':
        return <FeatureSystemSection data={analysisResult.feature_system || []} />
      case 'gaps-opportunities':
        return <GapsOpportunitiesSection data={analysisResult.gaps_opportunities} />
      case 'system-design':
        return <SystemDesignSection data={analysisResult.system_design} />
      case 'development-tasks':
        return <DevelopmentTasksSection data={analysisResult.development_tasks || []} />
      case 'execution-roadmap':
        return <ExecutionRoadmapSection data={analysisResult.execution_roadmap} />
      case 'manpower-planning':
        return <ManpowerPlanningSection data={analysisResult.manpower_planning} />
      case 'resources':
        return <ResourcesSection data={analysisResult.resource_requirements} />
      case 'cost-estimation':
        return (
          <CostEstimationSection
            data={analysisResult.cost_estimation}
            costIntake={costIntake}
            showIntake={showCostIntake}
            onCostIntakeChange={setCostIntake}
            onSubmitCostIntake={handleCostIntakeSubmit}
            onOpenIntake={() => setShowCostIntake(true)}
            onRegenerate={() => loadSection('cost-estimation', { force: true, costIntake })}
          />
        )
      case 'timeline':
        return <TimelineSection data={analysisResult.time_estimation} />
      case 'impact-analysis':
        return <ImpactAnalysisSection data={analysisResult.impact_analysis} />
      case 'all':
      default:
        return (
          <AllSectionsView
            data={analysisResult}
            onSectionClick={handleSectionChange}
            hasSectionContent={hasSectionContent}
            loadingSections={loadingSections}
          />
        )
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
              onClick={() => handleSectionChange(section.id)}
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
              onClick={() => handleSectionChange(section.id)}
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
              onClick={() => handleSectionChange(section.id)}
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
              onClick={() => handleSectionChange(section.id)}
            />
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => router.push(`/project/${project.id}?new=1`)}
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
                  {`${analysisResult.metadata?.generated_sections?.length || 1} Ready`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/project/${project.id}/history`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg
                  text-gray-600 dark:text-gray-400
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <History className="w-4 h-4" />
                <span className="text-sm">History</span>
              </Link>
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
                        msg.structured ? (
                          <StructuredAnswerView
                            answer={msg.structured}
                            markdown={msg.content}
                            compact={!chatFullscreen}
                          />
                        ) : (
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
                        )
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
      <section.icon
        className={`w-5 h-5 flex-shrink-0 ${
          isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-300'
        }`}
      />
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
function GeneratingState({
  progress,
  section,
}: {
  progress: string
  section: SectionId
}) {
  const config = getSectionLoadingConfig(section)

  return (
    <div className="space-y-8 py-10">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-700"
          />
        </div>
        <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
          Generating {config.title}
        </h3>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          {progress || config.subtitle}
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

      <div className={`grid ${config.gridClass} gap-4`}>
        {Array.from({ length: config.items }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5"
          >
            <motion.div
              animate={{ opacity: [0.45, 0.95, 0.45] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.08 }}
              className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700"
            />
            <motion.div
              animate={{ opacity: [0.45, 0.95, 0.45] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.08 + 0.08 }}
              className="mt-3 h-3 w-full rounded bg-gray-100 dark:bg-gray-800"
            />
            <motion.div
              animate={{ opacity: [0.45, 0.95, 0.45] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.08 + 0.16 }}
              className="mt-2 h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-800"
            />
            <motion.div
              animate={{ opacity: [0.45, 0.95, 0.45] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.08 + 0.24 }}
              className="mt-2 h-3 w-2/3 rounded bg-gray-100 dark:bg-gray-800"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function getSectionLoadingConfig(section: SectionId): {
  title: string
  subtitle: string
  gridClass: string
  items: number
} {
  switch (section) {
    case 'problem-analysis':
    case 'feature-system':
    case 'development-tasks':
      return {
        title: 'Section Insights',
        subtitle: 'AI is preparing structured cards for this section.',
        gridClass: 'grid-cols-1 md:grid-cols-2',
        items: 6,
      }
    case 'prd':
      return {
        title: 'PRD Document',
        subtitle: 'AI is drafting document blocks and requirement details.',
        gridClass: 'grid-cols-1',
        items: 5,
      }
    case 'execution-roadmap':
    case 'timeline':
      return {
        title: 'Roadmap & Timeline',
        subtitle: 'AI is organizing milestones and delivery phases.',
        gridClass: 'grid-cols-1 md:grid-cols-2',
        items: 4,
      }
    case 'cost-estimation':
    case 'resources':
    case 'manpower-planning':
      return {
        title: 'Planning Models',
        subtitle: 'AI is calculating effort, resources, and estimates.',
        gridClass: 'grid-cols-1 md:grid-cols-3',
        items: 6,
      }
    default:
      return {
        title: 'Analysis',
        subtitle: 'AI is analyzing your input and generating comprehensive insights.',
        gridClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        items: 6,
      }
  }
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

  const list = (value: any): string[] =>
    Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : []

  const productOverview = data.product_overview || {}
  const objectivesGoals = data.objectives_goals || {}
  const targetUsersPersonas = data.target_users_personas || {}
  const scope = data.scope || {}
  const featuresRequirements = data.features_requirements || {}
  const nonFunctional = featuresRequirements.non_functional_requirements || {}
  const wireframes = data.wireframes_mockups || {}
  const risksAssumptions = data.risks_assumptions || {}
  const releasePlan = data.release_plan || {}
  const appendix = data.appendix || {}

  const productName = productOverview.product_name || data.product_name || 'Not specified'
  const oneLineSummary = productOverview.one_line_summary || data.mission || ''
  const problemStatement =
    productOverview.problem_statement || data.problem_statement || ''
  const vision = productOverview.vision || data.vision || ''

  const businessGoals = list(objectivesGoals.business_goals)
  const userGoals = list(objectivesGoals.user_goals).length
    ? list(objectivesGoals.user_goals)
    : list(data.goals_short_term)
  const kpis = Array.isArray(data.success_metrics)
    ? data.success_metrics
        .map((metric: any) =>
          typeof metric === 'string'
            ? metric
            : [metric.metric, metric.target].filter(Boolean).join(': ')
        )
        .filter(Boolean)
    : list(objectivesGoals.kpis)

  const userSegments = list(targetUsersPersonas.user_segments).length
    ? list(targetUsersPersonas.user_segments)
    : list(data.target_users)
  const personas = Array.isArray(targetUsersPersonas.personas)
    ? targetUsersPersonas.personas
    : Array.isArray(data.personas)
      ? data.personas
      : []
  const painPoints = list(targetUsersPersonas.key_pain_points)

  const problemStatementStructured =
    data.problem_statement_structured ||
    (problemStatement
      ? `Users are facing ${problemStatement} because key workflows are fragmented, leading to slower outcomes and lower trust.`
      : '')

  const inScope = list(scope.in_scope)
  const outOfScope = list(scope.out_of_scope).length
    ? list(scope.out_of_scope)
    : list(data.non_goals)

  const functionalRequirements = list(featuresRequirements.functional_requirements).length
    ? list(featuresRequirements.functional_requirements)
    : list(data.feature_requirements)

  const userStories = Array.isArray(data.user_stories) ? data.user_stories : []
  const userFlowJourney = Array.isArray(data.user_flow_journey) ? data.user_flow_journey : []
  const screens = Array.isArray(wireframes.screens) ? wireframes.screens : []
  const acceptanceCriteria = Array.isArray(data.acceptance_criteria) ? data.acceptance_criteria : []

  const risks = Array.isArray(risksAssumptions.risks)
    ? risksAssumptions.risks
    : Array.isArray(data.risks)
      ? data.risks.map((risk: string) => ({ risk, impact: 'Medium', mitigation: 'Define mitigation in planning.' }))
      : []
  const assumptions = list(risksAssumptions.assumptions).length
    ? list(risksAssumptions.assumptions)
    : list(data.assumptions)

  const dependencies = Array.isArray(data.dependencies) ? data.dependencies : []
  const milestones = Array.isArray(data.timeline_milestones) ? data.timeline_milestones : []
  const releasePhases = Array.isArray(releasePlan.phases) ? releasePlan.phases : []
  const constraints = list(data.constraints)
  const compliance = list(data.compliance_legal).length
    ? list(data.compliance_legal)
    : list(data.compliance)
  const stakeholders = Array.isArray(data.stakeholders) ? data.stakeholders : []
  const openQuestions = list(data.open_questions)

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Product Requirements Document"
        subtitle="Structured PM-grade PRD"
        onCopy={() => onCopy(JSON.stringify(data, null, 2))}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Product" value={productName} color="blue" />
        <MetricCard label="User Segments" value={userSegments.length || 0} color="purple" />
        <MetricCard label="Requirements" value={functionalRequirements.length || 0} color="emerald" />
        <MetricCard label="Milestones" value={milestones.length || 0} color="amber" />
      </div>

      <ContentCard title="1. Product Overview (The Big Picture)">
        <div className="space-y-3 text-gray-700 dark:text-gray-300">
          <p><span className="font-semibold">Product Name:</span> {productName}</p>
          <p><span className="font-semibold">One-line Summary:</span> {oneLineSummary || 'Not specified'}</p>
          <p><span className="font-semibold">Problem Statement:</span> {problemStatement || 'Not specified'}</p>
          <p><span className="font-semibold">Vision:</span> {vision || 'Not specified'}</p>
        </div>
      </ContentCard>

      <ContentCard title="2. Objectives & Goals">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Business Goals</p>
            <ul className="space-y-2">{businessGoals.map((goal: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {goal}</li>)}</ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">User Goals</p>
            <ul className="space-y-2">{userGoals.map((goal: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {goal}</li>)}</ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">KPIs / Success Metrics</p>
            <ul className="space-y-2">{kpis.map((metric: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {metric}</li>)}</ul>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="3. Target Users & Personas">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">User Segments</p>
            <ul className="space-y-2">{userSegments.map((segment: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {segment}</li>)}</ul>
          </div>
          {personas.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-500 uppercase">Personas</p>
              {personas.map((persona: any, i: number) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <p className="font-semibold text-gray-900 dark:text-white">{persona.name || `Persona ${i + 1}`}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{persona.description || 'No description'}</p>
                  {Array.isArray(persona.pain_points) && persona.pain_points.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-medium">Pain points:</span> {persona.pain_points.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          {painPoints.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Pain Points</p>
              <ul className="space-y-2">{painPoints.map((point: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {point}</li>)}</ul>
            </div>
          )}
        </div>
      </ContentCard>

      <ContentCard title="4. Problem Statement">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {problemStatementStructured || 'Users are facing [problem] because [reason], leading to [impact].'}
        </p>
      </ContentCard>

      <ContentCard title="5. Scope">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">In Scope</p>
            <ul className="space-y-2">{inScope.map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Out of Scope</p>
            <ul className="space-y-2">{outOfScope.map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="6. Features & Requirements">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Functional Requirements</p>
            <ul className="space-y-2">
              {functionalRequirements.map((req: string, i: number) => (
                <li key={i} className="text-gray-700 dark:text-gray-300">- The system shall allow users to {req.replace(/^The system shall allow users to\s*/i, '')}</li>
              ))}
            </ul>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Performance</p>
              <ul className="space-y-1">{list(nonFunctional.performance).map((item: string, i: number) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Security</p>
              <ul className="space-y-1">{list(nonFunctional.security).map((item: string, i: number) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Scalability</p>
              <ul className="space-y-1">{list(nonFunctional.scalability).map((item: string, i: number) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Reliability</p>
              <ul className="space-y-1">{list(nonFunctional.reliability).map((item: string, i: number) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
            </div>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="7. User Stories">
        <ul className="space-y-3">
          {userStories.map((story: any, i: number) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">
              - {story.story || story.full_statement || `As a ${story.persona || 'user'}, I want ${story.action || 'a capability'}, so that ${story.benefit || 'I get value'}`}
            </li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="8. User Flow / Journey">
        <div className="space-y-3">
          {userFlowJourney.map((flow: any, i: number) => (
            <p key={i} className="text-gray-700 dark:text-gray-300">
              - {flow.entry_point || 'Entry'} {' -> '} {Array.isArray(flow.actions) ? flow.actions.join(' -> ') : 'Actions'} {' -> '} {flow.outcome || 'Outcome'}
            </p>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="9. Wireframes / Mockups">
        <div className="space-y-4">
          {screens.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Screens</p>
              {screens.map((screen: any, i: number) => (
                <div key={i} className="mb-2 text-gray-700 dark:text-gray-300">
                  - {screen.name}: {screen.purpose}. Key elements: {(screen.key_elements || []).join(', ')}
                </div>
              ))}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Navigation</p>
            <ul className="space-y-1">{list(wireframes.navigation).map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Layout Ideas</p>
            <ul className="space-y-1">{list(wireframes.layout_ideas).map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="10. Acceptance Criteria">
        <div className="space-y-3">
          {acceptanceCriteria.map((criterion: any, i: number) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                {criterion.id || `AC-${i + 1}`}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Given {criterion.given || 'a user context'}, When {criterion.when || 'an action happens'}, Then {criterion.then || criterion.description || 'the outcome should be achieved'}.
              </p>
            </div>
          ))}
        </div>
      </ContentCard>

      <ContentCard title="11. Success Metrics (KPIs)">
        <ul className="space-y-2">
          {(Array.isArray(data.success_metrics) ? data.success_metrics : []).map((metric: any, i: number) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">
              - {typeof metric === 'string' ? metric : `${metric.metric}: ${metric.target} (${metric.measurement_window})`}
            </li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="12. Risks & Assumptions">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Risks</p>
            <ul className="space-y-2">
              {risks.map((risk: any, i: number) => (
                <li key={i} className="text-gray-700 dark:text-gray-300">
                  - {risk.risk || risk} (Impact: {risk.impact || 'Medium'}) | Mitigation: {risk.mitigation || 'TBD'}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Assumptions</p>
            <ul className="space-y-2">{assumptions.map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
          </div>
        </div>
      </ContentCard>

      <ContentCard title="13. Dependencies">
        <ul className="space-y-2">
          {dependencies.map((dependency: any, i: number) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">
              - {typeof dependency === 'string' ? dependency : `${dependency.dependency} (${dependency.type}) | Owner: ${dependency.owner} | ${dependency.notes}`}
            </li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="14. Timeline & Milestones">
        <ul className="space-y-2">
          {milestones.map((milestone: any, i: number) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">
              - {milestone.target_date}: {milestone.milestone} - {milestone.description}
            </li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="15. Release Plan">
        <div className="space-y-3">
          {releasePhases.map((phase: any, i: number) => (
            <div key={i} className="text-gray-700 dark:text-gray-300">
              <p className="font-semibold">{phase.name}</p>
              <p className="text-sm">Scope: {(phase.scope || []).join(', ')}</p>
              <p className="text-sm">Exit Criteria: {(phase.exit_criteria || []).join(', ')}</p>
            </div>
          ))}
          {releasePlan.rollout_strategy && (
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Rollout Strategy:</span> {releasePlan.rollout_strategy}
            </p>
          )}
        </div>
      </ContentCard>

      <ContentCard title="16. Constraints">
        <ul className="space-y-2">{constraints.map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
      </ContentCard>

      <ContentCard title="17. Compliance & Legal">
        <ul className="space-y-2">{compliance.map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
      </ContentCard>

      <ContentCard title="18. Stakeholders">
        <ul className="space-y-2">
          {stakeholders.map((stakeholder: any, i: number) => (
            <li key={i} className="text-gray-700 dark:text-gray-300">
              - {(stakeholder.name_or_role || stakeholder.name || 'Stakeholder')} | Interest: {stakeholder.interest || 'N/A'} | Responsibility: {stakeholder.responsibility || 'N/A'}
            </li>
          ))}
        </ul>
      </ContentCard>

      <ContentCard title="19. Open Questions">
        <ul className="space-y-2">{openQuestions.map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
      </ContentCard>

      <ContentCard title="20. Appendix">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Research Assumptions</p>
            <ul className="space-y-1">{list(appendix.research_assumptions).map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Competitor Notes</p>
            <ul className="space-y-1">{list(appendix.competitor_notes).map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase mb-2">References</p>
            <ul className="space-y-1">{list(appendix.references).map((item: string, i: number) => <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>)}</ul>
          </div>
        </div>
      </ContentCard>
    </div>
  )
}

function ExecutiveDashboardSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Executive Dashboard" />

  const innovationScore = normalizeScoreOutOfTen(data.innovation_score, 7)
  const ideaBreakdown = Array.isArray(data.idea_expansion_breakdown) ? data.idea_expansion_breakdown : []
  const marketSignals = Array.isArray(data.market_opportunity_signals) ? data.market_opportunity_signals : []
  const strategyActions = Array.isArray(data.recommended_strategy_actions) ? data.recommended_strategy_actions : []

  return (
    <div className="space-y-8">
      <SectionHeader title="Executive Dashboard" subtitle="Strategic overview at a glance" />

      <ContentCard title="Idea Expansion">
        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
          {data.idea_expansion || 'No idea expansion generated yet.'}
        </ReactMarkdown>
        {ideaBreakdown.length > 0 && (
          <ul className="mt-4 space-y-2">
            {ideaBreakdown.map((item: string, index: number) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">- {item}</li>
            ))}
          </ul>
        )}
      </ContentCard>

      <ContentCard title="Key Insight">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl">
          <p className="text-gray-800 dark:text-gray-200 font-medium">{data.key_insight}</p>
        </div>
      </ContentCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Innovation Score" value={`${innovationScore.toFixed(1)}/10`} color="blue" />
        <MetricCard label="Complexity" value={data.complexity_level || 'Medium'} color="purple" />
        <MetricCard label="Score Basis" value={data.score_rationale ? 'Defined' : 'Derived'} color="emerald" />
        <MetricCard label="Readiness" value={innovationScore >= 8 ? 'Strong' : innovationScore >= 6 ? 'Moderate' : 'Early'} color="amber" />
      </div>

      <ContentCard title="Market Opportunity">
        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
          {data.market_opportunity || 'No market opportunity analysis generated yet.'}
        </ReactMarkdown>
        {marketSignals.length > 0 && (
          <ul className="mt-4 space-y-2">
            {marketSignals.map((item: string, index: number) => (
              <li key={index} className="text-gray-700 dark:text-gray-300">- {item}</li>
            ))}
          </ul>
        )}
      </ContentCard>

      <ContentCard title="Recommended Strategy">
        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed">
          {data.recommended_strategy || 'No strategy generated yet.'}
        </ReactMarkdown>
        {strategyActions.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Action Plan</p>
            <ul className="space-y-2">
              {strategyActions.map((item: string, index: number) => (
                <li key={index} className="text-gray-700 dark:text-gray-300">- {item}</li>
              ))}
            </ul>
          </div>
        )}
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

  const criticalCount = data.filter((task: any) => task.priority === 'Critical').length
  const highCount = data.filter((task: any) => task.priority === 'High').length
  const dependencyHeavyCount = data.filter((task: any) => Array.isArray(task.dependencies) && task.dependencies.length > 0).length
  const ownerCount = new Set(
    data.map((task: any) => (task.owner_role || task.type || '').toLowerCase()).filter(Boolean)
  ).size

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Development Tasks"
        subtitle={`${data.length} implementation-ready tasks`}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Tasks" value={data.length} color="blue" />
        <MetricCard label="Critical / High" value={`${criticalCount + highCount}`} color="amber" />
        <MetricCard label="Sequenced Tasks" value={dependencyHeavyCount} color="purple" />
        <MetricCard label="Owner Types" value={ownerCount} color="emerald" />
      </div>

      <div className="space-y-5">
        {data.map((task: any, i: number) => (
          <div key={i} className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{task.id}</p>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{task.description}</p>
                )}
                {task.why_this_task_matters && (
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-2">
                    Why this matters: {task.why_this_task_matters}
                  </p>
                )}
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
                {task.owner_role && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                    {task.owner_role}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs uppercase text-gray-500 mb-1">Estimated Effort</p>
                <p className="text-gray-800 dark:text-gray-200">{task.estimated_time || 'TBD'}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60">
                <p className="text-xs uppercase text-gray-500 mb-1">Dependencies</p>
                <p className="text-gray-800 dark:text-gray-200">
                  {Array.isArray(task.dependencies) && task.dependencies.length > 0
                    ? task.dependencies.join(', ')
                    : 'None'}
                </p>
              </div>
            </div>

            {Array.isArray(task.linked_features) && task.linked_features.length > 0 && (
              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500 mb-2">Linked Features</p>
                <div className="flex flex-wrap gap-2">
                  {task.linked_features.map((feature: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-md text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(task.section_dependencies) && task.section_dependencies.length > 0 && (
              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500 mb-2">Section Dependencies</p>
                <div className="flex flex-wrap gap-2">
                  {task.section_dependencies.map((item: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-md text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(task.detailed_steps) && task.detailed_steps.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase text-gray-500 mb-2">Implementation Steps</p>
                <ol className="space-y-1.5">
                  {task.detailed_steps.map((step: string, idx: number) => (
                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                      {idx + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {(Array.isArray(task.deliverables) || Array.isArray(task.done_criteria)) && (
              <div className="mt-4 grid md:grid-cols-2 gap-3">
                {Array.isArray(task.deliverables) && task.deliverables.length > 0 && (
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40">
                    <p className="text-xs uppercase text-gray-500 mb-2">Deliverables</p>
                    <ul className="space-y-1">
                      {task.deliverables.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(task.done_criteria) && task.done_criteria.length > 0 && (
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40">
                    <p className="text-xs uppercase text-gray-500 mb-2">Done Criteria</p>
                    <ul className="space-y-1">
                      {task.done_criteria.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {Array.isArray(task.tech_stack) && task.tech_stack.length > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                Tech stack: {task.tech_stack.join(', ')}
              </p>
            )}
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

  const teamComposition = Array.isArray(data.team_composition) ? data.team_composition : []
  const rolesRationale = Array.isArray(data.roles_rationale) ? data.roles_rationale : []
  const hiringPhases = Array.isArray(data.hiring_phases) ? data.hiring_phases : []
  const teamOptions = data.team_options || {}
  const assumptions = Array.isArray(data.assumptions) ? data.assumptions : []

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
        <MetricCard label="Must-have Roles" value={rolesRationale.filter((item: any) => item.must_have).length || 0} color="purple" />
        <MetricCard label="Hiring Phases" value={hiringPhases.length || 0} color="amber" />
      </div>

      {teamComposition.length > 0 && (
        <ContentCard title="Team Composition">
          <div className="space-y-4">
            {teamComposition.map((member: any, i: number) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{member.role}</h4>
                  <p className="text-sm text-gray-500">{member.seniority} • {member.count} person(s)</p>
                  {member.why_needed && (
                    <p className="text-xs text-gray-500 mt-1">{member.why_needed}</p>
                  )}
                  {member.hiring_phase && (
                    <p className="text-xs text-blue-500 mt-1">Hiring phase: {member.hiring_phase}</p>
                  )}
                </div>
                <span className="font-medium text-emerald-600">
                  ₹{((member.monthly_cost_inr || 0) / 1000).toFixed(0)}K/mo
                </span>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {rolesRationale.length > 0 && (
        <ContentCard title="Role Rationale (Why Each Role Exists)">
          <div className="space-y-3">
            {rolesRationale.map((role: any, i: number) => (
              <div key={i} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="font-medium text-gray-900 dark:text-white">
                  {role.role} {role.must_have ? '(Must-have)' : '(Optional/Phase-based)'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{role.why_needed}</p>
                {role.hiring_phase && <p className="text-xs text-gray-500 mt-1">Phase: {role.hiring_phase}</p>}
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {hiringPhases.length > 0 && (
        <ContentCard title="Phase-wise Hiring Plan">
          <div className="space-y-3">
            {hiringPhases.map((phase: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900 dark:text-white">{phase.phase}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                    {phase.timeline}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Roles: {(phase.roles || []).join(', ') || 'TBD'}
                </p>
                {phase.notes && <p className="text-xs text-gray-500 mt-1">{phase.notes}</p>}
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {(teamOptions.lean_team || teamOptions.startup_team || teamOptions.scale_team) && (
        <ContentCard title="Team Size Scenarios">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { key: 'lean_team', label: 'Lean Team' },
              { key: 'startup_team', label: 'Startup Team' },
              { key: 'scale_team', label: 'Scale Team' },
            ].map((item) => {
              const members = teamOptions[item.key] || []
              if (!Array.isArray(members) || members.length === 0) return null
              const monthly = members.reduce((sum: number, member: any) => sum + (member.monthly_cost_inr || 0), 0)
              const headcount = members.reduce((sum: number, member: any) => sum + (member.count || 0), 0)
              return (
                <div key={item.key} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{headcount} people • ₹{(monthly / 100000).toFixed(1)}L/month</p>
                </div>
              )
            })}
          </div>
        </ContentCard>
      )}

      <ContentCard title="Hiring Plan">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.hiring_plan}</p>
      </ContentCard>

      {assumptions.length > 0 && (
        <ContentCard title="Planning Assumptions">
          <ul className="space-y-2">
            {assumptions.map((item: string, i: number) => (
              <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>
            ))}
          </ul>
        </ContentCard>
      )}
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

function CostEstimationSection({
  data,
  costIntake,
  showIntake,
  onCostIntakeChange,
  onSubmitCostIntake,
  onOpenIntake,
  onRegenerate,
}: {
  data: any
  costIntake: CostIntakeState
  showIntake: boolean
  onCostIntakeChange: (value: CostIntakeState | ((prev: CostIntakeState) => CostIntakeState)) => void
  onSubmitCostIntake: () => void
  onOpenIntake: () => void
  onRegenerate: () => void
}) {
  const totalFirstYear = data?.total_first_year || data?.total_first_year_cost_inr || 0
  const hasData = Boolean(data)

  const updateField = (
    sectionId: keyof Omit<CostIntakeState, 'notes'>,
    fieldKey: string,
    value: string
  ) => {
    onCostIntakeChange((prev) => ({
      ...prev,
      [sectionId]: {
        ...(prev[sectionId] || {}),
        [fieldKey]: value,
      },
    }))
  }

  const shouldShowIntake = showIntake || !hasData

  return (
    <div className="space-y-8">
      <SectionHeader title="Cost Estimation" subtitle="Grounded budget estimation based on idea + scope + selected cost drivers" />

      {shouldShowIntake && (
        <ContentCard title="Cost Drivers Intake">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Select the factors that best match your product. Cost estimation is generated after this intake so numbers are tied to real scope and assumptions.
          </p>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-1">
            {COST_INTAKE_SECTIONS.map((section) => (
              <div key={section.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/40">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{section.title}</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {section.fields.map((field) => (
                    <label key={field.key} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{field.label}</span>
                      <select
                        value={costIntake[section.id]?.[field.key] || ''}
                        onChange={(e) => updateField(section.id, field.key, e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {field.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Optional notes for pricing assumptions</span>
                <textarea
                  rows={3}
                  value={costIntake.notes}
                  onChange={(e) =>
                    onCostIntakeChange((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Add constraints, target pricing, or hiring assumptions..."
                  className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-5">
            {hasData && (
              <button
                onClick={onRegenerate}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Regenerate with current inputs
              </button>
            )}
            <button
              onClick={onSubmitCostIntake}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Generate Cost Estimation
            </button>
          </div>
        </ContentCard>
      )}

      {hasData && !shouldShowIntake && (
        <button
          onClick={onOpenIntake}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          Update Cost Inputs
        </button>
      )}

      {!hasData && !shouldShowIntake && <EmptySection name="Cost Estimation" />}

      {hasData && (
        <>
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
                  <span className="text-gray-700 dark:text-gray-300">Engineering Team (Annualized)</span>
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
                  <span className="text-gray-700 dark:text-gray-300">Operations & Maintenance</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    ₹{(data.operational_cost / 100000).toFixed(1)}L/yr
                  </span>
                </div>
              )}
            </div>
          </ContentCard>

          {data.budget_ranges && (
            <ContentCard title="Budget Ranges">
              <div className="grid md:grid-cols-3 gap-4">
                {['mvp', 'startup', 'scale'].map((key) => {
                  const range = data.budget_ranges?.[key]
                  if (!range) return null
                  return (
                    <div key={key} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                      <p className="text-xs uppercase text-gray-500 mb-1">{key}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{((range.min || 0) / 100000).toFixed(1)}L - ₹{((range.max || 0) / 100000).toFixed(1)}L
                      </p>
                    </div>
                  )
                })}
              </div>
            </ContentCard>
          )}

          {Array.isArray(data.cost_drivers) && data.cost_drivers.length > 0 && (
            <ContentCard title="Primary Cost Drivers">
              <div className="space-y-3">
                {data.cost_drivers.map((driver: any, index: number) => (
                  <div key={index} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
                    <p className="font-medium text-gray-900 dark:text-white">{driver.driver}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Selected: {driver.selected_option || 'Not specified'} | Impact: {driver.impact_level || 'Medium'}
                    </p>
                    {driver.notes && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{driver.notes}</p>}
                  </div>
                ))}
              </div>
            </ContentCard>
          )}

          <div className="p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white">
            <p className="text-sm opacity-80 mb-1">Total First Year Investment</p>
            <p className="text-4xl font-bold">₹{(totalFirstYear / 100000).toFixed(1)}L</p>
            <p className="text-sm opacity-80 mt-2">(~₹{(totalFirstYear / 10000000).toFixed(2)} Cr)</p>
          </div>

          {data.break_even_analysis && (
            <ContentCard title="Break-even Analysis">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{data.break_even_analysis}</p>
            </ContentCard>
          )}

          {(Array.isArray(data.assumptions) ||
            Array.isArray(data.team_implications) ||
            Array.isArray(data.infra_implications) ||
            Array.isArray(data.maintenance_implications)) && (
            <ContentCard title="Assumptions and Implications">
              <div className="space-y-4">
                {Array.isArray(data.assumptions) && data.assumptions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Assumptions</p>
                    <ul className="space-y-1">
                      {data.assumptions.map((item: string, index: number) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(data.team_implications) && data.team_implications.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Team Implications</p>
                    <ul className="space-y-1">
                      {data.team_implications.map((item: string, index: number) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(data.infra_implications) && data.infra_implications.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Infrastructure Implications</p>
                    <ul className="space-y-1">
                      {data.infra_implications.map((item: string, index: number) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {Array.isArray(data.maintenance_implications) && data.maintenance_implications.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase mb-2">Maintenance Implications</p>
                    <ul className="space-y-1">
                      {data.maintenance_implications.map((item: string, index: number) => (
                        <li key={index} className="text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ContentCard>
          )}
        </>
      )}
    </div>
  )
}

function TimelineSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Timeline" />

  const phases = Array.isArray(data.phases) ? data.phases : []
  const mvpTimeline = data.mvp_timeline || {}
  const milestones = Array.isArray(mvpTimeline.key_milestones) ? mvpTimeline.key_milestones : []
  const assumptions = Array.isArray(data.assumptions) ? data.assumptions : []
  const mvpVsPostMvp = data.mvp_vs_post_mvp || {}

  return (
    <div className="space-y-8">
      <SectionHeader title="Timeline" subtitle="Project-specific phased delivery plan" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Timeline" value={`${data.total_weeks || mvpTimeline.total_weeks || 0} weeks`} color="blue" />
        <MetricCard label="MVP Window" value={`${mvpTimeline.total_weeks || 'TBD'} weeks`} color="emerald" />
        <MetricCard label="Phases" value={phases.length || 0} color="purple" />
        <MetricCard label="Critical Path Items" value={(data.critical_path || []).length || 0} color="amber" />
      </div>

      {phases.length > 0 && (
        <ContentCard title="Phase-by-Phase Plan">
          <div className="space-y-4">
            {phases.map((phase: any, i: number) => (
              <div key={i} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{phase.phase_name || `Phase ${i + 1}`}</h4>
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                    {phase.duration || 'TBD'}
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Goals</p>
                    <ul className="space-y-1">
                      {(phase.goals || []).map((item: string, idx: number) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Deliverables</p>
                    <ul className="space-y-1">
                      {(phase.deliverables || []).map((item: string, idx: number) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Dependencies</p>
                    <ul className="space-y-1">
                      {(phase.dependencies || []).map((item: string, idx: number) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300">- {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Risks & Staffing</p>
                    <ul className="space-y-1">
                      {(phase.risks || []).map((item: string, idx: number) => (
                        <li key={idx} className="text-gray-700 dark:text-gray-300">- Risk: {item}</li>
                      ))}
                      {(phase.staffing_assumptions || []).map((item: string, idx: number) => (
                        <li key={`staff-${idx}`} className="text-gray-700 dark:text-gray-300">- Staffing: {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {data.mvp_timeline && (
        <ContentCard title="MVP Timeline">
          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Total Duration: {data.mvp_timeline.total_weeks} weeks
          </p>
          <div className="space-y-4">
            {milestones.map((milestone: any, i: number) => (
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

      {(Array.isArray(mvpVsPostMvp.mvp_focus) || Array.isArray(mvpVsPostMvp.post_mvp_focus)) && (
        <ContentCard title="MVP vs Post-MVP Focus">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">MVP Focus</p>
              <ul className="space-y-1">
                {(mvpVsPostMvp.mvp_focus || []).map((item: string, i: number) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Post-MVP Focus</p>
              <ul className="space-y-1">
                {(mvpVsPostMvp.post_mvp_focus || []).map((item: string, i: number) => (
                  <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </ContentCard>
      )}

      {assumptions.length > 0 && (
        <ContentCard title="Timeline Assumptions">
          <ul className="space-y-2">
            {assumptions.map((item: string, i: number) => (
              <li key={i} className="text-gray-700 dark:text-gray-300">- {item}</li>
            ))}
          </ul>
        </ContentCard>
      )}
    </div>
  )
}

function ImpactAnalysisSection({ data }: { data: any }) {
  if (!data) return <EmptySection name="Impact Analysis" />

  const userImpactScore = normalizeScoreOutOfTen(data.user_impact_score, 0)
  const businessImpactScore = normalizeScoreOutOfTen(data.business_impact_score, 0)
  const rawConfidence = Number(data.confidence_score || 0)
  const normalizedConfidence = Number.isFinite(rawConfidence)
    ? rawConfidence <= 1
      ? rawConfidence * 100
      : rawConfidence <= 100
      ? rawConfidence
      : 100
    : 0

  return (
    <div className="space-y-8">
      <SectionHeader title="Impact Analysis" subtitle="Expected outcomes and projections" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="User Impact" value={`${userImpactScore.toFixed(1)}/10`} color="blue" />
        <MetricCard label="Business Impact" value={`${businessImpactScore.toFixed(1)}/10`} color="emerald" />
        <MetricCard label="Confidence" value={`${normalizedConfidence.toFixed(0)}%`} color="purple" />
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
function AllSectionsView({
  data,
  onSectionClick,
  hasSectionContent,
  loadingSections,
}: {
  data: AnalysisResultState
  onSectionClick: (id: SectionId) => void
  hasSectionContent: (id: SectionId, result?: AnalysisResultState | null) => boolean
  loadingSections: Partial<Record<SectionId, boolean>>
}) {
  const sectionSummary = (sectionId: SectionId, readyText: string, pendingText: string) =>
    loadingSections[sectionId]
      ? 'Generating with AI...'
      : data.metadata?.stale_sections?.includes(sectionId)
        ? `Stale after input update. ${pendingText}`
        : hasSectionContent(sectionId, data)
        ? readyText
        : pendingText

  const colorStyles: Record<string, { bg: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-500 dark:text-blue-300' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-500 dark:text-red-300' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-500 dark:text-purple-300' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-500 dark:text-emerald-300' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-500 dark:text-amber-300' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-500 dark:text-cyan-300' },
  }

  const sectionSummaries = [
    {
      id: 'prd' as SectionId,
      title: 'PRD Document',
      icon: FileText,
      summary: sectionSummary(
        'prd',
        data.prd?.product_overview?.vision
          ? `${data.prd.product_overview.vision.slice(0, 100)}...`
          : data.prd?.vision
            ? `${data.prd.vision.slice(0, 100)}...`
            : 'Product requirements document ready',
        'Click to generate the PRD'
      ),
      color: 'blue',
    },
    {
      id: 'problem-analysis' as SectionId,
      title: 'Problems',
      icon: AlertTriangle,
      summary: sectionSummary(
        'problem-analysis',
        `${data.problem_analysis?.length || 0} problems identified`,
        'Click to generate problem analysis'
      ),
      color: 'red',
    },
    {
      id: 'feature-system' as SectionId,
      title: 'Features',
      icon: Layers,
      summary: sectionSummary(
        'feature-system',
        `${data.feature_system?.length || 0} features suggested`,
        'Click to generate 10+ tailored features'
      ),
      color: 'purple',
    },
    {
      id: 'development-tasks' as SectionId,
      title: 'Tasks',
      icon: CheckSquare,
      summary: sectionSummary(
        'development-tasks',
        `${data.development_tasks?.length || 0} development tasks`,
        'Click to generate implementation tasks'
      ),
      color: 'emerald',
    },
    {
      id: 'cost-estimation' as SectionId,
      title: 'Cost Estimation',
      icon: IndianRupee,
      summary: sectionSummary(
        'cost-estimation',
        `₹${(((data.cost_estimation as any)?.total_first_year || (data.cost_estimation as any)?.total_first_year_cost_inr || 0) / 100000).toFixed(1)}L first year`,
        'Click to generate cost estimation'
      ),
      color: 'amber',
    },
    {
      id: 'timeline' as SectionId,
      title: 'Timeline',
      icon: Calendar,
      summary: sectionSummary(
        'timeline',
        `${data.time_estimation?.total_weeks || data.time_estimation?.mvp_timeline?.total_weeks || 12} weeks to MVP`,
        'Click to generate delivery timeline'
      ),
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
        {sectionSummaries.map((section) => {
          const style = colorStyles[section.color] || colorStyles.blue
          return (
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
              <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${style.bg}`}>
                <section.icon className={`w-6 h-6 ${style.text}`} />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2
                group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {section.title}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {section.summary}
              </p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function StructuredAnswerView({
  answer,
  markdown,
  compact = false,
}: {
  answer: StructuredChatAnswer
  markdown: string
  compact?: boolean
}) {
  const blocks = [
    {
      title: 'Direct Answer',
      type: 'text' as const,
      value: answer.direct_answer || 'Not enough context yet.',
    },
    {
      title: 'Key Insights',
      type: 'list' as const,
      value: answer.key_insights,
    },
    {
      title: 'Recommended Action',
      type: 'list' as const,
      value: answer.recommended_action,
    },
    {
      title: 'Risks / Notes',
      type: 'list' as const,
      value: answer.risks_notes,
    },
    {
      title: 'Next Step',
      type: 'list' as const,
      value: answer.next_step,
    },
  ]

  return (
    <div className={`space-y-3 ${compact ? 'text-sm' : 'text-base'}`}>
      {blocks.map((block) => (
        <div
          key={block.title}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/40 p-3"
        >
          <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">
            {block.title}
          </h4>
          {block.type === 'text' ? (
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{block.value as string}</p>
          ) : (
            <ul className="space-y-1.5">
              {(block.value as string[]).length > 0 ? (
                (block.value as string[]).map((item, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    - {item}
                  </li>
                ))
              ) : (
                <li className="text-gray-500 dark:text-gray-400">- Not enough context yet.</li>
              )}
            </ul>
          )}
        </div>
      ))}

      {!answer.direct_answer && markdown ? (
        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
          {markdown}
        </ReactMarkdown>
      ) : null}
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
        Open this section to trigger on-demand generation.
      </p>
    </div>
  )
}
