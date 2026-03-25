/**
 * Problem Card - Draggable card for displaying problems
 * Shows severity, frequency, root cause, and evidence
 */

'use client'

import React from 'react'
import { AlertTriangle, Users, TrendingUp, MessageSquare } from 'lucide-react'
import { DraggableCard } from '../dnd/DraggableCard'
import { BaseCard } from './BaseCard'
import type { StrategicProblem } from '@/types/comprehensive-strategy'

interface ProblemCardProps {
  problem: StrategicProblem
  index: number
  sourceSection?: string
  expanded?: boolean
  onExpandToggle?: () => void
  draggable?: boolean
  showDetails?: boolean
  className?: string
}

export function ProblemCard({
  problem,
  index,
  sourceSection = 'problem_analysis',
  expanded = false,
  onExpandToggle,
  draggable = true,
  showDetails = true,
  className = '',
}: ProblemCardProps) {
  const content = (
    <BaseCard
      variant="problem"
      expandable={showDetails}
      expanded={expanded}
      onExpandToggle={onExpandToggle}
      icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
      header={
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{problem.title}</p>
        </div>
      }
      badge={
        <div className="flex items-center gap-2">
          <SeverityBadge score={problem.severity_score} />
          <FrequencyBadge score={problem.frequency_score} />
        </div>
      }
      className={className}
    >
      {/* Description */}
      <p className="text-sm text-slate-600 mb-3">
        {problem.deep_description}
      </p>

      {/* Root Cause */}
      {problem.root_cause && (
        <div className="mb-3">
          <p className="text-xs font-medium text-red-700 mb-1">Root Cause:</p>
          <p className="text-sm text-slate-700">{problem.root_cause}</p>
        </div>
      )}

      {/* Affected Users */}
      {problem.affected_users && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-1">
            <Users className="w-3 h-3 text-red-600" />
            <p className="text-xs font-medium text-red-700">Affected Users:</p>
          </div>
          <p className="text-sm text-slate-700">{problem.affected_users}</p>
        </div>
      )}

      {/* Evidence */}
      {problem.evidence_examples && problem.evidence_examples.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <MessageSquare className="w-3 h-3 text-red-600" />
            <p className="text-xs font-medium text-red-700">Evidence:</p>
          </div>
          <div className="space-y-1">
            {problem.evidence_examples.slice(0, 2).map((evidence, i) => (
              <blockquote
                key={i}
                className="text-xs text-slate-600 italic border-l-2 border-red-200 pl-2"
              >
                &ldquo;{evidence}&rdquo;
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </BaseCard>
  )

  if (!draggable) return content

  return (
    <DraggableCard
      id={problem.id}
      type="problem"
      payload={problem}
      metadata={{
        sourceSection,
        originalIndex: index,
        title: problem.title,
        subtitle: `Severity: ${problem.severity_score}/10`,
      }}
    >
      {content}
    </DraggableCard>
  )
}

// Severity badge component
function SeverityBadge({ score }: { score: number }) {
  const level =
    score >= 8 ? 'critical' : score >= 6 ? 'high' : score >= 4 ? 'medium' : 'low'

  const styles = {
    critical: 'bg-red-600 text-white',
    high: 'bg-red-500 text-white',
    medium: 'bg-orange-500 text-white',
    low: 'bg-yellow-500 text-white',
  }

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${styles[level]}`}
      title={`Severity: ${score}/10`}
    >
      S:{score}
    </span>
  )
}

// Frequency badge component
function FrequencyBadge({ score }: { score: number }) {
  const level = score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low'

  const styles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-orange-100 text-orange-700',
    low: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <span
      className={`text-xs px-1.5 py-0.5 rounded font-medium ${styles[level]}`}
      title={`Frequency: ${score}/10`}
    >
      <TrendingUp className="w-3 h-3 inline mr-0.5" />
      {score}
    </span>
  )
}

// Compact version for sidebar lists
export function ProblemCardCompact({
  problem,
  index,
  sourceSection = 'problem_analysis',
  onClick,
}: {
  problem: StrategicProblem
  index: number
  sourceSection?: string
  onClick?: () => void
}) {
  return (
    <DraggableCard
      id={problem.id}
      type="problem"
      payload={problem}
      metadata={{
        sourceSection,
        originalIndex: index,
        title: problem.title,
      }}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md hover:border-red-300 transition-colors">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <p className="text-sm font-medium text-red-900 truncate flex-1">
          {problem.title}
        </p>
        <SeverityBadge score={problem.severity_score} />
      </div>
    </DraggableCard>
  )
}

export default ProblemCard
