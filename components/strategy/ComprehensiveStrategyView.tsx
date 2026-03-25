'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  AlertTriangle,
  Lightbulb,
  Target,
  FileText,
  Server,
  CheckSquare,
  Map,
  Users,
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  Copy,
  Check,
  Zap,
  BarChart3,
  Layers,
  Code,
  Database,
  Shield,
  Workflow,
} from 'lucide-react'
import type { ComprehensiveStrategyResult, RoadmapPhase } from '@/types/comprehensive-strategy'

interface ComprehensiveStrategyViewProps {
  result: ComprehensiveStrategyResult
  projectName?: string
  onExport?: () => void
}

// Section Navigation
const SECTIONS = [
  { id: 'executive', label: 'Executive Dashboard', icon: Sparkles },
  { id: 'problems', label: 'Problem Analysis', icon: AlertTriangle },
  { id: 'features', label: 'Feature System', icon: Lightbulb },
  { id: 'gaps', label: 'Gaps & Opportunities', icon: Target },
  { id: 'prd', label: 'PRD', icon: FileText },
  { id: 'system', label: 'System Design', icon: Server },
  { id: 'tasks', label: 'Development Tasks', icon: CheckSquare },
  { id: 'roadmap', label: 'Execution Roadmap', icon: Map },
  { id: 'manpower', label: 'Manpower Planning', icon: Users },
  { id: 'resources', label: 'Resources', icon: Package },
  { id: 'cost', label: 'Cost Estimation', icon: DollarSign },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'impact', label: 'Impact Analysis', icon: TrendingUp },
]

export default function ComprehensiveStrategyView({
  result,
  projectName,
  onExport,
}: ComprehensiveStrategyViewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    executive: true,
    problems: true,
    features: false,
    gaps: false,
    prd: false,
    system: false,
    tasks: false,
    roadmap: false,
    manpower: false,
    resources: false,
    cost: false,
    timeline: false,
    impact: false,
  })
  const [copied, setCopied] = useState(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const scrollToSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: true }))
    setTimeout(() => {
      sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getSeverityColor = (score: number) => {
    if (score >= 8) return 'bg-red-100 text-red-700 border-red-200'
    if (score >= 6) return 'bg-orange-100 text-orange-700 border-orange-200'
    if (score >= 4) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-700'
      case 'High':
        return 'bg-orange-100 text-orange-700'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'Low':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return 'bg-blue-100 text-blue-700'
      case 'advanced':
        return 'bg-purple-100 text-purple-700'
      case 'futuristic':
        return 'bg-pink-100 text-pink-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Handle drag start for items
  const handleDragStart = (e: React.DragEvent, type: 'problem' | 'feature' | 'task', payload: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, payload }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className="flex gap-6">
      {/* Sticky Sidebar Navigation */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-20 bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Navigate</h3>
          <nav className="space-y-1">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <section.icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{section.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
            <button
              onClick={onExport}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* SECTION 1: Executive Dashboard */}
        <section
          ref={el => { sectionRefs.current['executive'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('executive')}
            className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sparkles className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Executive Dashboard</h2>
                <p className="text-sm text-gray-500">High-level strategy overview</p>
              </div>
            </div>
            {expandedSections.executive ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.executive && result.executive_dashboard && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <p className="text-3xl font-bold text-blue-600">{result.executive_dashboard.innovation_score}/10</p>
                      <p className="text-sm text-gray-600">Innovation Score</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-purple-600">{result.executive_dashboard.complexity_level}</p>
                      <p className="text-sm text-gray-600">Complexity</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <p className="text-3xl font-bold text-green-600">{result.problem_analysis?.length || 0}</p>
                      <p className="text-sm text-gray-600">Problems</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl text-center">
                      <p className="text-3xl font-bold text-orange-600">{result.feature_system?.length || 0}</p>
                      <p className="text-sm text-gray-600">Features</p>
                    </div>
                  </div>

                  {/* Key Insight */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      Key Insight
                    </h4>
                    <p className="text-gray-700">{result.executive_dashboard.key_insight}</p>
                  </div>

                  {/* Idea Expansion */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Idea Expansion</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{result.executive_dashboard.idea_expansion}</p>
                  </div>

                  {/* Market Opportunity */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Market Opportunity</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{result.executive_dashboard.market_opportunity}</p>
                  </div>

                  {/* Recommended Strategy */}
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-600" />
                      Recommended Strategy
                    </h4>
                    <p className="text-gray-700">{result.executive_dashboard.recommended_strategy}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 2: Problem Analysis */}
        <section
          ref={el => { sectionRefs.current['problems'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('problems')}
            className="w-full flex items-center justify-between p-6 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Problem Analysis</h2>
                <p className="text-sm text-gray-500">{result.problem_analysis?.length || 0} problems identified</p>
              </div>
            </div>
            {expandedSections.problems ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.problems && result.problem_analysis && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <p className="text-xs text-gray-500 mb-2">Drag any problem to the AI Chat to ask about it</p>
                  {result.problem_analysis.map((problem, idx) => (
                    <div
                      key={problem.id || idx}
                      className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'problem', problem)}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h4 className="font-semibold text-gray-900">{idx + 1}. {problem.title}</h4>
                        <div className="flex gap-2 flex-shrink-0">
                          <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(problem.severity_score)}`}>
                            Severity: {problem.severity_score}/10
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(problem.frequency_score)}`}>
                            Frequency: {problem.frequency_score}/10
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{problem.deep_description}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Root Cause:</span>
                          <p className="text-gray-600 mt-1">{problem.root_cause}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Affected Users:</span>
                          <p className="text-gray-600 mt-1">{problem.affected_users}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Current Solutions:</span>
                          <p className="text-gray-600 mt-1">{problem.current_solutions}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">Market Gaps:</span>
                          <p className="text-gray-600 mt-1">{problem.gaps_in_market}</p>
                        </div>
                      </div>
                      {problem.evidence_examples && problem.evidence_examples.length > 0 && (
                        <div className="mt-3 p-2 bg-yellow-50 rounded-lg">
                          <span className="font-medium text-gray-700 text-sm">Evidence:</span>
                          <ul className="mt-1 space-y-1">
                            {problem.evidence_examples.slice(0, 3).map((evidence, i) => (
                              <li key={i} className="text-sm text-gray-600 italic">&quot;{evidence}&quot;</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 3: Feature System */}
        <section
          ref={el => { sectionRefs.current['features'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('features')}
            className="w-full flex items-center justify-between p-6 bg-yellow-50 hover:bg-yellow-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Feature System</h2>
                <p className="text-sm text-gray-500">{result.feature_system?.length || 0} features designed</p>
              </div>
            </div>
            {expandedSections.features ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.features && result.feature_system && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6">
                  {/* Category Summary */}
                  <div className="flex gap-4 mb-6">
                    <div className="px-4 py-2 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-700">
                        Core: {result.feature_system.filter(f => f.category === 'core').length}
                      </span>
                    </div>
                    <div className="px-4 py-2 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-purple-700">
                        Advanced: {result.feature_system.filter(f => f.category === 'advanced').length}
                      </span>
                    </div>
                    <div className="px-4 py-2 bg-pink-50 rounded-lg">
                      <span className="text-sm font-medium text-pink-700">
                        Futuristic: {result.feature_system.filter(f => f.category === 'futuristic').length}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs text-gray-500">Drag any feature to the AI Chat to ask about it</p>
                    {result.feature_system.map((feature, idx) => (
                      <div
                        key={feature.id || idx}
                        className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'feature', feature)}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(feature.category)}`}>
                              {feature.category}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700`}>
                              {feature.complexity}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{feature.detailed_description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <span className="font-medium text-gray-700">User Value:</span>
                            <p className="text-gray-600 mt-1">{feature.user_value}</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <span className="font-medium text-gray-700">Business Value:</span>
                            <p className="text-gray-600 mt-1">{feature.business_value}</p>
                          </div>
                        </div>
                        {feature.implementation_strategy && feature.implementation_strategy.length > 0 && (
                          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700 text-sm">Implementation Steps:</span>
                            <ol className="mt-1 space-y-1 list-decimal list-inside">
                              {feature.implementation_strategy.slice(0, 5).map((step, i) => (
                                <li key={i} className="text-sm text-gray-600">{step}</li>
                              ))}
                              {feature.implementation_strategy.length > 5 && (
                                <li className="text-sm text-gray-400">...and {feature.implementation_strategy.length - 5} more steps</li>
                              )}
                            </ol>
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                          <span><Clock className="w-4 h-4 inline mr-1" />{feature.estimated_dev_time}</span>
                          {feature.linked_problems && (
                            <span>Solves: {feature.linked_problems.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 4: Gaps & Opportunities */}
        <section
          ref={el => { sectionRefs.current['gaps'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('gaps')}
            className="w-full flex items-center justify-between p-6 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Gaps & Opportunities</h2>
                <p className="text-sm text-gray-500">Market analysis and competitive positioning</p>
              </div>
            </div>
            {expandedSections.gaps ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.gaps && result.gaps_opportunities && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-red-50 rounded-xl">
                    <h4 className="font-semibold text-red-800 mb-3">What Market Lacks</h4>
                    <ul className="space-y-2">
                      {result.gaps_opportunities.market_lacks?.map((item, i) => (
                        <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-xl">
                    <h4 className="font-semibold text-orange-800 mb-3">Why Competitors Fail</h4>
                    <ul className="space-y-2">
                      {result.gaps_opportunities.why_competitors_fail?.map((item, i) => (
                        <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <h4 className="font-semibold text-blue-800 mb-3">Innovation Opportunities</h4>
                    <ul className="space-y-2">
                      {result.gaps_opportunities.innovation_opportunities?.map((item, i) => (
                        <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl">
                    <h4 className="font-semibold text-green-800 mb-3">Unfair Advantages</h4>
                    <ul className="space-y-2">
                      {result.gaps_opportunities.unfair_advantages?.map((item, i) => (
                        <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                          <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 5: PRD */}
        <section
          ref={el => { sectionRefs.current['prd'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('prd')}
            className="w-full flex items-center justify-between p-6 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Product Requirements Document</h2>
                <p className="text-sm text-gray-500">Complete PRD with personas, user stories & criteria</p>
              </div>
            </div>
            {expandedSections.prd ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.prd && result.prd && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Vision & Mission */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Vision</h4>
                      <p className="text-gray-700">{result.prd.vision}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Mission</h4>
                      <p className="text-gray-700">{result.prd.mission}</p>
                    </div>
                  </div>

                  {/* Problem Statement */}
                  <div className="p-4 bg-red-50 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2">Problem Statement</h4>
                    <p className="text-gray-700">{result.prd.problem_statement}</p>
                  </div>

                  {/* Personas */}
                  {result.prd.personas && result.prd.personas.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">User Personas ({result.prd.personas.length})</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {result.prd.personas.map((persona, i) => (
                          <div key={i} className="p-4 border border-gray-200 rounded-xl">
                            <h5 className="font-medium text-gray-900 mb-2">{persona.name}</h5>
                            <p className="text-sm text-gray-600 mb-2">{persona.description}</p>
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs font-medium text-green-700">Goals:</span>
                                <ul className="text-xs text-gray-600 list-disc list-inside">
                                  {persona.goals?.slice(0, 3).map((g, j) => <li key={j}>{g}</li>)}
                                </ul>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-red-700">Pain Points:</span>
                                <ul className="text-xs text-gray-600 list-disc list-inside">
                                  {persona.pain_points?.slice(0, 3).map((p, j) => <li key={j}>{p}</li>)}
                                </ul>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goals */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Short-term Goals</h4>
                      <ul className="space-y-1">
                        {result.prd.goals_short_term?.map((goal, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-600 mt-0.5" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Long-term Goals</h4>
                      <ul className="space-y-1">
                        {result.prd.goals_long_term?.map((goal, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <Target className="w-4 h-4 text-blue-600 mt-0.5" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* User Stories */}
                  {result.prd.user_stories && result.prd.user_stories.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">User Stories ({result.prd.user_stories.length})</h4>
                      <div className="space-y-2">
                        {result.prd.user_stories.slice(0, 10).map((story, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-700 italic">{story.full_statement}</p>
                            {story.acceptance_criteria && story.acceptance_criteria.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500">Acceptance Criteria:</span>
                                <ul className="text-xs text-gray-600 list-disc list-inside ml-2">
                                  {story.acceptance_criteria.slice(0, 3).map((ac, j) => <li key={j}>{ac}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                        {result.prd.user_stories.length > 10 && (
                          <p className="text-sm text-gray-500 text-center">...and {result.prd.user_stories.length - 10} more user stories</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Success Metrics */}
                  {result.prd.success_metrics && result.prd.success_metrics.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Success Metrics</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {result.prd.success_metrics.map((metric, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                            <BarChart3 className="w-4 h-4 text-purple-600" />
                            {metric}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 6: System Design */}
        <section
          ref={el => { sectionRefs.current['system'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('system')}
            className="w-full flex items-center justify-between p-6 bg-cyan-50 hover:bg-cyan-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Server className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">System Design</h2>
                <p className="text-sm text-gray-500">Architecture, APIs, database schema</p>
              </div>
            </div>
            {expandedSections.system ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.system && result.system_design && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Architecture Overview */}
                  <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-600" />
                      Architecture Overview
                    </h4>
                    <p className="text-gray-700">{result.system_design.architecture_overview}</p>
                  </div>

                  {/* Components */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Frontend */}
                    {result.system_design.frontend_components && result.system_design.frontend_components.length > 0 && (
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Code className="w-4 h-4 text-blue-600" />
                          Frontend Components
                        </h4>
                        <div className="space-y-2">
                          {result.system_design.frontend_components.map((comp, i) => (
                            <div key={i} className="p-2 bg-white rounded-lg">
                              <p className="font-medium text-sm text-gray-800">{comp.name}</p>
                              <p className="text-xs text-gray-600">{comp.description}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {comp.technologies?.map((tech, j) => (
                                  <span key={j} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{tech}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Backend */}
                    {result.system_design.backend_services && result.system_design.backend_services.length > 0 && (
                      <div className="p-4 bg-green-50 rounded-xl">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Server className="w-4 h-4 text-green-600" />
                          Backend Services
                        </h4>
                        <div className="space-y-2">
                          {result.system_design.backend_services.map((service, i) => (
                            <div key={i} className="p-2 bg-white rounded-lg">
                              <p className="font-medium text-sm text-gray-800">{service.name}</p>
                              <p className="text-xs text-gray-600">{service.description}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {service.technologies?.map((tech, j) => (
                                  <span key={j} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">{tech}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Database Schema */}
                  {result.system_design.database_design && result.system_design.database_design.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Database className="w-4 h-4 text-purple-600" />
                        Database Schema
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {result.system_design.database_design.map((table, i) => (
                          <div key={i} className="p-3 bg-white rounded-lg">
                            <p className="font-medium text-sm text-gray-800">{table.table_name}</p>
                            <p className="text-xs text-gray-600 mb-2">{table.description}</p>
                            <div className="text-xs text-gray-500 font-mono">
                              {table.columns?.slice(0, 5).map((col, j) => (
                                <div key={j}>{col}</div>
                              ))}
                              {table.columns && table.columns.length > 5 && (
                                <div className="text-gray-400">...+{table.columns.length - 5} more</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Security & Scalability */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-red-600" />
                        Security Considerations
                      </h4>
                      <ul className="space-y-1">
                        {result.system_design.security_considerations?.map((item, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <Check className="w-4 h-4 text-red-600 mt-0.5" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                        Scalability Strategy
                      </h4>
                      <p className="text-sm text-gray-700">{result.system_design.scalability_strategy}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 7: Development Tasks */}
        <section
          ref={el => { sectionRefs.current['tasks'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('tasks')}
            className="w-full flex items-center justify-between p-6 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Development Tasks</h2>
                <p className="text-sm text-gray-500">{result.development_tasks?.length || 0} tasks defined</p>
              </div>
            </div>
            {expandedSections.tasks ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.tasks && result.development_tasks && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6">
                  {/* Task Type Summary */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    {['frontend', 'backend', 'ai', 'devops', 'design', 'testing', 'database'].map(type => {
                      const count = result.development_tasks.filter(t => t.type === type).length
                      if (count === 0) return null
                      return (
                        <div key={type} className="px-3 py-1 bg-gray-100 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 capitalize">{type}: {count}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">Drag any task to the AI Chat to ask about it</p>
                    {result.development_tasks.map((task, idx) => (
                      <div
                        key={task.id || idx}
                        className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors cursor-grab active:cursor-grabbing"
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'task', task)}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h4 className="font-semibold text-gray-900">{task.id}: {task.title}</h4>
                          <div className="flex gap-2 flex-shrink-0">
                            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">
                              {task.type}
                            </span>
                          </div>
                        </div>
                        {task.detailed_steps && task.detailed_steps.length > 0 && (
                          <ol className="mt-2 space-y-1 list-decimal list-inside text-sm text-gray-600">
                            {task.detailed_steps.slice(0, 5).map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                            {task.detailed_steps.length > 5 && (
                              <li className="text-gray-400">...{task.detailed_steps.length - 5} more steps</li>
                            )}
                          </ol>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimated_time}
                          </span>
                          {task.tech_stack && (
                            <span>Tech: {task.tech_stack.join(', ')}</span>
                          )}
                          {task.dependencies && task.dependencies.length > 0 && (
                            <span>Deps: {task.dependencies.join(', ')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 8: Execution Roadmap */}
        <section
          ref={el => { sectionRefs.current['roadmap'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('roadmap')}
            className="w-full flex items-center justify-between p-6 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <Map className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Execution Roadmap</h2>
                <p className="text-sm text-gray-500">3-phase development plan</p>
              </div>
            </div>
            {expandedSections.roadmap ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.roadmap && result.execution_roadmap && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Overall Timeline */}
                  <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl text-center">
                    <p className="text-lg font-semibold text-gray-900">Total Timeline: {result.execution_roadmap.overall_timeline}</p>
                  </div>

                  {/* Phases */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['phase_1_mvp', 'phase_2_scale', 'phase_3_advanced'].map((phaseKey, idx) => {
                      const phase = result.execution_roadmap[phaseKey as keyof typeof result.execution_roadmap] as RoadmapPhase | undefined
                      if (!phase || typeof phase === 'string' || Array.isArray(phase)) return null
                      const colors = [
                        { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-600' },
                        { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-600' },
                        { bg: 'bg-pink-50', border: 'border-pink-200', badge: 'bg-pink-600' },
                      ]

                      return (
                        <div key={phaseKey} className={`p-4 ${colors[idx].bg} rounded-xl border ${colors[idx].border}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`px-2 py-1 text-xs text-white rounded ${colors[idx].badge}`}>
                              Phase {idx + 1}
                            </span>
                            <span className="text-sm font-medium text-gray-700">{phase.timeline}</span>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-2">{phase.phase_name}</h4>

                          <div className="space-y-3">
                            <div>
                              <span className="text-xs font-medium text-gray-600">Features:</span>
                              <ul className="mt-1 space-y-1">
                                {phase.features?.slice(0, 5).map((f, i) => (
                                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                    <ChevronRight className="w-3 h-3 mt-0.5" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-gray-600">Goals:</span>
                              <ul className="mt-1 space-y-1">
                                {phase.goals?.slice(0, 3).map((g, i) => (
                                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                    <Target className="w-3 h-3 mt-0.5" />
                                    {g}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 9: Manpower Planning */}
        <section
          ref={el => { sectionRefs.current['manpower'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('manpower')}
            className="w-full flex items-center justify-between p-6 bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Manpower Planning</h2>
                <p className="text-sm text-gray-500">{result.manpower_planning?.total_headcount || 0} total team members</p>
              </div>
            </div>
            {expandedSections.manpower ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.manpower && result.manpower_planning && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Team Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.manpower_planning.minimum_team && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <h4 className="font-semibold text-green-800 mb-2">
                          Minimum Team ({result.manpower_planning.minimum_team.total} people)
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">{result.manpower_planning.minimum_team.description}</p>
                        <div className="space-y-2">
                          {result.manpower_planning.minimum_team.roles?.map((role, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-0.5 bg-white rounded text-xs">{role.count}x</span>
                              <span className="text-gray-700">{role.role}</span>
                              <span className="text-gray-400 text-xs">({role.skill_level})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.manpower_planning.ideal_team && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-2">
                          Ideal Team ({result.manpower_planning.ideal_team.total} people)
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">{result.manpower_planning.ideal_team.description}</p>
                        <div className="space-y-2">
                          {result.manpower_planning.ideal_team.roles?.map((role, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="px-2 py-0.5 bg-white rounded text-xs">{role.count}x</span>
                              <span className="text-gray-700">{role.role}</span>
                              <span className="text-gray-400 text-xs">({role.skill_level})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hiring Priority */}
                  {result.manpower_planning.hiring_priority && result.manpower_planning.hiring_priority.length > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Hiring Priority</h4>
                      <ol className="space-y-1 list-decimal list-inside">
                        {result.manpower_planning.hiring_priority.map((role, i) => (
                          <li key={i} className="text-sm text-gray-700">{role}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* All Roles */}
                  {result.manpower_planning.roles && result.manpower_planning.roles.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">All Roles</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {result.manpower_planning.roles.map((role, i) => (
                          <div key={i} className="p-3 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm text-gray-800">{role.role}</span>
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{role.count}x {role.skill_level}</span>
                            </div>
                            {role.responsibilities && (
                              <ul className="text-xs text-gray-600 list-disc list-inside">
                                {role.responsibilities.slice(0, 3).map((r, j) => <li key={j}>{r}</li>)}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 10: Resources */}
        <section
          ref={el => { sectionRefs.current['resources'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('resources')}
            className="w-full flex items-center justify-between p-6 bg-lime-50 hover:bg-lime-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-lime-100 rounded-lg">
                <Package className="w-5 h-5 text-lime-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Resource Requirements</h2>
                <p className="text-sm text-gray-500">Tools, services, and infrastructure</p>
              </div>
            </div>
            {expandedSections.resources ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.resources && result.resource_requirements && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.resource_requirements.tools_needed && result.resource_requirements.tools_needed.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3">Tools</h4>
                      <div className="space-y-2">
                        {result.resource_requirements.tools_needed.map((tool, i) => (
                          <div key={i} className="p-2 bg-white rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{tool.name}</span>
                              {tool.estimated_cost && <span className="text-xs text-gray-500">{tool.estimated_cost}</span>}
                            </div>
                            <p className="text-xs text-gray-600">{tool.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.resource_requirements.third_party_services && result.resource_requirements.third_party_services.length > 0 && (
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3">Third-Party Services</h4>
                      <div className="space-y-2">
                        {result.resource_requirements.third_party_services.map((service, i) => (
                          <div key={i} className="p-2 bg-white rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{service.name}</span>
                              {service.estimated_cost && <span className="text-xs text-gray-500">{service.estimated_cost}</span>}
                            </div>
                            <p className="text-xs text-gray-600">{service.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 11: Cost Estimation */}
        <section
          ref={el => { sectionRefs.current['cost'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('cost')}
            className="w-full flex items-center justify-between p-6 bg-emerald-50 hover:bg-emerald-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Cost Estimation</h2>
                <p className="text-sm text-gray-500">
                  Total first year: ${result.cost_estimation?.total_first_year?.toLocaleString() || 0}
                </p>
              </div>
            </div>
            {expandedSections.cost ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.cost && result.cost_estimation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Cost Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-blue-600">${result.cost_estimation.engineers_cost?.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Engineers</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-purple-600">${result.cost_estimation.cloud_cost?.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Cloud</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-orange-600">${result.cost_estimation.ai_api_cost?.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">AI APIs</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-green-600">${result.cost_estimation.tools_cost?.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Tools</p>
                    </div>
                  </div>

                  {/* Budget Versions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {result.cost_estimation.low_budget_version && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <h4 className="font-semibold text-green-800">{result.cost_estimation.low_budget_version.name}</h4>
                        <p className="text-2xl font-bold text-green-600 my-2">
                          ${result.cost_estimation.low_budget_version.monthly_cost?.toLocaleString()}/mo
                        </p>
                        <p className="text-sm text-gray-600">{result.cost_estimation.low_budget_version.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Annual: ${result.cost_estimation.low_budget_version.annual_cost?.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {result.cost_estimation.startup_version && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-blue-800">{result.cost_estimation.startup_version.name}</h4>
                        <p className="text-2xl font-bold text-blue-600 my-2">
                          ${result.cost_estimation.startup_version.monthly_cost?.toLocaleString()}/mo
                        </p>
                        <p className="text-sm text-gray-600">{result.cost_estimation.startup_version.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Annual: ${result.cost_estimation.startup_version.annual_cost?.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {result.cost_estimation.scale_version && (
                      <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
                        <h4 className="font-semibold text-purple-800">{result.cost_estimation.scale_version.name}</h4>
                        <p className="text-2xl font-bold text-purple-600 my-2">
                          ${result.cost_estimation.scale_version.monthly_cost?.toLocaleString()}/mo
                        </p>
                        <p className="text-sm text-gray-600">{result.cost_estimation.scale_version.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Annual: ${result.cost_estimation.scale_version.annual_cost?.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 12: Timeline */}
        <section
          ref={el => { sectionRefs.current['timeline'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('timeline')}
            className="w-full flex items-center justify-between p-6 bg-sky-50 hover:bg-sky-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 rounded-lg">
                <Clock className="w-5 h-5 text-sky-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Time Estimation</h2>
                <p className="text-sm text-gray-500">{result.time_estimation?.total_weeks || 0} total weeks</p>
              </div>
            </div>
            {expandedSections.timeline ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.timeline && result.time_estimation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Timeline Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-blue-600">{result.time_estimation.mvp_timeline}</p>
                      <p className="text-xs text-gray-600">MVP Timeline</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-purple-600">{result.time_estimation.full_product_timeline}</p>
                      <p className="text-xs text-gray-600">Full Product</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-green-600">{result.time_estimation.total_weeks} weeks</p>
                      <p className="text-xs text-gray-600">Total Duration</p>
                    </div>
                  </div>

                  {/* Milestones */}
                  {result.time_estimation.milestones && result.time_estimation.milestones.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3">Milestones</h4>
                      <div className="relative">
                        {result.time_estimation.milestones.map((milestone, i) => (
                          <div key={i} className="flex items-start gap-4 mb-4 last:mb-0">
                            <div className="flex-shrink-0 w-16 text-center">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                Week {milestone.target_week}
                              </span>
                            </div>
                            <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200">
                              <h5 className="font-medium text-gray-800">{milestone.name}</h5>
                              <ul className="mt-1 space-y-0.5">
                                {milestone.deliverables?.map((d, j) => (
                                  <li key={j} className="text-xs text-gray-600 flex items-start gap-1">
                                    <ChevronRight className="w-3 h-3 mt-0.5" />
                                    {d}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* SECTION 13: Impact Analysis */}
        <section
          ref={el => { sectionRefs.current['impact'] = el }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('impact')}
            className="w-full flex items-center justify-between p-6 bg-rose-50 hover:bg-rose-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-rose-600" />
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-gray-900">Impact Analysis</h2>
                <p className="text-sm text-gray-500">Confidence: {result.impact_analysis?.confidence_score || 0}%</p>
              </div>
            </div>
            {expandedSections.impact ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.impact && result.impact_analysis && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 space-y-6">
                  {/* Scores */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <p className="text-3xl font-bold text-blue-600">{result.impact_analysis.user_impact_score}/10</p>
                      <p className="text-xs text-gray-600">User Impact</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <p className="text-3xl font-bold text-green-600">{result.impact_analysis.business_impact_score}/10</p>
                      <p className="text-xs text-gray-600">Business Impact</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <p className="text-3xl font-bold text-purple-600">{result.impact_analysis.confidence_score}%</p>
                      <p className="text-xs text-gray-600">Confidence</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl text-center">
                      <p className="text-lg font-bold text-orange-600">{result.impact_analysis.time_to_value}</p>
                      <p className="text-xs text-gray-600">Time to Value</p>
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">User Impact</h4>
                      <p className="text-sm text-gray-700">{result.impact_analysis.user_impact}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Business Impact</h4>
                      <p className="text-sm text-gray-700">{result.impact_analysis.business_impact}</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Revenue Potential</h4>
                      <p className="text-sm text-gray-700">{result.impact_analysis.revenue_potential}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-2">Scalability Potential</h4>
                      <p className="text-sm text-gray-700">{result.impact_analysis.scalability_potential}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Metadata */}
        <div className="text-center text-xs text-gray-400 py-4">
          Analysis ID: {result.metadata?.analysis_id} |
          Processed in {result.metadata?.processing_time_ms}ms |
          Model: {result.metadata?.model_used}
        </div>
      </div>
    </div>
  )
}
