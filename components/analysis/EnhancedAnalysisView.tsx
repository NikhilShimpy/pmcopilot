'use client'

/**
 * Enhanced Analysis View - Advanced Product Intelligence System
 * Comprehensive visualization with 10-20x more detailed output
 * Includes: Manpower, Resources, Cost, Timeline, Gap Analysis, System Design
 */

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Users, Calendar, TrendingUp, AlertTriangle, CheckCircle,
  Package, Database, Cloud, Shield, Zap, Target, Clock, FileText,
  Download, Share2, MessageSquare, ChevronDown, ChevronUp, GripVertical
} from 'lucide-react'
import { EnhancedAnalysisResult } from '@/types/enhanced-analysis'
import { ChatPanel } from '@/components/chat/ChatPanel'

interface EnhancedAnalysisViewProps {
  analysis: EnhancedAnalysisResult
  projectId: string
  analysisId: string
}

export function EnhancedAnalysisView({
  analysis,
  projectId,
  analysisId
}: EnhancedAnalysisViewProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    problems: useRef<HTMLDivElement>(null),
    features: useRef<HTMLDivElement>(null),
    prd: useRef<HTMLDivElement>(null),
    tasks: useRef<HTMLDivElement>(null),
    manpower: useRef<HTMLDivElement>(null),
    resources: useRef<HTMLDivElement>(null),
    cost: useRef<HTMLDivElement>(null),
    timeline: useRef<HTMLDivElement>(null),
    gap: useRef<HTMLDivElement>(null),
    system: useRef<HTMLDivElement>(null),
  }

  // Scroll to section
  const scrollToSection = (section: string) => {
    const ref = sectionRefs[section as keyof typeof sectionRefs]
    if (ref?.current) {
      const offset = 100 // Account for sticky header
      const top = ref.current.getBoundingClientRect().top + window.pageYOffset - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  // Toggle section collapse
  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Drag start handler
  const handleDragStart = (e: React.DragEvent, type: string, payload: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type, payload }))
  }

  const navigation = [
    { id: 'overview', label: 'Overview', icon: <Target className="w-4 h-4" /> },
    { id: 'problems', label: 'Problems', icon: <AlertTriangle className="w-4 h-4" />, count: analysis.problems?.length },
    { id: 'features', label: 'Features', icon: <Zap className="w-4 h-4" />, count: analysis.features?.length },
    { id: 'prd', label: 'PRD', icon: <FileText className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckCircle className="w-4 h-4" />, count: analysis.tasks?.length },
    { id: 'manpower', label: 'Manpower', icon: <Users className="w-4 h-4" /> },
    { id: 'resources', label: 'Resources', icon: <Package className="w-4 h-4" /> },
    { id: 'cost', label: 'Cost', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
    { id: 'gap', label: 'Gap Analysis', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'system', label: 'System Design', icon: <Database className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Sticky Navigation Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Enhanced Analysis Results</h1>
              <p className="text-sm text-slate-600 mt-1">
                10-20x more detailed • Generated {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                AI Assistant
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>

          {/* Section Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {navigation.map((nav) => (
              <button
                key={nav.id}
                onClick={() => scrollToSection(nav.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all
                  ${activeSection === nav.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }
                `}
              >
                {nav.icon}
                <span>{nav.label}</span>
                {nav.count && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-semibold
                    ${activeSection === nav.id ? 'bg-blue-700' : 'bg-slate-200'}
                  `}>
                    {nav.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Overview Section */}
        <Section ref={sectionRefs.overview} id="overview" title="Executive Summary">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-blue-100 text-sm mb-1">Opportunity Score</p>
                <p className="text-3xl font-bold">{analysis.executive_summary_detailed?.opportunity_score || 'N/A'}/10</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Innovation Angle</p>
                <p className="text-lg font-semibold">{analysis.executive_summary_detailed?.innovation_angle || 'N/A'}</p>
              </div>
              <div>
                <p className="text-blue-100 text-sm mb-1">Market Size</p>
                <p className="text-lg font-semibold">{analysis.executive_summary_detailed?.market_opportunity || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Problems Identified"
              value={analysis.problems?.length || 0}
              icon={<AlertTriangle />}
              color="red"
            />
            <MetricCard
              label="Features Suggested"
              value={analysis.features?.length || 0}
              icon={<Zap />}
              color="purple"
            />
            <MetricCard
              label="Development Tasks"
              value={analysis.tasks?.length || 0}
              icon={<CheckCircle />}
              color="green"
            />
            <MetricCard
              label="Total Cost"
              value={`$${(analysis.cost_breakdown?.grand_total || 0).toLocaleString()}`}
              icon={<DollarSign />}
              color="blue"
            />
          </div>
        </Section>

        {/* Problems Section */}
        <Section
          ref={sectionRefs.problems}
          id="problems"
          title={`Problems Identified (${analysis.problems?.length || 0})`}
          collapsible
          collapsed={collapsedSections.problems}
          onToggle={() => toggleSection('problems')}
        >
          <div className="space-y-4">
            {analysis.problems?.map((problem, index) => (
              <DraggableCard
                key={problem.id || index}
                type="problem"
                payload={problem}
                onDragStart={handleDragStart}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">{problem.title}</h3>
                  <div className="flex gap-2">
                    <Badge color="red" label={`Severity: ${problem.severity_score}/10`} />
                    <Badge color="orange" label={`Freq: ${problem.frequency_score}/10`} />
                  </div>
                </div>
                <p className="text-slate-700 mb-3">{problem.detailed_description || problem.description}</p>
                {problem.root_cause && (
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Root Cause:</p>
                    <p className="text-sm text-slate-600">{problem.root_cause}</p>
                  </div>
                )}
                {problem.affected_users && (
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Affected Users:</p>
                    <p className="text-sm text-slate-600">{problem.affected_users}</p>
                  </div>
                )}
              </DraggableCard>
            ))}
          </div>
        </Section>

        {/* Features Section */}
        <Section
          ref={sectionRefs.features}
          id="features"
          title={`Features Suggested (${analysis.features?.length || 0})`}
          collapsible
          collapsed={collapsedSections.features}
          onToggle={() => toggleSection('features')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.features?.map((feature, index) => (
              <DraggableCard
                key={feature.id || index}
                type="feature"
                payload={feature}
                onDragStart={handleDragStart}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-slate-900">{feature.name}</h3>
                  <Badge
                    color={feature.priority === 'High' ? 'red' : feature.priority === 'Medium' ? 'orange' : 'green'}
                    label={feature.priority || 'N/A'}
                  />
                </div>
                <p className="text-slate-700 mb-3">{feature.detailed_description || feature.reason}</p>
                {feature.category && (
                  <Badge color="blue" label={feature.category.toUpperCase()} className="mb-2" />
                )}
                {feature.implementation_strategy && (
                  <div className="border-t border-slate-200 pt-3 mt-3">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Implementation Strategy:</p>
                    <p className="text-sm text-slate-600">{feature.implementation_strategy}</p>
                  </div>
                )}
              </DraggableCard>
            ))}
          </div>
        </Section>

        {/* PRD Section */}
        <Section
          ref={sectionRefs.prd}
          id="prd"
          title="Product Requirements Document"
          collapsible
          collapsed={collapsedSections.prd}
          onToggle={() => toggleSection('prd')}
        >
          {analysis.prd && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Vision & Problem Statement</h3>
                <p className="text-slate-700">{analysis.prd.vision}</p>
                <p className="text-slate-700 mt-3">{analysis.prd.problem_statement}</p>
              </div>

              {analysis.prd.user_personas && analysis.prd.user_personas.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">User Personas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.prd.user_personas.map((persona: any, index: number) => (
                      <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-900">{persona.name || `Persona ${index + 1}`}</h4>
                        <p className="text-sm text-slate-600 mt-1">{persona.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.prd.goals && analysis.prd.goals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Goals</h3>
                  <ul className="list-disc list-inside space-y-2">
                    {analysis.prd.goals.map((goal: string, index: number) => (
                      <li key={index} className="text-slate-700">{goal}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Tasks Section */}
        <Section
          ref={sectionRefs.tasks}
          id="tasks"
          title={`Development Tasks (${analysis.tasks?.length || 0})`}
          collapsible
          collapsed={collapsedSections.tasks}
          onToggle={() => toggleSection('tasks')}
        >
          <div className="space-y-3">
            {analysis.tasks?.map((task, index) => (
              <DraggableCard
                key={task.id || index}
                type="task"
                payload={task}
                onDragStart={handleDragStart}
                compact
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{task.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Badge color="blue" label={task.type || 'N/A'} />
                    <Badge color="purple" label={`${task.story_points || 0} SP`} />
                  </div>
                </div>
              </DraggableCard>
            ))}
          </div>
        </Section>

        {/* Manpower Section */}
        <Section
          ref={sectionRefs.manpower}
          id="manpower"
          title="Manpower & Team Structure"
          collapsible
          collapsed={collapsedSections.manpower}
          onToggle={() => toggleSection('manpower')}
        >
          {analysis.manpower && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard label="Total Team Size" value={analysis.manpower.total_people || 0} icon={<Users />} />
                <MetricCard label="Person-Weeks" value={analysis.manpower.total_person_weeks || 0} icon={<Calendar />} />
                <MetricCard label="Functions" value={Object.keys(analysis.manpower.by_function || {}).length} icon={<Target />} />
              </div>

              {analysis.manpower.by_function && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Team by Function</h3>
                  <div className="space-y-3">
                    {Object.entries(analysis.manpower.by_function).map(([function_name, roles]: [string, any]) => (
                      <div key={function_name} className="bg-white rounded-lg border border-slate-200 p-4">
                        <h4 className="font-semibold text-slate-900 capitalize mb-2">
                          {function_name.replace('_', ' ')}
                        </h4>
                        <div className="space-y-2">
                          {Array.isArray(roles) && roles.map((role: any, index: number) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium text-slate-700">{role.role}</span>
                                <span className="text-slate-500 ml-2">({role.seniority})</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-slate-600">{role.count}x {role.type}</span>
                                <span className="text-slate-600">${role.estimated_cost_usd?.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Resources Section */}
        <Section
          ref={sectionRefs.resources}
          id="resources"
          title="Technical Resources & Infrastructure"
          collapsible
          collapsed={collapsedSections.resources}
          onToggle={() => toggleSection('resources')}
        >
          {analysis.resources && (
            <div className="space-y-4">
              {analysis.resources.technical?.infrastructure?.items && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    Infrastructure
                  </h3>
                  <div className="space-y-2">
                    {analysis.resources.technical.infrastructure.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <span className="font-medium text-slate-700">{item.resource}</span>
                          <span className="text-slate-500 ml-2">({item.provider})</span>
                        </div>
                        <span className="text-slate-700 font-semibold">${item.monthly_cost_usd}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.resources.technical?.software_licenses?.items && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Software Licenses
                  </h3>
                  <div className="space-y-2">
                    {analysis.resources.technical.software_licenses.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                        <span className="font-medium text-slate-700">{item.software}</span>
                        <span className="text-slate-700 font-semibold">${item.monthly_cost_usd}/mo</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Cost Breakdown Section */}
        <Section
          ref={sectionRefs.cost}
          id="cost"
          title="Cost Breakdown & Financial Projections"
          collapsible
          collapsed={collapsedSections.cost}
          onToggle={() => toggleSection('cost')}
        >
          {analysis.cost_breakdown && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-green-100 text-sm mb-1">Grand Total</p>
                    <p className="text-3xl font-bold">${analysis.cost_breakdown.grand_total?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-green-100 text-sm mb-1">Infrastructure Cost</p>
                    <p className="text-3xl font-bold">${analysis.cost_breakdown.infrastructure?.total?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-green-100 text-sm mb-1">Development Cost</p>
                    <p className="text-3xl font-bold">${analysis.cost_breakdown.development?.total?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {analysis.cost_breakdown.breakdown_by_phase && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Cost by Phase</h3>
                  <div className="space-y-2">
                    {Object.entries(analysis.cost_breakdown.breakdown_by_phase).map(([phase, cost]: [string, any]) => (
                      <div key={phase} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <span className="font-medium text-slate-700 capitalize">{phase.replace('_', ' ')}</span>
                        <span className="text-lg font-bold text-slate-900">${cost?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Timeline Section */}
        <Section
          ref={sectionRefs.timeline}
          id="timeline"
          title="Project Timeline & Milestones"
          collapsible
          collapsed={collapsedSections.timeline}
          onToggle={() => toggleSection('timeline')}
        >
          {analysis.timeline && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  label="Total Duration"
                  value={`${analysis.timeline.total_duration_weeks} weeks`}
                  icon={<Clock />}
                />
                <MetricCard
                  label="Phases"
                  value={analysis.timeline.phases?.length || 0}
                  icon={<Calendar />}
                />
              </div>

              {analysis.timeline.phases && (
                <div className="space-y-3">
                  {analysis.timeline.phases.map((phase: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-slate-900">{phase.phase_name}</h4>
                          <p className="text-sm text-slate-600 mt-1">{phase.description}</p>
                        </div>
                        <Badge color="blue" label={`${phase.duration_weeks} weeks`} />
                      </div>
                      {phase.milestones && phase.milestones.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {phase.milestones.map((milestone: string, mIndex: number) => (
                            <div key={mIndex} className="flex items-center gap-2 text-sm text-slate-600">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {milestone}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Gap Analysis Section */}
        <Section
          ref={sectionRefs.gap}
          id="gap"
          title="Gap Analysis"
          collapsible
          collapsed={collapsedSections.gap}
          onToggle={() => toggleSection('gap')}
        >
          {analysis.gap_analysis && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Current State</h3>
                  {analysis.gap_analysis.current_state?.what_exists && (
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-slate-600 mb-1">What Exists:</p>
                      <ul className="list-disc list-inside text-sm text-slate-700">
                        {analysis.gap_analysis.current_state.what_exists.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.gap_analysis.current_state?.current_limitations && (
                    <div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">Limitations:</p>
                      <ul className="list-disc list-inside text-sm text-slate-700">
                        {analysis.gap_analysis.current_state.current_limitations.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Desired State</h3>
                  {analysis.gap_analysis.desired_state?.target_capabilities && (
                    <div className="mb-2">
                      <p className="text-sm font-semibold text-slate-600 mb-1">Target Capabilities:</p>
                      <ul className="list-disc list-inside text-sm text-slate-700">
                        {analysis.gap_analysis.desired_state.target_capabilities.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.gap_analysis.desired_state?.success_criteria && (
                    <div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">Success Criteria:</p>
                      <ul className="list-disc list-inside text-sm text-slate-700">
                        {analysis.gap_analysis.desired_state.success_criteria.map((item: string, i: number) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {analysis.gap_analysis.gaps && analysis.gap_analysis.gaps.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Identified Gaps</h3>
                  <ul className="space-y-2">
                    {analysis.gap_analysis.gaps.map((gap: any, index: number) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-slate-700">{gap.description || gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* System Design Section */}
        <Section
          ref={sectionRefs.system}
          id="system"
          title="System Design & Architecture"
          collapsible
          collapsed={collapsedSections.system}
          onToggle={() => toggleSection('system')}
        >
          {analysis.system_design && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Architecture Overview
                </h3>
                <p className="text-slate-700">{analysis.system_design.architecture}</p>
              </div>

              {analysis.system_design.components && analysis.system_design.components.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Key Components</h3>
                  <div className="space-y-3">
                    {analysis.system_design.components.map((component: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4">
                        <h4 className="font-semibold text-slate-900">{component.name}</h4>
                        <p className="text-sm text-slate-600 mt-1">{component.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.system_design.scalability && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Scalability
                    </h3>
                    <div className="text-sm text-slate-700 space-y-1">
                      <p><strong>Horizontal:</strong> {analysis.system_design.scalability.horizontal_scaling}</p>
                      <p><strong>Vertical:</strong> {analysis.system_design.scalability.vertical_scaling}</p>
                      <p><strong>Load Balancing:</strong> {analysis.system_design.scalability.load_balancing}</p>
                      <p><strong>Caching:</strong> {analysis.system_design.scalability.caching_strategy}</p>
                    </div>
                  </div>
                )}

                {analysis.system_design.security && (
                  <div className="bg-white rounded-lg border border-slate-200 p-4">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Security
                    </h3>
                    <div className="text-sm text-slate-700 space-y-1">
                      <p><strong>Authentication:</strong> {analysis.system_design.security.authentication}</p>
                      <p><strong>Authorization:</strong> {analysis.system_design.security.authorization}</p>
                      <p><strong>Encryption:</strong> {analysis.system_design.security.data_encryption}</p>
                      <p><strong>API Security:</strong> {analysis.system_design.security.api_security}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Chat Panel */}
      {isChatOpen && (
        <ChatPanel
          // @ts-expect-error - Type compatibility
          analysis={analysis}
          projectId={projectId}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  )
}

// Utility Components

interface SectionProps {
  id: string
  title: string
  children: React.ReactNode
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

const Section = React.forwardRef<HTMLDivElement, SectionProps>(
  ({ id, title, children, collapsible, collapsed, onToggle }, ref) => {
    return (
      <div ref={ref} id={id} className="scroll-mt-24">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            className={`bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between ${
              collapsible ? 'cursor-pointer hover:bg-slate-100' : ''
            }`}
            onClick={collapsible ? onToggle : undefined}
          >
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            {collapsible && (
              <button className="p-1 hover:bg-slate-200 rounded">
                {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
              </button>
            )}
          </div>
          {!collapsed && <div className="p-6">{children}</div>}
        </div>
      </div>
    )
  }
)
Section.displayName = 'Section'

function MetricCard({
  label,
  value,
  icon,
  color = 'blue'
}: {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
}) {
  const colorClasses = {
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} text-white flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function DraggableCard({
  type,
  payload,
  children,
  onDragStart,
  compact = false
}: {
  type: string
  payload: any
  children: React.ReactNode
  onDragStart: (e: React.DragEvent, type: string, payload: any) => void
  compact?: boolean
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, type, payload)}
      className={`
        bg-white rounded-lg border border-slate-200 ${compact ? 'p-3' : 'p-4'}
        hover:shadow-md hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing
        group
      `}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors">
          <GripVertical className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}

function Badge({
  label,
  color = 'blue',
  className = ''
}: {
  label: string
  color?: string
  className?: string
}) {
  const colorClasses = {
    red: 'bg-red-100 text-red-700 border-red-300',
    blue: 'bg-blue-100 text-blue-700 border-blue-300',
    green: 'bg-green-100 text-green-700 border-green-300',
    purple: 'bg-purple-100 text-purple-700 border-purple-300',
    orange: 'bg-orange-100 text-orange-700 border-orange-300',
  }

  return (
    <span className={`
      inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border
      ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}
      ${className}
    `}>
      {label}
    </span>
  )
}
