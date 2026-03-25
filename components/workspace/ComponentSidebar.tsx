/**
 * Component Sidebar - Left panel with draggable cards
 * Shows problems, features, tasks, and action prompts
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Search,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Zap,
  X,
  ChevronRight,
} from 'lucide-react'
import { ProblemCard } from '@/components/cards/ProblemCard'
import { FeatureCard } from '@/components/cards/FeatureCard'
import { TaskCard } from '@/components/cards/TaskCard'
import { AllPromptCards } from '@/components/cards/PromptCard'
import { useWorkspaceStore, selectSidebarCollapsed } from '@/stores/workspaceStore'
import { useChatStore } from '@/stores/chatStore'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'

interface SidebarSectionProps {
  title: string
  icon: React.ElementType
  count: number
  children: React.ReactNode
  defaultExpanded?: boolean
}

function SidebarSection({
  title,
  icon: Icon,
  count,
  children,
  defaultExpanded = true,
}: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border-b border-slate-200 last:border-0">
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsExpanded(!isExpanded)
        }}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors text-left"
        type="button"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-sm text-slate-700">{title}</span>
          <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
            {count}
          </span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-2 max-h-[400px] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface ComponentSidebarProps {
  analysisResult: ComprehensiveStrategyResult | null
  className?: string
}

export function ComponentSidebar({
  analysisResult,
  className = '',
}: ComponentSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  // FIXED: Use individual selectors to prevent over-subscription
  const sidebarCollapsed = useWorkspaceStore(selectSidebarCollapsed)
  const toggleSidebar = useWorkspaceStore((state) => state.toggleSidebar)
  const expandChat = useWorkspaceStore((state) => state.expandChat)

  // Filter items based on search
  const filteredProblems = useMemo(() => {
    if (!analysisResult?.problem_analysis) return []
    if (!searchQuery) return analysisResult.problem_analysis

    const query = searchQuery.toLowerCase()
    return analysisResult.problem_analysis.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.deep_description.toLowerCase().includes(query)
    )
  }, [analysisResult?.problem_analysis, searchQuery])

  const filteredFeatures = useMemo(() => {
    if (!analysisResult?.feature_system) return []
    if (!searchQuery) return analysisResult.feature_system

    const query = searchQuery.toLowerCase()
    return analysisResult.feature_system.filter(
      (f) =>
        f.name.toLowerCase().includes(query) ||
        f.detailed_description.toLowerCase().includes(query)
    )
  }, [analysisResult?.feature_system, searchQuery])

  const filteredTasks = useMemo(() => {
    if (!analysisResult?.development_tasks) return []
    if (!searchQuery) return analysisResult.development_tasks

    const query = searchQuery.toLowerCase()
    return analysisResult.development_tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.expected_output.toLowerCase().includes(query)
    )
  }, [analysisResult?.development_tasks, searchQuery])

  if (sidebarCollapsed) {
    return (
      <div className={`w-14 bg-white border-r border-slate-200 flex flex-col ${className}`}>
        <button
          onClick={toggleSidebar}
          className="p-3 hover:bg-slate-50 border-b border-slate-200"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1 flex flex-col items-center gap-4 p-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <Sparkles className="w-5 h-5 text-purple-500" />
          <CheckSquare className="w-5 h-5 text-blue-500" />
          <Zap className="w-5 h-5 text-amber-500" />
        </div>
      </div>
    )
  }

  return (
    <div className={`w-80 bg-white border-r border-slate-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Components</h2>
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            title="Collapse sidebar"
          >
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-2">
          Drag items to canvas or chat
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!analysisResult ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium mb-1">
              No Analysis Yet
            </p>
            <p className="text-xs text-slate-500">
              Run an analysis to see draggable components
            </p>
          </div>
        ) : (
          <>
            {/* Problems Section */}
            <SidebarSection
              title="Problems"
              icon={AlertCircle}
              count={filteredProblems.length}
              defaultExpanded={true}
            >
              {filteredProblems.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  {searchQuery ? 'No matching problems' : 'No problems identified'}
                </p>
              ) : (
                filteredProblems.map((problem, index) => (
                  <ProblemCard
                    key={problem.id}
                    problem={problem}
                    index={index}
                  />
                ))
              )}
            </SidebarSection>

            {/* Features Section */}
            <SidebarSection
              title="Features"
              icon={Sparkles}
              count={filteredFeatures.length}
              defaultExpanded={true}
            >
              {filteredFeatures.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  {searchQuery ? 'No matching features' : 'No features generated'}
                </p>
              ) : (
                filteredFeatures.map((feature, index) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    index={index}
                  />
                ))
              )}
            </SidebarSection>

            {/* Tasks Section */}
            <SidebarSection
              title="Tasks"
              icon={CheckSquare}
              count={filteredTasks.length}
              defaultExpanded={false}
            >
              {filteredTasks.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  {searchQuery ? 'No matching tasks' : 'No tasks generated'}
                </p>
              ) : (
                filteredTasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                  />
                ))
              )}
            </SidebarSection>

            {/* Actions Section */}
            <SidebarSection
              title="Quick Actions"
              icon={Zap}
              count={8}
              defaultExpanded={false}
            >
              <AllPromptCards
                onPromptClick={(prompt) => {
                  // Add prompt to chat input and expand chat
                  useChatStore.getState().setInputValue(prompt.prompt)
                  expandChat()
                }}
              />
            </SidebarSection>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <p className="text-xs text-slate-500 text-center">
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
            Cmd
          </kbd>
          {' + '}
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px]">
            K
          </kbd>
          {' to open chat'}
        </p>
      </div>
    </div>
  )
}

export default ComponentSidebar
