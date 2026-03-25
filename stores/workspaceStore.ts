/**
 * Workspace Store - Global workspace state management
 * Manages project context, UI state, and analysis results
 *
 * NOTE: Classic view has been removed. Only workspace view is supported.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'

interface WorkspaceState {
  projectId: string | null
  projectName: string | null
  analysisResult: ComprehensiveStrategyResult | null
  sidebarCollapsed: boolean
  sidebarWidth: number
  chatExpanded: boolean
  chatHeight: number
  activeSection: string | null
}

interface WorkspaceActions {
  // Project actions
  setProject: (projectId: string, projectName: string) => void
  clearProject: () => void

  // Analysis actions
  setAnalysisResult: (result: ComprehensiveStrategyResult | null) => void

  // UI actions
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  toggleChat: () => void
  expandChat: () => void
  collapseChat: () => void
  setChatHeight: (height: number) => void
  setActiveSection: (section: string | null) => void

  // Reset
  reset: () => void
}

type WorkspaceStore = WorkspaceState & WorkspaceActions

const initialState: WorkspaceState = {
  projectId: null,
  projectName: null,
  analysisResult: null,
  sidebarCollapsed: false,
  sidebarWidth: 320,
  chatExpanded: false,
  chatHeight: 400,
  activeSection: null,
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Project actions
        setProject: (projectId, projectName) =>
          set({ projectId, projectName }, false, 'setProject'),

        clearProject: () =>
          set(
            { projectId: null, projectName: null, analysisResult: null },
            false,
            'clearProject'
          ),

        // Analysis actions
        setAnalysisResult: (result) =>
          set({ analysisResult: result }, false, 'setAnalysisResult'),

        // UI actions
        toggleSidebar: () =>
          set(
            (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
            false,
            'toggleSidebar'
          ),

        setSidebarWidth: (width) =>
          set({ sidebarWidth: Math.max(240, Math.min(480, width)) }, false, 'setSidebarWidth'),

        toggleChat: () =>
          set((state) => ({ chatExpanded: !state.chatExpanded }), false, 'toggleChat'),

        expandChat: () => set({ chatExpanded: true }, false, 'expandChat'),

        collapseChat: () => set({ chatExpanded: false }, false, 'collapseChat'),

        setChatHeight: (height) =>
          set({ chatHeight: Math.max(200, Math.min(600, height)) }, false, 'setChatHeight'),

        setActiveSection: (section) =>
          set({ activeSection: section }, false, 'setActiveSection'),

        // Reset
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'pmcopilot-workspace',
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          sidebarWidth: state.sidebarWidth,
          chatHeight: state.chatHeight,
        }),
      }
    ),
    { name: 'WorkspaceStore' }
  )
)

// ============================================
// SELECTORS - STABLE PRIMITIVES ONLY
// ============================================

// Project selectors
export const selectProjectId = (state: WorkspaceStore) => state.projectId
export const selectProjectName = (state: WorkspaceStore) => state.projectName

// Analysis selector
export const selectAnalysisResult = (state: WorkspaceStore) => state.analysisResult

// UI selectors
export const selectSidebarCollapsed = (state: WorkspaceStore) => state.sidebarCollapsed
export const selectSidebarWidth = (state: WorkspaceStore) => state.sidebarWidth
export const selectChatExpanded = (state: WorkspaceStore) => state.chatExpanded
export const selectChatHeight = (state: WorkspaceStore) => state.chatHeight
export const selectActiveSection = (state: WorkspaceStore) => state.activeSection

// Derived boolean selectors
export const selectHasProject = (state: WorkspaceStore) => state.projectId !== null
export const selectHasAnalysis = (state: WorkspaceStore) => state.analysisResult !== null
