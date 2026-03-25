/**
 * Base Card - Shared card styling and structure
 * Foundation component for all draggable cards
 */

'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, MoreHorizontal, X } from 'lucide-react'

interface BaseCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'problem' | 'feature' | 'task' | 'prompt' | 'prd' | 'timeline'
  expandable?: boolean
  expanded?: boolean
  onExpandToggle?: () => void
  onRemove?: () => void
  header?: React.ReactNode
  footer?: React.ReactNode
  actions?: React.ReactNode
  badge?: React.ReactNode
  icon?: React.ReactNode
}

const variantStyles = {
  default: {
    container: 'bg-white border-slate-200',
    header: 'text-slate-900',
    accent: 'bg-slate-500',
  },
  problem: {
    container: 'bg-red-50 border-red-200 hover:border-red-300',
    header: 'text-red-900',
    accent: 'bg-red-500',
  },
  feature: {
    container: 'bg-blue-50 border-blue-200 hover:border-blue-300',
    header: 'text-blue-900',
    accent: 'bg-blue-500',
  },
  task: {
    container: 'bg-green-50 border-green-200 hover:border-green-300',
    header: 'text-green-900',
    accent: 'bg-green-500',
  },
  prompt: {
    container: 'bg-indigo-50 border-indigo-200 hover:border-indigo-300',
    header: 'text-indigo-900',
    accent: 'bg-indigo-500',
  },
  prd: {
    container: 'bg-purple-50 border-purple-200 hover:border-purple-300',
    header: 'text-purple-900',
    accent: 'bg-purple-500',
  },
  timeline: {
    container: 'bg-amber-50 border-amber-200 hover:border-amber-300',
    header: 'text-amber-900',
    accent: 'bg-amber-500',
  },
}

export function BaseCard({
  children,
  className = '',
  variant = 'default',
  expandable = false,
  expanded: controlledExpanded,
  onExpandToggle,
  onRemove,
  header,
  footer,
  actions,
  badge,
  icon,
}: BaseCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = controlledExpanded ?? internalExpanded
  const toggleExpanded = onExpandToggle ?? (() => setInternalExpanded(!internalExpanded))

  const styles = variantStyles[variant]

  return (
    <div
      className={`
        group relative
        border rounded-lg shadow-sm
        transition-all duration-200
        ${styles.container}
        ${className}
      `}
    >
      {/* Accent bar */}
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-lg ${styles.accent}`} />

      {/* Header */}
      {header && (
        <div className={`px-4 py-3 pl-5 flex items-center justify-between ${styles.header}`}>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <div className="min-w-0 flex-1">{header}</div>
            {badge && <span className="flex-shrink-0">{badge}</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            {actions}
            {expandable && (
              <button
                onClick={toggleExpanded}
                className="p-1 hover:bg-black/5 rounded transition-colors"
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1 hover:bg-red-100 rounded transition-colors text-red-500 opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <AnimatePresence initial={false}>
        {(!expandable || expanded) && (
          <motion.div
            initial={expandable ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={expandable ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-3 pl-5 ${!header ? 'pt-3' : ''}`}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {footer && (
        <div className="px-4 py-2 pl-5 border-t border-inherit bg-black/[0.02] rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  )
}

// Compact card variant for dense lists
interface CompactCardProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  variant?: keyof typeof variantStyles
  className?: string
  onClick?: () => void
}

export function CompactCard({
  title,
  subtitle,
  icon,
  badge,
  variant = 'default',
  className = '',
  onClick,
}: CompactCardProps) {
  const styles = variantStyles[variant]

  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-center gap-3 px-3 py-2 pl-4
        border rounded-md shadow-sm
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow' : ''}
        ${styles.container}
        ${className}
      `}
    >
      <div className={`absolute left-0 top-0 w-1 h-full rounded-l-md ${styles.accent}`} />
      {icon && <span className="flex-shrink-0 text-lg">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${styles.header}`}>{title}</p>
        {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
      </div>
      {badge}
    </div>
  )
}

export default BaseCard
