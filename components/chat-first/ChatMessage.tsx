/**
 * ChatMessage - Individual message with structured output support
 * Features:
 * - Markdown rendering
 * - Structured sections with expand/collapse
 * - Streaming animation
 * - Copy functionality
 * - Glassmorphism cards
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  User,
  Bot,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Layers,
  CheckSquare,
  FileText,
  Briefcase,
  Target,
  Server,
  Map,
  Users,
  Package,
  IndianRupee,
  Calendar,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { ChatMessage as ChatMessageType, StructuredSection, SectionId } from '@/stores/chatFirstStore'

const sectionIcons: Record<string, React.ElementType> = {
  'executive-dashboard': Briefcase,
  'problem-analysis': AlertTriangle,
  'feature-system': Layers,
  'gaps-opportunities': Target,
  'prd': FileText,
  'system-design': Server,
  'development-tasks': CheckSquare,
  'execution-roadmap': Map,
  'manpower-planning': Users,
  'resources': Package,
  'cost-estimation': IndianRupee,
  'timeline': Calendar,
  'impact-analysis': TrendingUp,
}

interface ChatMessageProps {
  message: ChatMessageType
  onRetry?: () => void
  onSectionClick?: (section: SectionId) => void
}

export function ChatMessageComponent({ message, onRetry, onSectionClick }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const isStreaming = message.isStreaming

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 px-6 py-4 ${isUser ? 'bg-transparent' : 'bg-gray-50/50 dark:bg-gray-800/30'}`}
    >
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
        ${isUser
          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
          : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
        } shadow-lg ${isUser ? 'shadow-blue-500/30' : 'shadow-emerald-500/30'}`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {isUser ? 'You' : 'PMCopilot'}
          </span>

          {/* Actions */}
          {!isUser && !isStreaming && (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  transition-colors"
                title="Copy"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </motion.button>
            </div>
          )}
        </div>

        {/* Dropped context preview */}
        {message.droppedContext && message.droppedContext.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.droppedContext.map((ctx) => (
              <span
                key={ctx.id}
                className="px-2 py-1 text-xs rounded-full
                  bg-gray-100 dark:bg-gray-700
                  text-gray-600 dark:text-gray-300"
              >
                {ctx.type}: {ctx.title}
              </span>
            ))}
          </div>
        )}

        {/* Thinking steps */}
        <AnimatePresence>
          {message.thinkingSteps && message.thinkingSteps.length > 0 && isStreaming && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1"
            >
              {message.thinkingSteps.map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {step}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className={`prose prose-gray dark:prose-invert max-w-none
          prose-headings:font-semibold
          prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
          prose-p:text-gray-700 dark:prose-p:text-gray-300
          prose-li:text-gray-700 dark:prose-li:text-gray-300
          prose-strong:text-gray-900 dark:prose-strong:text-white
          prose-code:bg-gray-100 dark:prose-code:bg-gray-800
          prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950
          ${isStreaming ? 'animate-pulse-subtle' : ''}`}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-2 h-5 bg-blue-500 ml-0.5"
            />
          )}
        </div>

        {/* Structured sections */}
        {message.sections && message.sections.length > 0 && (
          <div className="space-y-3 mt-4">
            {message.sections.map((section) => (
              <StructuredSectionCard
                key={section.id}
                section={section}
                onClick={() => onSectionClick?.(section.type)}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {message.error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 rounded-xl
              bg-red-50 dark:bg-red-900/20
              border border-red-200 dark:border-red-800"
          >
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {message.error}
              </p>
            </div>
            {onRetry && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onRetry}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                  bg-red-100 dark:bg-red-900/40
                  text-red-700 dark:text-red-400
                  text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// Structured Section Card
interface StructuredSectionCardProps {
  section: StructuredSection
  onClick?: () => void
}

function StructuredSectionCard({ section, onClick }: StructuredSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(section.isExpanded)
  const Icon = sectionIcons[section.type] || FileText

  const toggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded)
  }, [isExpanded])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl overflow-hidden
        bg-white/60 dark:bg-gray-800/60
        backdrop-blur-sm
        border border-gray-200/50 dark:border-gray-700/50
        shadow-sm hover:shadow-md
        transition-shadow duration-200"
    >
      {/* Header */}
      <button
        onClick={toggleExpand}
        className="w-full flex items-center gap-3 px-4 py-3
          hover:bg-gray-50 dark:hover:bg-gray-700/50
          transition-colors"
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg
          bg-gradient-to-br from-blue-500/10 to-purple-500/10
          text-blue-600 dark:text-blue-400">
          <Icon className="w-4 h-4" />
        </div>
        <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">
          {section.title}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
              <div className="pt-3 prose prose-sm prose-gray dark:prose-invert max-w-none">
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>

              {/* View in section button */}
              {onClick && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClick}
                  className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg
                    bg-blue-50 dark:bg-blue-900/20
                    text-blue-600 dark:text-blue-400
                    text-sm font-medium
                    hover:bg-blue-100 dark:hover:bg-blue-900/30
                    transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  View in {section.title}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ChatMessageComponent
