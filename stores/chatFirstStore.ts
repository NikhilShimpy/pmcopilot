/**
 * Chat-First Store - Central state for the new chat-centered architecture
 * Manages chat history per section, streaming, depth control, and section filtering
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ============================================
// TYPES
// ============================================

export type OutputDepth = 'short' | 'medium' | 'long' | 'extra-long'

export type SectionId =
  | 'all'
  | 'executive-dashboard'
  | 'problem-analysis'
  | 'feature-system'
  | 'gaps-opportunities'
  | 'prd'
  | 'system-design'
  | 'development-tasks'
  | 'execution-roadmap'
  | 'manpower-planning'
  | 'resources'
  | 'cost-estimation'
  | 'timeline'
  | 'impact-analysis'

export interface SectionInfo {
  id: SectionId
  label: string
  icon: string
  description: string
}

export const SECTIONS: SectionInfo[] = [
  { id: 'all', label: 'All Sections', icon: 'LayoutDashboard', description: 'View complete analysis' },
  { id: 'executive-dashboard', label: 'Executive Dashboard', icon: 'Briefcase', description: 'High-level project overview' },
  { id: 'problem-analysis', label: 'Problem Analysis', icon: 'AlertTriangle', description: 'Identified problems and pain points' },
  { id: 'feature-system', label: 'Feature System', icon: 'Layers', description: 'Suggested features and capabilities' },
  { id: 'gaps-opportunities', label: 'Gaps & Opportunities', icon: 'Target', description: 'Market gaps and growth opportunities' },
  { id: 'prd', label: 'PRD', icon: 'FileText', description: 'Product Requirements Document' },
  { id: 'system-design', label: 'System Design', icon: 'Server', description: 'Technical architecture and design' },
  { id: 'development-tasks', label: 'Development Tasks', icon: 'CheckSquare', description: 'Implementation tasks and priorities' },
  { id: 'execution-roadmap', label: 'Execution Roadmap', icon: 'Map', description: 'Project timeline and milestones' },
  { id: 'manpower-planning', label: 'Manpower Planning', icon: 'Users', description: 'Team structure and roles' },
  { id: 'resources', label: 'Resources', icon: 'Package', description: 'Required tools and infrastructure' },
  { id: 'cost-estimation', label: 'Cost Estimation', icon: 'IndianRupee', description: 'Budget breakdown in INR' },
  { id: 'timeline', label: 'Timeline', icon: 'Calendar', description: 'Project schedule and phases' },
  { id: 'impact-analysis', label: 'Impact Analysis', icon: 'TrendingUp', description: 'Expected outcomes and metrics' },
]

export type ChatMessageRole = 'user' | 'assistant' | 'system'

export interface StructuredSection {
  id: string
  title: string
  type: SectionId
  content: string
  isExpanded: boolean
}

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  timestamp: Date
  isStreaming?: boolean
  sections?: StructuredSection[]
  droppedContext?: DroppedContext[]
  depth?: OutputDepth
  error?: string
  thinkingSteps?: string[]
}

export interface DroppedContext {
  id: string
  type: 'problem' | 'feature' | 'task' | 'section' | 'text'
  title: string
  content: string
}

export type StreamingPhase =
  | 'idle'
  | 'connecting'
  | 'analyzing-input'
  | 'identifying-problems'
  | 'generating-features'
  | 'creating-prd'
  | 'estimating-costs'
  | 'streaming'
  | 'complete'
  | 'error'

export interface ChatFirstState {
  // Section state
  activeSection: SectionId
  sectionHistory: Record<SectionId, ChatMessage[]>

  // Current chat state
  messages: ChatMessage[]
  inputValue: string
  droppedContexts: DroppedContext[]

  // Depth control
  outputDepth: OutputDepth

  // Streaming state
  streamingPhase: StreamingPhase
  thinkingMessage: string
  error: string | null

  // UI state
  sidebarExpanded: boolean
  sidebarHovered: boolean
  inputFocused: boolean

  // Project context
  projectId: string | null
  projectName: string | null
}

interface ChatFirstActions {
  // Section navigation
  setActiveSection: (section: SectionId) => void

  // Messages
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void
  appendToMessage: (id: string, content: string) => void
  setMessageSections: (id: string, sections: StructuredSection[]) => void
  clearMessages: () => void

  // Input management
  setInputValue: (value: string) => void
  clearInput: () => void

  // Dropped context (drag & drop)
  addDroppedContext: (context: DroppedContext) => void
  removeDroppedContext: (id: string) => void
  clearDroppedContexts: () => void

  // Depth control
  setOutputDepth: (depth: OutputDepth) => void

  // Streaming state
  setStreamingPhase: (phase: StreamingPhase) => void
  setThinkingMessage: (message: string) => void
  setError: (error: string | null) => void

  // Sidebar
  setSidebarExpanded: (expanded: boolean) => void
  setSidebarHovered: (hovered: boolean) => void
  setInputFocused: (focused: boolean) => void

  // Project
  setProject: (projectId: string, projectName: string) => void
  clearProject: () => void

  // Reset
  reset: () => void
}

type ChatFirstStore = ChatFirstState & ChatFirstActions

// ============================================
// HELPERS
// ============================================

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `# Welcome to PMCopilot 🚀

I'm your AI Product Operating System. I can help you transform feedback into actionable product strategy.

## How to use me:

**Paste or upload your input:**
- Product feedback
- User interviews
- Feature requests
- Competitor analysis

**Or ask me anything:**
- "Generate a PRD for a food delivery app"
- "What are the key problems in my feedback?"
- "Estimate costs for building an MVP"

**Quick actions:**
- Drag items from any section to ask specific questions
- Use the depth selector to control response length
- Click sidebar sections to filter outputs

*Ready when you are!*`,
  timestamp: new Date(),
}

const initialSectionHistory: Record<SectionId, ChatMessage[]> = {
  'all': [WELCOME_MESSAGE],
  'executive-dashboard': [],
  'problem-analysis': [],
  'feature-system': [],
  'gaps-opportunities': [],
  'prd': [],
  'system-design': [],
  'development-tasks': [],
  'execution-roadmap': [],
  'manpower-planning': [],
  'resources': [],
  'cost-estimation': [],
  'timeline': [],
  'impact-analysis': [],
}

const initialState: ChatFirstState = {
  activeSection: 'all',
  sectionHistory: initialSectionHistory,
  messages: [WELCOME_MESSAGE],
  inputValue: '',
  droppedContexts: [],
  outputDepth: 'medium',
  streamingPhase: 'idle',
  thinkingMessage: '',
  error: null,
  sidebarExpanded: false,
  sidebarHovered: false,
  inputFocused: false,
  projectId: null,
  projectName: null,
}

// ============================================
// STORE
// ============================================

export const useChatFirstStore = create<ChatFirstStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Section navigation
        setActiveSection: (section) => {
          const { sectionHistory } = get()
          set({
            activeSection: section,
            messages: sectionHistory[section] || [],
          }, false, 'setActiveSection')
        },

        // Messages
        addMessage: (message) => {
          const id = generateId()
          const newMessage: ChatMessage = {
            ...message,
            id,
            timestamp: new Date(),
          }

          set((state) => {
            const updatedMessages = [...state.messages, newMessage]
            const updatedHistory = {
              ...state.sectionHistory,
              [state.activeSection]: updatedMessages,
            }

            // Also update 'all' section if not currently in it
            if (state.activeSection !== 'all') {
              updatedHistory.all = [...state.sectionHistory.all, newMessage]
            }

            return {
              messages: updatedMessages,
              sectionHistory: updatedHistory,
            }
          }, false, 'addMessage')

          return id
        },

        updateMessage: (id, updates) =>
          set((state) => {
            const updatedMessages = state.messages.map((msg) =>
              msg.id === id ? { ...msg, ...updates } : msg
            )
            const updatedHistory = {
              ...state.sectionHistory,
              [state.activeSection]: updatedMessages,
            }

            return {
              messages: updatedMessages,
              sectionHistory: updatedHistory,
            }
          }, false, 'updateMessage'),

        appendToMessage: (id, content) =>
          set((state) => {
            const updatedMessages = state.messages.map((msg) =>
              msg.id === id ? { ...msg, content: msg.content + content } : msg
            )
            const updatedHistory = {
              ...state.sectionHistory,
              [state.activeSection]: updatedMessages,
            }

            return {
              messages: updatedMessages,
              sectionHistory: updatedHistory,
            }
          }, false, 'appendToMessage'),

        setMessageSections: (id, sections) =>
          set((state) => {
            const updatedMessages = state.messages.map((msg) =>
              msg.id === id ? { ...msg, sections } : msg
            )
            const updatedHistory = {
              ...state.sectionHistory,
              [state.activeSection]: updatedMessages,
            }

            return {
              messages: updatedMessages,
              sectionHistory: updatedHistory,
            }
          }, false, 'setMessageSections'),

        clearMessages: () =>
          set((state) => ({
            messages: [WELCOME_MESSAGE],
            sectionHistory: {
              ...state.sectionHistory,
              [state.activeSection]: [WELCOME_MESSAGE],
            },
          }), false, 'clearMessages'),

        // Input management
        setInputValue: (value) => set({ inputValue: value }, false, 'setInputValue'),
        clearInput: () => set({ inputValue: '' }, false, 'clearInput'),

        // Dropped context
        addDroppedContext: (context) =>
          set((state) => ({
            droppedContexts: [...state.droppedContexts, context],
          }), false, 'addDroppedContext'),

        removeDroppedContext: (id) =>
          set((state) => ({
            droppedContexts: state.droppedContexts.filter((c) => c.id !== id),
          }), false, 'removeDroppedContext'),

        clearDroppedContexts: () =>
          set({ droppedContexts: [] }, false, 'clearDroppedContexts'),

        // Depth control
        setOutputDepth: (depth) => set({ outputDepth: depth }, false, 'setOutputDepth'),

        // Streaming state
        setStreamingPhase: (phase) => set({ streamingPhase: phase }, false, 'setStreamingPhase'),
        setThinkingMessage: (message) => set({ thinkingMessage: message }, false, 'setThinkingMessage'),
        setError: (error) => set({ error, streamingPhase: error ? 'error' : 'idle' }, false, 'setError'),

        // Sidebar
        setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }, false, 'setSidebarExpanded'),
        setSidebarHovered: (hovered) => set({ sidebarHovered: hovered }, false, 'setSidebarHovered'),
        setInputFocused: (focused) => set({ inputFocused: focused }, false, 'setInputFocused'),

        // Project
        setProject: (projectId, projectName) =>
          set({ projectId, projectName }, false, 'setProject'),

        clearProject: () =>
          set({ projectId: null, projectName: null }, false, 'clearProject'),

        // Reset
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'pmcopilot-chat-first',
        partialize: (state) => ({
          outputDepth: state.outputDepth,
          sidebarExpanded: state.sidebarExpanded,
        }),
      }
    ),
    { name: 'ChatFirstStore' }
  )
)

// ============================================
// SELECTORS
// ============================================

export const selectActiveSection = (state: ChatFirstStore) => state.activeSection
export const selectMessages = (state: ChatFirstStore) => state.messages
export const selectInputValue = (state: ChatFirstStore) => state.inputValue
export const selectDroppedContexts = (state: ChatFirstStore) => state.droppedContexts
export const selectOutputDepth = (state: ChatFirstStore) => state.outputDepth
export const selectStreamingPhase = (state: ChatFirstStore) => state.streamingPhase
export const selectThinkingMessage = (state: ChatFirstStore) => state.thinkingMessage
export const selectError = (state: ChatFirstStore) => state.error
export const selectSidebarExpanded = (state: ChatFirstStore) => state.sidebarExpanded
export const selectSidebarHovered = (state: ChatFirstStore) => state.sidebarHovered
export const selectInputFocused = (state: ChatFirstStore) => state.inputFocused
export const selectProjectName = (state: ChatFirstStore) => state.projectName

// Derived selectors
export const selectIsStreaming = (state: ChatFirstStore) =>
  state.streamingPhase !== 'idle' && state.streamingPhase !== 'complete' && state.streamingPhase !== 'error'

export const selectIsThinking = (state: ChatFirstStore) =>
  ['connecting', 'analyzing-input', 'identifying-problems', 'generating-features', 'creating-prd', 'estimating-costs'].includes(state.streamingPhase)

export const selectSidebarVisible = (state: ChatFirstStore) =>
  state.sidebarExpanded || state.sidebarHovered
