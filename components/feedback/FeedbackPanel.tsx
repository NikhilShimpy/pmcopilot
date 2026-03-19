'use client'

/**
 * PMCopilot - Feedback Panel Component
 *
 * Displays real-time feedback feed with animations
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Mail,
  Slack,
  Webhook,
  Clock,
  User,
  ChevronDown,
  RefreshCw,
  Bell,
  Filter,
  X,
} from 'lucide-react'
import type { Feedback, FeedbackSource } from '@/services/ingestion.service'

interface FeedbackPanelProps {
  feedbacks: Feedback[]
  isLoading: boolean
  error: string | null
  newCount: number
  onClearNewCount: () => void
  onRefresh: () => void
  stats: {
    total: number
    bySource: Record<string, number>
    last24h: number
    needsAnalysis: boolean
  }
}

const SOURCE_CONFIG: Record<
  FeedbackSource,
  { icon: typeof Mail; color: string; bg: string; label: string }
> = {
  gmail: {
    icon: Mail,
    color: 'text-red-600',
    bg: 'bg-red-100',
    label: 'Gmail',
  },
  slack: {
    icon: Slack,
    color: 'text-purple-600',
    bg: 'bg-purple-100',
    label: 'Slack',
  },
  manual: {
    icon: MessageSquare,
    color: 'text-blue-600',
    bg: 'bg-blue-100',
    label: 'Manual',
  },
  webhook: {
    icon: Webhook,
    color: 'text-green-600',
    bg: 'bg-green-100',
    label: 'Webhook',
  },
  intercom: {
    icon: MessageSquare,
    color: 'text-orange-600',
    bg: 'bg-orange-100',
    label: 'Intercom',
  },
  api: {
    icon: Webhook,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    label: 'API',
  },
}

function getSourceConfig(source: FeedbackSource) {
  return SOURCE_CONFIG[source] || SOURCE_CONFIG.manual
}

function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return date.toLocaleDateString()
}

function FeedbackItem({
  feedback,
  isNew,
  index,
}: {
  feedback: Feedback
  isNew: boolean
  index: number
}) {
  const config = getSourceConfig(feedback.source)
  const IconComponent = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`p-4 rounded-xl border transition-all ${
        isNew
          ? 'bg-blue-50 border-blue-200 shadow-sm'
          : 'bg-white border-gray-100 hover:border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Source Icon */}
        <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
          <IconComponent className={`w-4 h-4 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
            {isNew && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500 text-white"
              >
                New
              </motion.span>
            )}
            <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(feedback.created_at)}
            </span>
          </div>

          <p className="text-sm text-gray-700 line-clamp-3">{feedback.content}</p>

          {/* Metadata */}
          {feedback.metadata && (
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              {feedback.metadata.from && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {feedback.metadata.from}
                </span>
              )}
              {feedback.metadata.user && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {feedback.metadata.user}
                </span>
              )}
              {feedback.metadata.channel && (
                <span className="text-purple-400">#{feedback.metadata.channel}</span>
              )}
              {feedback.metadata.subject && (
                <span className="truncate max-w-[150px]" title={feedback.metadata.subject}>
                  {feedback.metadata.subject}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function FeedbackPanel({
  feedbacks,
  isLoading,
  error,
  newCount,
  onClearNewCount,
  onRefresh,
  stats,
}: FeedbackPanelProps) {
  const [filterSource, setFilterSource] = useState<FeedbackSource | 'all'>('all')
  const [isExpanded, setIsExpanded] = useState(true)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track which items are "new" (haven't been seen yet)
  useEffect(() => {
    if (feedbacks.length > 0) {
      // After a delay, mark all current items as seen
      const timer = setTimeout(() => {
        setSeenIds(new Set(feedbacks.map((f) => f.id)))
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [feedbacks])

  // Filter feedbacks
  const filteredFeedbacks =
    filterSource === 'all'
      ? feedbacks
      : feedbacks.filter((f) => f.source === filterSource)

  // Get unique sources for filter
  const availableSources = Array.from(new Set(feedbacks.map((f) => f.source)))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Live Feedback</h3>
            <p className="text-xs text-gray-500">
              {stats.total} total • {stats.last24h} in last 24h
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={(e) => {
                e.stopPropagation()
                onClearNewCount()
              }}
              className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 transition-colors"
            >
              <Bell className="w-3 h-3" />
              {newCount} new
              <X className="w-3 h-3" />
            </motion.button>
          )}

          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onRefresh()
            }}
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </motion.div>
        </div>
      </div>

      {/* Analysis Threshold Indicator */}
      {stats.needsAnalysis && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 py-2 bg-green-50 border-t border-green-100"
        >
          <p className="text-xs text-green-700 font-medium">
            Analysis threshold reached! Auto-analysis will trigger soon.
          </p>
        </motion.div>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Filter Bar */}
            {availableSources.length > 1 && (
              <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <div className="flex gap-1 overflow-x-auto">
                  <button
                    onClick={() => setFilterSource('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                      filterSource === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All ({feedbacks.length})
                  </button>
                  {availableSources.map((source) => {
                    const config = getSourceConfig(source)
                    const count = stats.bySource[source] || 0
                    return (
                      <button
                        key={source}
                        onClick={() => setFilterSource(source)}
                        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${
                          filterSource === source
                            ? `${config.bg} ${config.color}`
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {config.label} ({count})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Feed */}
            <div
              ref={scrollRef}
              className="max-h-[400px] overflow-y-auto p-4 space-y-3"
            >
              {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {isLoading && feedbacks.length === 0 ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="p-4 rounded-xl bg-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-200" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/4" />
                            <div className="h-3 bg-gray-200 rounded w-3/4" />
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredFeedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 mb-2">No feedback yet</p>
                  <p className="text-sm text-gray-400">
                    Connect an integration to start collecting feedback
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredFeedbacks.map((feedback, index) => (
                    <FeedbackItem
                      key={feedback.id}
                      feedback={feedback}
                      isNew={!seenIds.has(feedback.id)}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Stats Bar */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>
                Showing {filteredFeedbacks.length} of {stats.total} feedbacks
              </span>
              <div className="flex items-center gap-3">
                {Object.entries(stats.bySource)
                  .slice(0, 4)
                  .map(([source, count]) => {
                    const config = getSourceConfig(source as FeedbackSource)
                    return (
                      <span key={source} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${config.bg}`} />
                        {count}
                      </span>
                    )
                  })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
