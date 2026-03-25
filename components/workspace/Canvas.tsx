/**
 * Canvas - Center workspace for arranging and comparing items
 * Drop zone for draggable cards with positioning and multi-select
 */

'use client'

import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Maximize2, X } from 'lucide-react'
import { useCanvasStore } from '@/stores/canvasStore'
import { CanvasDropZone } from '@/components/dnd/DroppableZone'
import { ProblemCard } from '@/components/cards/ProblemCard'
import { FeatureCard } from '@/components/cards/FeatureCard'
import { TaskCard } from '@/components/cards/TaskCard'
import type { CanvasItem } from '@/types/workspace'
import type { StrategicProblem, StrategicFeature, StrategicTask } from '@/types/comprehensive-strategy'

interface CanvasItemWrapperProps {
  item: CanvasItem
  isSelected: boolean
  onSelect: (id: string, additive: boolean) => void
  onRemove: (id: string) => void
}

function CanvasItemWrapper({
  item,
  isSelected,
  onSelect,
  onRemove,
}: CanvasItemWrapperProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const itemRef = useRef<HTMLDivElement>(null)
  const { moveItem, bringToFront } = useCanvasStore()

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('drag-handle')) {
      return
    }

    e.preventDefault()
    setIsDragging(true)
    bringToFront(item.canvasId)

    const rect = itemRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    // Handle selection with Shift key for multi-select
    onSelect(item.canvasId, e.shiftKey)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const canvas = itemRef.current?.parentElement
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()
      const newX = e.clientX - canvasRect.left - dragOffset.x
      const newY = e.clientY - canvasRect.top - dragOffset.y

      // Constrain to canvas bounds
      const constrainedX = Math.max(0, Math.min(newX, canvasRect.width - 320))
      const constrainedY = Math.max(0, Math.min(newY, canvasRect.height - 200))

      moveItem(item.canvasId, { x: constrainedX, y: constrainedY })
    },
    [isDragging, dragOffset, item.canvasId, moveItem]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Render appropriate card based on type
  const renderCard = () => {
    const cardProps = {
      draggable: false,
      className: 'pointer-events-none',
      index: 0,
    }

    switch (item.type) {
      case 'problem':
        return <ProblemCard problem={item.payload as StrategicProblem} {...cardProps} />
      case 'feature':
        return <FeatureCard feature={item.payload as StrategicFeature} {...cardProps} />
      case 'task':
        return <TaskCard task={item.payload as StrategicTask} {...cardProps} />
      default:
        return (
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600">{item.type}</p>
          </div>
        )
    }
  }

  return (
    <motion.div
      ref={itemRef}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`
        absolute cursor-move group
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
      style={{
        left: item.position.x,
        top: item.position.y,
        width: item.dimensions.width,
        zIndex: item.zIndex,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Controls */}
      <div className="absolute -top-8 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(item.canvasId)
          }}
          className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          title="Remove from canvas"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Card */}
      <div className="drag-handle">
        {renderCard()}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 rounded-lg" />
      )}
    </motion.div>
  )
}

interface CanvasProps {
  className?: string
}

export function Canvas({ className = '' }: CanvasProps) {
  const { items, selection, selectItem, removeItem, clearSelection } =
    useCanvasStore()
  const selectedIds = selection.selectedIds
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Clear selection when clicking on empty canvas
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background')) {
      clearSelection()
    }
  }

  const handleSelectAll = () => {
    const allIds = items.map((item) => item.canvasId)
    useCanvasStore.getState().selectMultiple(allIds)
  }

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => removeItem(id))
  }

  return (
    <div
      ref={canvasRef}
      onClick={handleCanvasClick}
      className={`relative flex-1 bg-slate-50 overflow-auto ${className}`}
    >
      <CanvasDropZone className="min-h-full p-6">
        <div className="canvas-background relative min-h-[600px]">
          {/* Empty state */}
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                  <Maximize2 className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-slate-400 font-medium mb-1">
                  Your canvas is empty
                </p>
                <p className="text-sm text-slate-400">
                  Drag items from the sidebar to organize and compare
                </p>
              </div>
            </div>
          )}

          {/* Canvas items */}
          <AnimatePresence>
            {items.map((item) => (
              <CanvasItemWrapper
                key={item.canvasId}
                item={item}
                isSelected={selectedIds.has(item.canvasId)}
                onSelect={(id, additive) => selectItem(id, additive)}
                onRemove={removeItem}
              />
            ))}
          </AnimatePresence>

          {/* Selection controls */}
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-lg shadow-lg p-2 flex items-center gap-2 z-50"
            >
              <span className="text-xs text-slate-600 px-2">
                {selectedIds.size} selected
              </span>
              <div className="w-px h-4 bg-slate-200" />
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            </motion.div>
          )}
        </div>
      </CanvasDropZone>

      {/* Keyboard shortcuts hint */}
      {items.length > 0 && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg p-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded">Shift</kbd>
            <span>+ Click for multi-select</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Canvas
