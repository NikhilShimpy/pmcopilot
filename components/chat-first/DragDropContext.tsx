/**
 * DragDropContext - Context injection for drag & drop
 * Features:
 * - Drag any output block into chat
 * - Auto-inject context with AI queries
 * - Visual drag feedback
 */

'use client'

import { useCallback, useState, createContext, useContext, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, MessageSquare } from 'lucide-react'
import { useChatFirstStore, DroppedContext } from '@/stores/chatFirstStore'

// Context type
interface DragDropContextType {
  isDragging: boolean
  draggedItem: DroppedContext | null
  startDrag: (item: DroppedContext) => void
  endDrag: () => void
  dropOnChat: (item: DroppedContext) => void
}

const DragDropCtx = createContext<DragDropContextType | null>(null)

export function useDragDrop() {
  const context = useContext(DragDropCtx)
  if (!context) {
    throw new Error('useDragDrop must be used within DragDropProvider')
  }
  return context
}

interface DragDropProviderProps {
  children: ReactNode
}

export function DragDropProvider({ children }: DragDropProviderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedItem, setDraggedItem] = useState<DroppedContext | null>(null)
  const { addDroppedContext } = useChatFirstStore()

  const startDrag = useCallback((item: DroppedContext) => {
    setIsDragging(true)
    setDraggedItem(item)
  }, [])

  const endDrag = useCallback(() => {
    setIsDragging(false)
    setDraggedItem(null)
  }, [])

  const dropOnChat = useCallback((item: DroppedContext) => {
    addDroppedContext(item)
    endDrag()
  }, [addDroppedContext, endDrag])

  return (
    <DragDropCtx.Provider value={{ isDragging, draggedItem, startDrag, endDrag, dropOnChat }}>
      {children}

      {/* Drop indicator overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none"
          >
            {/* Chat drop zone indicator */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2
                flex items-center gap-3 px-6 py-4 rounded-2xl
                bg-blue-500/90 text-white
                shadow-2xl shadow-blue-500/30"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">Drop here to add context to chat</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dragged item preview */}
      <AnimatePresence>
        {isDragging && draggedItem && (
          <DragPreview item={draggedItem} />
        )}
      </AnimatePresence>
    </DragDropCtx.Provider>
  )
}

// Drag Preview Component
interface DragPreviewProps {
  item: DroppedContext
}

function DragPreview({ item }: DragPreviewProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Track mouse position
  useState(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  })

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: 'fixed',
        left: position.x + 20,
        top: position.y + 20,
        pointerEvents: 'none',
        zIndex: 100,
      }}
      className="px-4 py-2 rounded-lg
        bg-white dark:bg-gray-800
        shadow-2xl border border-gray-200 dark:border-gray-700
        max-w-[200px]"
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
        {item.type}
      </p>
      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
        {item.title}
      </p>
    </motion.div>
  )
}

// Draggable Item Wrapper Component
interface DraggableItemProps {
  item: DroppedContext
  children: ReactNode
  className?: string
}

export function DraggableItem({ item, children, className = '' }: DraggableItemProps) {
  const { startDrag, endDrag } = useDragDrop()
  const [isDraggingLocal, setIsDraggingLocal] = useState(false)

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    setIsDraggingLocal(true)
    startDrag(item)
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'copy'
  }, [item, startDrag])

  const handleDragEnd = useCallback(() => {
    setIsDraggingLocal(false)
    endDrag()
  }, [endDrag])

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`relative group cursor-grab active:cursor-grabbing transition-all duration-200
        hover:scale-[1.01] ${className}
        ${isDraggingLocal ? 'opacity-50' : ''}`}
    >
      {/* Drag handle */}
      <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center
        opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>

      {children}
    </div>
  )
}

// Chat Drop Zone Component
interface ChatDropZoneProps {
  children: ReactNode
  className?: string
}

export function ChatDropZone({ children, className = '' }: ChatDropZoneProps) {
  const { isDragging, dropOnChat } = useDragDrop()
  const [isOver, setIsOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsOver(false)

    try {
      const data = e.dataTransfer.getData('application/json')
      const item = JSON.parse(data) as DroppedContext
      dropOnChat(item)
    } catch (error) {
      console.error('Failed to parse dropped item:', error)
    }
  }, [dropOnChat])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`${className} ${isOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
    >
      {children}

      {/* Drop highlight */}
      <AnimatePresence>
        {isDragging && isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-blue-500/10 rounded-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default DragDropProvider
