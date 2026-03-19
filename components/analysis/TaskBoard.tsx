'use client'

import { motion } from 'framer-motion'
import {
  Code,
  Server,
  Database,
  Layout,
  TestTube,
  Cloud,
  Palette,
  ChevronRight,
} from 'lucide-react'
import { DevelopmentTask, TaskType } from '@/types/analysis'
import { useState } from 'react'

interface TaskBoardProps {
  tasks: DevelopmentTask[]
}

const taskTypeConfig: Record<
  TaskType,
  { icon: any; color: string; bg: string; label: string }
> = {
  frontend: {
    icon: Layout,
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    label: 'Frontend',
  },
  backend: {
    icon: Server,
    color: 'text-green-700',
    bg: 'bg-green-100',
    label: 'Backend',
  },
  api: {
    icon: Code,
    color: 'text-purple-700',
    bg: 'bg-purple-100',
    label: 'API',
  },
  database: {
    icon: Database,
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    label: 'Database',
  },
  infrastructure: {
    icon: Cloud,
    color: 'text-indigo-700',
    bg: 'bg-indigo-100',
    label: 'Infrastructure',
  },
  design: {
    icon: Palette,
    color: 'text-pink-700',
    bg: 'bg-pink-100',
    label: 'Design',
  },
  testing: {
    icon: TestTube,
    color: 'text-teal-700',
    bg: 'bg-teal-100',
    label: 'Testing',
  },
}

function TaskCard({ task, index }: { task: DevelopmentTask; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const config = taskTypeConfig[task.type]
  const Icon = config.icon

  const priorityColors = {
    Critical: 'bg-red-500 text-white',
    High: 'bg-orange-500 text-white',
    Medium: 'bg-yellow-500 text-white',
    Low: 'bg-blue-500 text-white',
  }

  const sizeEmoji = {
    XS: '🟢',
    S: '🟡',
    M: '🟠',
    L: '🔴',
    XL: '⚫',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-all duration-300 cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`flex-shrink-0 flex items-center justify-center w-8 h-8 ${config.bg} rounded-lg`}
          >
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {task.title}
            </h3>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </motion.div>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">
        {task.description}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Type Badge */}
        <span className={`px-2 py-1 text-xs font-medium rounded ${config.bg} ${config.color}`}>
          {config.label}
        </span>

        {/* Priority Badge */}
        <span className={`px-2 py-1 text-xs font-bold rounded ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>

        {/* Size Badge */}
        {task.size && (
          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
            {sizeEmoji[task.size]} {task.size}
          </span>
        )}

        {/* Story Points */}
        {task.story_points !== undefined && (
          <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-700">
            {task.story_points} pts
          </span>
        )}
      </div>

      {/* Dependencies */}
      {task.dependencies && task.dependencies.length > 0 && (
        <div className="text-xs text-gray-500 mb-2">
          <span className="font-medium">Depends on:</span> {task.dependencies.length} task(s)
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-3 pt-3 border-t border-gray-200 space-y-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Technical Notes */}
          {task.technical_notes && (
            <div>
              <div className="text-xs font-semibold text-gray-900 mb-1">Technical Notes</div>
              <p className="text-xs text-gray-600 leading-relaxed">{task.technical_notes}</p>
            </div>
          )}

          {/* Acceptance Criteria */}
          {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-900 mb-2">Acceptance Criteria</div>
              <ul className="space-y-1">
                {task.acceptance_criteria.map((criteria, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                    <span className="text-green-600 mt-0.5 flex-shrink-0">✓</span>
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Linked Feature */}
          {task.linked_feature && (
            <div className="text-xs">
              <span className="font-semibold text-gray-900">Linked Feature:</span>{' '}
              <span className="text-gray-600">{task.linked_feature}</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

function KanbanColumn({
  title,
  tasks,
  color,
}: {
  title: string
  tasks: DevelopmentTask[]
  color: string
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`rounded-xl ${color} p-4 mb-4`}>
        <h3 className="font-bold text-white text-sm flex items-center justify-between">
          <span>{title}</span>
          <span className="bg-white/30 px-2 py-1 rounded-lg text-xs">{tasks.length}</span>
        </h3>
      </div>
      <div className="space-y-3 min-h-[200px]">
        {tasks.length > 0 ? (
          tasks.map((task, index) => <TaskCard key={task.id} task={task} index={index} />)
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">No tasks</div>
        )}
      </div>
    </div>
  )
}

export default function TaskBoard({ tasks }: TaskBoardProps) {
  // For this demo, we'll distribute tasks evenly across columns
  // In a real app, tasks would have a status field
  const todoTasks = tasks.filter((_, i) => i % 3 === 0)
  const inProgressTasks = tasks.filter((_, i) => i % 3 === 1)
  const doneTasks = tasks.filter((_, i) => i % 3 === 2)

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-1">Development Tasks</h2>
        <p className="text-sm text-gray-600">
          Implementation tasks organized by status • Total: {tasks.length} tasks
        </p>
      </motion.div>

      {tasks.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <KanbanColumn
            title="To Do"
            tasks={todoTasks}
            color="bg-gradient-to-r from-gray-600 to-gray-700"
          />
          <KanbanColumn
            title="In Progress"
            tasks={inProgressTasks}
            color="bg-gradient-to-r from-blue-600 to-blue-700"
          />
          <KanbanColumn
            title="Done"
            tasks={doneTasks}
            color="bg-gradient-to-r from-green-600 to-green-700"
          />
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No development tasks generated</p>
        </div>
      )}
    </div>
  )
}
