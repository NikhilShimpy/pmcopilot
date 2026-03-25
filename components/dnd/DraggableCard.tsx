/**
 * Draggable Card - Generic wrapper for making items draggable
 * Uses @dnd-kit's useDraggable hook with visual feedback
 */

'use client'

import React from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { DraggableItem, DraggableItemType } from '@/types/workspace'
import { GripVertical } from 'lucide-react'

interface DraggableCardProps {
  id: string
  type: DraggableItemType
  payload: unknown
  metadata?: {
    sourceSection?: string
    originalIndex?: number
    title?: string
    subtitle?: string
  }
  children: React.ReactNode
  className?: string
  disabled?: boolean
  showHandle?: boolean
  onClick?: () => void
}

export function DraggableCard({
  id,
  type,
  payload,
  metadata,
  children,
  className = '',
  disabled = false,
  showHandle = true,
  onClick,
}: DraggableCardProps) {
  const draggableItem: DraggableItem = {
    id,
    type,
    payload,
    metadata,
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data: draggableItem,
    disabled,
  })

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative
        ${isDragging ? 'opacity-50 z-50' : 'opacity-100'}
        ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing'}
        ${className}
      `}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle indicator */}
      {showHandle && !disabled && (
        <div
          className={`
            absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            text-slate-400 hover:text-slate-600
          `}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Card content */}
      {children}

      {/* Drag indicator overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 border-2 border-blue-300 border-dashed rounded-lg" />
      )}
    </div>
  )
}

// Convenience wrapper with common card styling
interface StyledDraggableCardProps extends DraggableCardProps {
  variant?: 'default' | 'compact' | 'minimal'
}

export function StyledDraggableCard({
  variant = 'default',
  className = '',
  ...props
}: StyledDraggableCardProps) {
  const variantStyles = {
    default: 'bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow',
    compact: 'bg-white border border-slate-200 rounded-md p-3 shadow-sm hover:shadow transition-shadow',
    minimal: 'bg-slate-50 rounded p-2 hover:bg-slate-100 transition-colors',
  }

  return (
    <DraggableCard
      className={`${variantStyles[variant]} ${className}`}
      {...props}
    />
  )
}

export default DraggableCard
