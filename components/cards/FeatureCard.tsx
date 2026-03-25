/**
 * Feature Card - Draggable card for displaying features
 * Shows category, complexity, value metrics, and linked problems
 */

'use client'

import React from 'react'
import { Sparkles, Zap, Star, LinkIcon, Clock } from 'lucide-react'
import { DraggableCard } from '../dnd/DraggableCard'
import { BaseCard } from './BaseCard'
import type { StrategicFeature } from '@/types/comprehensive-strategy'

interface FeatureCardProps {
  feature: StrategicFeature
  index: number
  sourceSection?: string
  expanded?: boolean
  onExpandToggle?: () => void
  draggable?: boolean
  showDetails?: boolean
  className?: string
}

export function FeatureCard({
  feature,
  index,
  sourceSection = 'feature_system',
  expanded = false,
  onExpandToggle,
  draggable = true,
  showDetails = true,
  className = '',
}: FeatureCardProps) {
  const content = (
    <BaseCard
      variant="feature"
      expandable={showDetails}
      expanded={expanded}
      onExpandToggle={onExpandToggle}
      icon={<Sparkles className="w-4 h-4 text-blue-500" />}
      header={
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{feature.name}</p>
        </div>
      }
      badge={
        <div className="flex items-center gap-2">
          <CategoryBadge category={feature.category} />
          <ComplexityBadge complexity={feature.complexity} />
        </div>
      }
      className={className}
    >
      {/* Description */}
      {feature.detailed_description && (
        <p className="text-sm text-slate-600 mb-3">{feature.detailed_description}</p>
      )}

      {/* Why Needed */}
      {feature.why_needed && (
        <div className="mb-3">
          <p className="text-xs font-medium text-blue-700 mb-1">Why Needed:</p>
          <p className="text-sm text-slate-700">{feature.why_needed}</p>
        </div>
      )}

      {/* Value Metrics */}
      {(feature.user_value || feature.business_value) && (
        <div className="flex gap-4 mb-3">
          {feature.user_value && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500" />
              <span className="text-xs text-slate-600">
                User Value: <strong>{feature.user_value}</strong>
              </span>
            </div>
          )}
          {feature.business_value && (
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-green-500" />
              <span className="text-xs text-slate-600">
                Business: <strong>{feature.business_value}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Linked Problems */}
      {Array.isArray(feature.linked_problems) && feature.linked_problems.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1">
            <LinkIcon className="w-3 h-3 text-blue-600" />
            <p className="text-xs font-medium text-blue-700">Solves Problems:</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {feature.linked_problems.slice(0, 3).map((problemId, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full"
              >
                {typeof problemId === 'string' ? problemId : String(problemId)}
              </span>
            ))}
            {feature.linked_problems.length > 3 && (
              <span className="text-xs text-blue-500">
                +{feature.linked_problems.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Estimated Dev Time */}
      {feature.estimated_dev_time && (
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>Effort: {feature.estimated_dev_time}</span>
        </div>
      )}

      {/* Implementation Strategy */}
      {feature.implementation_strategy && feature.implementation_strategy.length > 0 && (
        <div className="mt-3 p-2 bg-blue-100/50 rounded text-xs text-blue-800">
          <strong>Implementation:</strong> {feature.implementation_strategy[0]}
        </div>
      )}
    </BaseCard>
  )

  if (!draggable) return content

  return (
    <DraggableCard
      id={feature.id}
      type="feature"
      payload={feature}
      metadata={{
        sourceSection,
        originalIndex: index,
        title: feature.name,
        subtitle: `${feature.category} • ${feature.complexity} complexity`,
      }}
    >
      {content}
    </DraggableCard>
  )
}

// Category badge component
function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    core: 'bg-blue-600 text-white',
    advanced: 'bg-purple-600 text-white',
    futuristic: 'bg-indigo-600 text-white',
    default: 'bg-slate-600 text-white',
  }

  const icons: Record<string, string> = {
    core: '🎯',
    advanced: '🚀',
    futuristic: '✨',
  }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${styles[category] || styles.default}`}>
      {icons[category] || '📦'} {category}
    </span>
  )
}

// Complexity badge component
function ComplexityBadge({ complexity }: { complexity: string }) {
  const styles: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
    default: 'bg-slate-100 text-slate-700',
  }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${styles[complexity] || styles.default}`}>
      {complexity}
    </span>
  )
}

// Compact version for sidebar lists
export function FeatureCardCompact({
  feature,
  index,
  sourceSection = 'feature_system',
  onClick,
}: {
  feature: StrategicFeature
  index: number
  sourceSection?: string
  onClick?: () => void
}) {
  return (
    <DraggableCard
      id={feature.id}
      type="feature"
      payload={feature}
      metadata={{
        sourceSection,
        originalIndex: index,
        title: feature.name,
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md hover:border-blue-300 transition-colors">
        <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <p className="text-sm font-medium text-blue-900 truncate flex-1">
          {feature.name}
        </p>
        <CategoryBadge category={feature.category} />
      </div>
    </DraggableCard>
  )
}

export default FeatureCard
