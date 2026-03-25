/**
 * Droppable Zone - Generic drop target for drag and drop
 * Uses @dnd-kit's useDroppable hook with visual feedback
 */

'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { DraggableItemType, DropZoneId } from '@/types/workspace'

interface DroppableZoneProps {
  id: DropZoneId | string
  children: React.ReactNode
  accepts?: DraggableItemType[]
  className?: string
  activeClassName?: string
  hoverClassName?: string
  rejectClassName?: string
  disabled?: boolean
  placeholder?: React.ReactNode
}

export function DroppableZone({
  id,
  children,
  accepts,
  className = '',
  activeClassName = 'bg-blue-50 border-blue-300 border-2 border-dashed',
  hoverClassName = 'bg-blue-100 border-blue-400 scale-[1.02]',
  rejectClassName = 'bg-red-50 border-red-300',
  disabled = false,
  placeholder,
}: DroppableZoneProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id,
    disabled,
  })

  // Check if the active item type is accepted
  const activeItemType = active?.data.current?.type as DraggableItemType | undefined
  const canAccept = !accepts || (activeItemType && accepts.includes(activeItemType))

  // Determine visual state
  const isActiveDropTarget = active !== null && !disabled
  const isHovering = isOver && canAccept
  const isRejecting = isOver && !canAccept

  const stateClassName = isHovering
    ? hoverClassName
    : isRejecting
    ? rejectClassName
    : isActiveDropTarget
    ? activeClassName
    : ''

  return (
    <div
      ref={setNodeRef}
      className={`
        transition-all duration-200 ease-out
        ${className}
        ${stateClassName}
      `}
    >
      {/* Show placeholder when zone is active target and hovering */}
      {isHovering && placeholder ? (
        <div className="relative">
          {children}
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 backdrop-blur-sm rounded-lg">
            {placeholder}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

// Canvas-specific drop zone with positioning support
interface CanvasDropZoneProps extends Omit<DroppableZoneProps, 'id'> {
  onDrop?: (position: { x: number; y: number }) => void
}

export function CanvasDropZone({
  children,
  className = '',
  ...props
}: CanvasDropZoneProps) {
  return (
    <DroppableZone
      id="canvas"
      className={`min-h-[400px] ${className}`}
      placeholder={
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-blue-700 font-medium">Drop here to add to canvas</p>
          <p className="text-blue-500 text-sm mt-1">Arrange and compare items</p>
        </div>
      }
      {...props}
    >
      {children}
    </DroppableZone>
  )
}

// Chat input drop zone
interface ChatDropZoneProps extends Omit<DroppableZoneProps, 'id'> {
  expanded?: boolean
}

export function ChatDropZone({
  children,
  className = '',
  expanded = false,
  ...props
}: ChatDropZoneProps) {
  return (
    <DroppableZone
      id="chat-input"
      className={className}
      activeClassName="ring-2 ring-purple-300 ring-inset bg-purple-50"
      hoverClassName="ring-2 ring-purple-500 ring-inset bg-purple-100"
      placeholder={
        <div className="flex items-center gap-2 text-purple-700">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-medium text-sm">Drop to ask about this item</span>
        </div>
      }
      {...props}
    >
      {children}
    </DroppableZone>
  )
}

// Compare zone for side-by-side comparison
export function CompareDropZone({
  children,
  className = '',
  position = 'left',
  ...props
}: Omit<DroppableZoneProps, 'id'> & { position?: 'left' | 'right' }) {
  return (
    <DroppableZone
      id={`compare-${position}`}
      className={`min-h-[200px] ${className}`}
      placeholder={
        <div className="text-center p-4">
          <p className="text-slate-600 text-sm">Drop item to compare</p>
        </div>
      }
      {...props}
    >
      {children}
    </DroppableZone>
  )
}

export default DroppableZone
