/**
 * Task Card - Draggable card for displaying development tasks
 * Shows type, priority, estimated time, and dependencies
 */

'use client'

import React from 'react'
import { CheckSquare, Clock, ArrowRight, GitBranch } from 'lucide-react'
import { DraggableCard } from '../dnd/DraggableCard'
import { BaseCard } from './BaseCard'
import type { StrategicTask } from '@/types/comprehensive-strategy'

interface TaskCardProps {
  task: StrategicTask
  index: number
  sourceSection?: string
  expanded?: boolean
  onExpandToggle?: () => void
  draggable?: boolean
  showDetails?: boolean
  className?: string
}

export function TaskCard({
  task,
  index,
  sourceSection = 'development_tasks',
  expanded = false,
  onExpandToggle,
  draggable = true,
  showDetails = true,
  className = '',
}: TaskCardProps) {
  const content = (
    <BaseCard
      variant="task"
      expandable={showDetails}
      expanded={expanded}
      onExpandToggle={onExpandToggle}
      icon={<CheckSquare className="w-4 h-4 text-green-500" />}
      header={
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{task.title}</p>
        </div>
      }
      badge={
        <div className="flex items-center gap-2">
          <TypeBadge type={task.type} />
          <PriorityBadge priority={task.priority} />
        </div>
      }
      className={className}
    >
      {/* Detailed Steps */}
      {task.detailed_steps && task.detailed_steps.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-green-700 mb-1">Steps:</p>
          <ul className="space-y-1">
            {task.detailed_steps.slice(0, 3).map((step, i) => (
              <li key={i} className="flex items-start gap-1 text-xs text-slate-600">
                <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-green-500" />
                <span>{step}</span>
              </li>
            ))}
            {task.detailed_steps.length > 3 && (
              <li className="text-xs text-green-500 ml-4">
                +{task.detailed_steps.length - 3} more steps
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Metrics Row */}
      <div className="flex flex-wrap gap-3 mb-3">
        {task.estimated_time && (
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Clock className="w-3 h-3" />
            <span>{task.estimated_time}</span>
          </div>
        )}
      </div>

      {/* Expected Output */}
      {task.expected_output && (
        <div className="mb-3">
          <p className="text-xs font-medium text-green-700 mb-1">Expected Output:</p>
          <p className="text-sm text-slate-700">{task.expected_output}</p>
        </div>
      )}

      {/* Dependencies */}
      {task.dependencies && task.dependencies.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1">
            <GitBranch className="w-3 h-3 text-green-600" />
            <p className="text-xs font-medium text-green-700">Dependencies:</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {task.dependencies.map((dep, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full"
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tech Stack */}
      {task.tech_stack && task.tech_stack.length > 0 && (
        <div className="mt-3 p-2 bg-green-100/50 rounded text-xs text-green-800">
          <strong>Tech Stack:</strong> {task.tech_stack.join(', ')}
        </div>
      )}
    </BaseCard>
  )

  if (!draggable) return content

  return (
    <DraggableCard
      id={task.id}
      type="task"
      payload={task}
      metadata={{
        sourceSection,
        originalIndex: index,
        title: task.title,
        subtitle: `${task.type} • ${task.priority} priority`,
      }}
    >
      {content}
    </DraggableCard>
  )
}

// Type badge component
function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    frontend: { bg: 'bg-cyan-100', text: 'text-cyan-700', icon: '🎨' },
    backend: { bg: 'bg-purple-100', text: 'text-purple-700', icon: '⚙️' },
    api: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '🔌' },
    database: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🗃️' },
    infrastructure: { bg: 'bg-slate-100', text: 'text-slate-700', icon: '🏗️' },
    design: { bg: 'bg-pink-100', text: 'text-pink-700', icon: '✏️' },
    testing: { bg: 'bg-green-100', text: 'text-green-700', icon: '🧪' },
  }

  const style = styles[type] || { bg: 'bg-slate-100', text: 'text-slate-700', icon: '📋' }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${style.bg} ${style.text}`}>
      {style.icon} {type}
    </span>
  )
}

// Priority badge component
function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    low: 'bg-green-500 text-white',
  }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${styles[priority] || 'bg-slate-500 text-white'}`}>
      {priority}
    </span>
  )
}

// Compact version for sidebar lists
export function TaskCardCompact({
  task,
  index,
  sourceSection = 'development_tasks',
  onClick,
}: {
  task: StrategicTask
  index: number
  sourceSection?: string
  onClick?: () => void
}) {
  return (
    <DraggableCard
      id={task.id}
      type="task"
      payload={task}
      metadata={{
        sourceSection,
        originalIndex: index,
        title: task.title,
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md hover:border-green-300 transition-colors">
        <CheckSquare className="w-4 h-4 text-green-500 flex-shrink-0" />
        <p className="text-sm font-medium text-green-900 truncate flex-1">
          {task.title}
        </p>
        <TypeBadge type={task.type} />
      </div>
    </DraggableCard>
  )
}

export default TaskCard
