/**
 * DnD Provider - Wraps the application with @dnd-kit context
 * Manages drag state, sensors, and collision detection
 *
 * FIXED: Eliminated infinite render loops by:
 * 1. Using refs for callback props to prevent handler recreation
 * 2. Using individual store selectors
 * 3. Memoizing the DragPreview component
 */

'use client'

import React, { useState, useCallback, useRef, useEffect, memo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  UniqueIdentifier,
  CollisionDetection,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { DraggableItem, DropZoneId } from '@/types/workspace'
import { useCanvasStore } from '@/stores/canvasStore'
import { useChatStore } from '@/stores/chatStore'

interface DndProviderProps {
  children: React.ReactNode
  onDropToCanvas?: (item: DraggableItem, position: { x: number; y: number }) => void
  onDropToChat?: (item: DraggableItem) => void
}

// Custom collision detection that prioritizes smaller drop zones
const customCollisionDetection: CollisionDetection = (args) => {
  // First check for pointer within (most accurate for nested zones)
  const pointerCollisions = pointerWithin(args)
  if (pointerCollisions.length > 0) {
    return pointerCollisions
  }
  // Fall back to closest corners
  return closestCorners(args)
}

export function DndProvider({
  children,
  onDropToCanvas,
  onDropToChat,
}: DndProviderProps) {
  const [activeItem, setActiveItem] = useState<DraggableItem | null>(null)
  const [activeOverId, setActiveOverId] = useState<UniqueIdentifier | null>(null)

  // FIXED: Use individual selectors to prevent over-subscription
  const addToCanvas = useCanvasStore((state) => state.addItem)
  const addDroppedItem = useChatStore((state) => state.addDroppedItem)
  const setInputValue = useChatStore((state) => state.setInputValue)
  const generateQueryFromDroppedItem = useChatStore((state) => state.generateQueryFromDroppedItem)

  // CRITICAL FIX: Store callback props in refs to prevent handler recreation
  // This prevents infinite loops when parent component re-renders
  const onDropToCanvasRef = useRef(onDropToCanvas)
  const onDropToChatRef = useRef(onDropToChat)

  // Keep refs updated
  useEffect(() => {
    onDropToCanvasRef.current = onDropToCanvas
  }, [onDropToCanvas])

  useEffect(() => {
    onDropToChatRef.current = onDropToChat
  }, [onDropToChat])

  // Configure sensors - memoized to prevent recreation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const item = active.data.current as DraggableItem
    setActiveItem(item)
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    setActiveOverId(over?.id ?? null)
  }, [])

  // FIXED: Use refs for callback props to keep dependencies stable
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      // Get current activeItem from closure
      const currentActiveItem = active.data.current as DraggableItem

      if (!over || !currentActiveItem) {
        setActiveItem(null)
        setActiveOverId(null)
        return
      }

      const overId = over.id as string
      const item = currentActiveItem

      // Determine drop zone and handle accordingly
      if (overId === 'canvas' || overId.startsWith('canvas-zone')) {
        // Get drop position from the over element
        const rect = over.rect
        const position = {
          x: rect.left + 20,
          y: rect.top + 20,
        }

        // Use ref to get current callback
        if (onDropToCanvasRef.current) {
          onDropToCanvasRef.current(item, position)
        } else {
          addToCanvas(item, position)
        }
      } else if (overId === 'chat-input' || overId.startsWith('chat-')) {
        // Generate query from dropped item
        const query = generateQueryFromDroppedItem(item)
        setInputValue(query)
        addDroppedItem(item)

        // Use ref to get current callback
        if (onDropToChatRef.current) {
          onDropToChatRef.current(item)
        }
      }

      setActiveItem(null)
      setActiveOverId(null)
    },
    [addToCanvas, addDroppedItem, generateQueryFromDroppedItem, setInputValue]  // FIXED: Removed unstable prop dependencies
  )

  const handleDragCancel = useCallback(() => {
    setActiveItem(null)
    setActiveOverId(null)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <DragPreview item={activeItem} isOverDropZone={activeOverId !== null} />
        )}
      </DragOverlay>
    </DndContext>
  )
}

// Drag preview component shown during drag
// FIXED: Memoized to prevent unnecessary re-renders
interface DragPreviewProps {
  item: DraggableItem
  isOverDropZone: boolean
}

const DragPreview = memo(function DragPreview({ item, isOverDropZone }: DragPreviewProps) {
  const payload = item.payload as Record<string, unknown>
  const title = (payload.title || payload.name || item.metadata?.title || 'Item') as string
  const subtitle = item.metadata?.subtitle || item.type

  const typeStyles: Record<string, { bg: string; border: string; icon: string }> = {
    problem: { bg: 'bg-red-50', border: 'border-red-300', icon: '🔴' },
    feature: { bg: 'bg-blue-50', border: 'border-blue-300', icon: '✨' },
    task: { bg: 'bg-green-50', border: 'border-green-300', icon: '📋' },
    'prd-section': { bg: 'bg-purple-50', border: 'border-purple-300', icon: '📄' },
    timeline: { bg: 'bg-amber-50', border: 'border-amber-300', icon: '📅' },
    'database-schema': { bg: 'bg-slate-50', border: 'border-slate-300', icon: '🗃️' },
    prompt: { bg: 'bg-indigo-50', border: 'border-indigo-300', icon: '💬' },
  }

  const style = typeStyles[item.type] || typeStyles.task

  return (
    <div
      className={`
        ${style.bg} ${style.border}
        border-2 rounded-lg shadow-xl p-3 min-w-[200px] max-w-[300px]
        transform rotate-2 opacity-95
        ${isOverDropZone ? 'ring-2 ring-blue-500 ring-opacity-50 scale-105' : ''}
        transition-transform duration-150
      `}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg flex-shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-900 truncate">{title}</p>
          <p className="text-xs text-slate-500 capitalize">{subtitle}</p>
        </div>
      </div>
    </div>
  )
})

export default DndProvider
