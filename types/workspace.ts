/**
 * Workspace Types - Drag & Drop Canvas System
 * Types for the interactive workspace
 *
 * NOTE: Classic view has been removed. Only workspace view is supported.
 */

import { ComprehensiveStrategyResult } from './comprehensive-strategy'

// ============================================
// DRAGGABLE ITEM TYPES
// ============================================

export type DraggableItemType =
  | 'problem'
  | 'feature'
  | 'task'
  | 'prd-section'
  | 'timeline'
  | 'database-schema'
  | 'integration'
  | 'prompt'

export interface DraggableItem {
  id: string
  type: DraggableItemType
  payload: unknown
  metadata?: {
    sourceSection?: string
    originalIndex?: number
    title?: string
    subtitle?: string
  }
}

// ============================================
// CANVAS TYPES
// ============================================

export interface Position {
  x: number
  y: number
}

export interface Dimensions {
  width: number
  height: number
}

export interface CanvasItem extends DraggableItem {
  canvasId: string
  position: Position
  dimensions: Dimensions
  zIndex: number
  locked: boolean
  expanded: boolean
}

export interface SelectionBox {
  start: Position | null
  end: Position | null
}

export interface SelectionState {
  selectedIds: Set<string>
  selectionBox: SelectionBox | null
}

// ============================================
// PROMPT CARD TYPES
// ============================================

export type PromptCategory = 'expand' | 'detail' | 'compare' | 'generate'

export interface PromptCard {
  id: string
  label: string
  prompt: string
  description: string
  icon: string // Lucide icon name
  category: PromptCategory
  requiresItem?: boolean // If true, needs a dragged item as context
}

// ============================================
// DROP ZONE TYPES
// ============================================

export type DropZoneId = 'canvas' | 'chat-input' | 'compare-zone' | 'trash'

export interface DropResult {
  zoneId: DropZoneId
  item: DraggableItem
  position?: Position
}

// ============================================
// CHAT TYPES
// ============================================

export type ChatStatus = 'idle' | 'thinking' | 'streaming' | 'error' | 'timeout'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  droppedItem?: DraggableItem // Item that triggered this message
  error?: string
}

export interface ChatContext {
  projectId: string
  analysisId?: string
  droppedItems?: DraggableItem[]
}

// ============================================
// WORKSPACE STATE
// ============================================

export interface WorkspaceState {
  // Project context
  projectId: string | null
  projectName: string | null
  analysisResult: ComprehensiveStrategyResult | null

  // UI State
  sidebarCollapsed: boolean
  sidebarWidth: number
  chatExpanded: boolean
  chatHeight: number
  activeSection: string | null
}

// ============================================
// INR PRICING TYPES
// ============================================

export interface INRAmount {
  amount: number
  formatted: string // "₹1,50,000"
  inLakhs?: string // "1.5L"
  inCrores?: string // "1.5Cr"
}

export interface SalaryRange {
  min: number
  max: number
  minFormatted: string
  maxFormatted: string
  label: string // "₹8L - ₹15L per annum"
  perMonth: {
    min: number
    max: number
    label: string // "₹67K - ₹1.25L per month"
  }
}

export type SeniorityLevel = 'Intern' | 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal' | 'Director'

export interface RoleSalary {
  role: string
  level: SeniorityLevel
  salary: SalaryRange
  responsibilities: string[]
  skills: string[]
}

// ============================================
// COST BREAKDOWN TYPES
// ============================================

export interface CostCategory {
  category: string
  items: {
    name: string
    cost: INRAmount
    perUnit?: string // "per month", "per hour", "one-time"
    notes?: string
  }[]
  subtotal: INRAmount
}

export interface CostEstimate {
  phase: 'MVP' | 'Growth' | 'Scale'
  duration: string // "3-4 months"
  teamSize: number
  categories: CostCategory[]
  total: INRAmount
  assumptions: string[]
  optimizations: string[]
}

// ============================================
// DEVELOPMENT TIMELINE TYPES
// ============================================

export interface TimelinePhase {
  id: string
  name: string
  duration: string
  startWeek: number
  endWeek: number
  tasks: string[]
  deliverables: string[]
  dependencies: string[]
  milestones: {
    name: string
    week: number
    isCritical: boolean
  }[]
}

export interface DevelopmentTimeline {
  totalDuration: string
  phases: TimelinePhase[]
  criticalPath: string[]
  risks: {
    risk: string
    mitigation: string
    impact: 'low' | 'medium' | 'high'
  }[]
}
