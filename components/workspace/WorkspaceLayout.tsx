/**
 * Workspace Layout - Main Emergent-style container
 * Combines component sidebar, canvas, and bottom chat
 *
 * FIXED: Eliminated infinite render loops by:
 * 1. Using stable refs to track analysis changes
 * 2. Memoizing all callback handlers
 * 3. Using shallow selectors for store subscriptions
 */

'use client'

import React, { useEffect, useRef, useCallback, useMemo } from 'react'
import { DndProvider } from '@/components/dnd/DndProvider'
import { ComponentSidebar } from './ComponentSidebar'
import { Canvas } from './Canvas'
import { BottomChat } from './BottomChat'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useChatStore } from '@/stores/chatStore'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'
import type { Project } from '@/types'

interface WorkspaceLayoutProps {
  project: Project
  analysisResult: ComprehensiveStrategyResult | null
  className?: string
}

export function WorkspaceLayout({
  project,
  analysisResult,
  className = '',
}: WorkspaceLayoutProps) {
  // FIXED: Use individual selectors to prevent over-subscription
  const setProject = useWorkspaceStore((state) => state.setProject)
  const setAnalysisResult = useWorkspaceStore((state) => state.setAnalysisResult)
  const expandChat = useWorkspaceStore((state) => state.expandChat)

  const addItem = useCanvasStore((state) => state.addItem)

  const setInputValue = useChatStore((state) => state.setInputValue)
  const generateQueryFromDroppedItem = useChatStore((state) => state.generateQueryFromDroppedItem)

  // Track analysis by stable identifier to prevent object reference issues
  const lastAnalysisIdRef = useRef<string | null>(null)
  const lastProjectIdRef = useRef<string | null>(null)

  // Initialize workspace with project - only when project.id actually changes
  useEffect(() => {
    if (lastProjectIdRef.current !== project.id) {
      lastProjectIdRef.current = project.id
      setProject(project.id, project.name)
    }
  }, [project.id, project.name, setProject])

  // FIXED: Handle analysis result with proper change detection
  // Uses stable ID comparison to prevent infinite loops
  useEffect(() => {
    // Create a stable identifier from the analysis result
    const currentAnalysisId = analysisResult?.metadata?.analysis_id ?? null

    // Only update store if analysis ID actually changed
    if (currentAnalysisId !== lastAnalysisIdRef.current) {
      lastAnalysisIdRef.current = currentAnalysisId
      setAnalysisResult(analysisResult)
    }
  }, [analysisResult?.metadata?.analysis_id, setAnalysisResult]) // FIXED: Only depend on stable ID, not entire object

  // CRITICAL FIX: Memoize handlers to prevent DndProvider re-renders
  const handleDropToCanvas = useCallback((item: any, position: { x: number; y: number }) => {
    addItem(item, position)
  }, [addItem])

  // CRITICAL FIX: Memoize handlers to prevent DndProvider re-renders
  const handleDropToChat = useCallback((item: any) => {
    const query = generateQueryFromDroppedItem(item)
    setInputValue(query)
    expandChat()
  }, [generateQueryFromDroppedItem, setInputValue, expandChat])

  // FIXED: Memoize analysisResult reference for child components
  // Only changes when actual content changes, not on every render
  const stableAnalysisResult = useMemo(() => analysisResult, [
    analysisResult?.metadata?.analysis_id,
    analysisResult?.problem_analysis?.length,
    analysisResult?.feature_system?.length,
    analysisResult?.development_tasks?.length,
  ])

  return (
    <DndProvider onDropToCanvas={handleDropToCanvas} onDropToChat={handleDropToChat}>
      <div className={`flex flex-col h-screen bg-slate-50 ${className}`}>
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Component Sidebar */}
          <ComponentSidebar analysisResult={stableAnalysisResult} />

          {/* Center: Canvas */}
          <Canvas className="flex-1" />
        </div>

        {/* Bottom: Chat Panel (sticky) */}
        <BottomChat
          projectId={project.id}
          analysisResult={stableAnalysisResult}
        />
      </div>
    </DndProvider>
  )
}

export default WorkspaceLayout
