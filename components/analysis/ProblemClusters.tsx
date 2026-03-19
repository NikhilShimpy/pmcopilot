'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ChevronDown, ChevronUp, Quote } from 'lucide-react'
import { useState } from 'react'
import { Problem } from '@/types/analysis'

interface ProblemClustersProps {
  problems: Problem[]
}

function ProblemCard({ problem, index }: { problem: Problem; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Calculate severity color intensity
  const getSeverityColor = (score: number) => {
    if (score >= 8) return 'from-red-500 to-red-600'
    if (score >= 6) return 'from-orange-500 to-orange-600'
    if (score >= 4) return 'from-yellow-500 to-yellow-600'
    return 'from-blue-500 to-blue-600'
  }

  const getSeverityBg = (score: number) => {
    if (score >= 8) return 'bg-red-50 border-red-200'
    if (score >= 6) return 'bg-orange-50 border-orange-200'
    if (score >= 4) return 'bg-yellow-50 border-yellow-200'
    return 'bg-blue-50 border-blue-200'
  }

  const getSeverityText = (score: number) => {
    if (score >= 8) return 'text-red-700'
    if (score >= 6) return 'text-orange-700'
    if (score >= 4) return 'text-yellow-700'
    return 'text-blue-700'
  }

  const severityLabel =
    problem.severity_score >= 8
      ? 'Critical'
      : problem.severity_score >= 6
      ? 'High'
      : problem.severity_score >= 4
      ? 'Medium'
      : 'Low'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`group relative border rounded-xl p-5 hover:shadow-lg transition-all duration-300 ${getSeverityBg(problem.severity_score)}`}
    >
      {/* Severity Indicator Bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b rounded-l-xl opacity-80 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(to bottom, ${getSeverityColor(problem.severity_score).replace('from-', 'var(--tw-gradient-from)')}, ${getSeverityColor(problem.severity_score).replace('to-', 'var(--tw-gradient-to)')})`
        }}
      />

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 bg-gradient-to-br ${getSeverityColor(problem.severity_score)} rounded-lg shadow-sm`}>
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title & Category */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className={`font-semibold text-lg ${getSeverityText(problem.severity_score)}`}>
              {problem.title}
            </h3>
            <span className={`flex-shrink-0 px-3 py-1 text-xs font-bold rounded-full ${getSeverityText(problem.severity_score)} bg-white/50`}>
              {severityLabel}
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {problem.description}
          </p>

          {/* Metrics */}
          <div className="flex items-center gap-6 mb-4">
            {/* Frequency Score */}
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>Frequency</span>
                <span>{problem.frequency_score}/10</span>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${problem.frequency_score * 10}%` }}
                  transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                />
              </div>
            </div>

            {/* Severity Score */}
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1">
                <span>Severity</span>
                <span>{problem.severity_score}/10</span>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${problem.severity_score * 10}%` }}
                  transition={{ delay: index * 0.1 + 0.4, duration: 0.8, ease: 'easeOut' }}
                  className={`h-full bg-gradient-to-r ${getSeverityColor(problem.severity_score)} rounded-full`}
                />
              </div>
            </div>
          </div>

          {/* Meta Info */}
          {(problem.category || problem.user_segment) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {problem.category && (
                <span className="px-2 py-1 bg-white/70 text-gray-700 text-xs font-medium rounded-md">
                  {problem.category}
                </span>
              )}
              {problem.user_segment && (
                <span className="px-2 py-1 bg-white/70 text-gray-700 text-xs font-medium rounded-md">
                  👤 {problem.user_segment}
                </span>
              )}
            </div>
          )}

          {/* Toggle Evidence */}
          {problem.evidence && problem.evidence.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors group/btn"
            >
              <Quote className="w-4 h-4" />
              <span>{isExpanded ? 'Hide' : 'View'} Evidence ({problem.evidence.length})</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 group-hover/btn:translate-y-[-2px] transition-transform" />
              ) : (
                <ChevronDown className="w-4 h-4 group-hover/btn:translate-y-[2px] transition-transform" />
              )}
            </button>
          )}

          {/* Evidence Section */}
          <AnimatePresence>
            {isExpanded && problem.evidence && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                {problem.evidence.map((quote, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="pl-4 border-l-2 border-gray-300 bg-white/70 p-3 rounded-r-lg"
                  >
                    <p className="text-sm text-gray-700 italic">&ldquo;{quote}&rdquo;</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default function ProblemClusters({ problems }: ProblemClustersProps) {
  // Sort by severity then frequency
  const sortedProblems = [...problems].sort(
    (a, b) => b.severity_score - a.severity_score || b.frequency_score - a.frequency_score
  )

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-1">Problem Clusters</h2>
        <p className="text-sm text-gray-600">
          Key issues identified from user feedback, ranked by severity and frequency
        </p>
      </motion.div>

      <div className="space-y-4">
        {sortedProblems.length > 0 ? (
          sortedProblems.map((problem, index) => (
            <ProblemCard key={problem.id} problem={problem} index={index} />
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No problems identified</p>
          </div>
        )}
      </div>
    </div>
  )
}
