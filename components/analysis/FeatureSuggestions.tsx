'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ChevronRight, Tag, Sparkles, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { Feature, FeaturePriority } from '@/types/analysis'

interface FeatureSuggestionsProps {
  features: Feature[]
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getPriorityColor = (priority: FeaturePriority) => {
    switch (priority) {
      case 'High':
        return {
          bg: 'bg-gradient-to-br from-red-50 to-pink-50',
          border: 'border-red-200',
          badge: 'bg-red-500 text-white',
          icon: 'from-red-500 to-pink-500',
        }
      case 'Medium':
        return {
          bg: 'bg-gradient-to-br from-yellow-50 to-amber-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-500 text-white',
          icon: 'from-yellow-500 to-amber-500',
        }
      case 'Low':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
          border: 'border-blue-200',
          badge: 'bg-blue-500 text-white',
          icon: 'from-blue-500 to-cyan-500',
        }
    }
  }

  const colors = getPriorityColor(feature.priority)

  const getComplexityEmoji = (complexity?: string) => {
    switch (complexity) {
      case 'Simple':
        return '🟢'
      case 'Medium':
        return '🟡'
      case 'Complex':
        return '🔴'
      default:
        return '⚪'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group relative border rounded-xl p-5 cursor-pointer hover:shadow-xl transition-all duration-300 ${colors.bg} ${colors.border}`}
    >
      {/* Priority Badge */}
      <div className="absolute top-3 right-3">
        <span className={`px-3 py-1 text-xs font-bold rounded-full ${colors.badge} shadow-sm`}>
          {feature.priority}
        </span>
      </div>

      {/* Icon */}
      <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${colors.icon} rounded-xl shadow-sm mb-4`}>
        <Lightbulb className="w-6 h-6 text-white" />
      </div>

      {/* Title */}
      <h3 className="font-bold text-lg text-gray-900 mb-2 pr-16 group-hover:text-gray-700 transition-colors">
        {feature.name}
      </h3>

      {/* Reason */}
      <p className="text-sm text-gray-700 leading-relaxed mb-4">
        {feature.reason}
      </p>

      {/* Meta Info */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {feature.complexity && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/70 text-gray-700 text-xs font-medium rounded-md">
            {getComplexityEmoji(feature.complexity)} {feature.complexity}
          </span>
        )}
        {feature.estimated_impact && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/70 text-gray-700 text-xs font-medium rounded-md">
            <TrendingUp className="w-3 h-3" />
            {feature.estimated_impact}
          </span>
        )}
      </div>

      {/* Linked Problems */}
      {feature.linked_problems && feature.linked_problems.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-gray-500" />
          <div className="flex flex-wrap gap-1">
            {feature.linked_problems.map((problemId, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-white/80 text-gray-600 text-xs font-medium rounded border border-gray-300"
              >
                Problem #{i + 1}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expand Indicator */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
        <span className="text-xs font-medium text-gray-600">
          {isExpanded ? 'Click to collapse' : 'Click for details'}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
        </motion.div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 pt-4 border-t border-gray-200 space-y-3 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Supporting Evidence */}
            {feature.supporting_evidence && feature.supporting_evidence.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Supporting Evidence
                </h4>
                <div className="space-y-2">
                  {feature.supporting_evidence.map((evidence, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="pl-3 border-l-2 border-gray-300 bg-white/70 p-2 rounded-r-lg"
                    >
                      <p className="text-xs text-gray-700 italic">&ldquo;{evidence}&rdquo;</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FeatureSuggestions({ features }: FeatureSuggestionsProps) {
  // Sort by priority
  const priorityOrder: Record<FeaturePriority, number> = {
    High: 0,
    Medium: 1,
    Low: 2,
  }
  const sortedFeatures = [...features].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  )

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-1">Feature Suggestions</h2>
        <p className="text-sm text-gray-600">
          AI-generated features prioritized by impact and linked to user problems
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedFeatures.length > 0 ? (
          sortedFeatures.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))
        ) : (
          <div className="col-span-2 text-center py-12 text-gray-500">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No features suggested</p>
          </div>
        )}
      </div>
    </div>
  )
}
