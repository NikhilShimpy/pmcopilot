/**
 * ChatArea - Main scrollable chat output area
 * Features:
 * - Scrollable message list
 * - Auto-scroll on new messages
 * - Empty state
 * - Section filtering
 */

'use client'

import { useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Sparkles } from 'lucide-react'
import { useChatFirstStore, SectionId } from '@/stores/chatFirstStore'
import ChatMessageComponent from './ChatMessage'

interface ChatAreaProps {
  onSectionClick?: (section: SectionId) => void
  onRetry?: () => void
}

export function ChatArea({ onSectionClick, onRetry }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { messages, activeSection, streamingPhase } = useChatFirstStore()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingPhase])

  // Filter messages based on active section
  const filteredMessages = activeSection === 'all'
    ? messages
    : messages.filter(msg => {
        // Show user messages in all sections
        if (msg.role === 'user') return true

        // Filter assistant messages by sections they contain
        if (msg.sections) {
          return msg.sections.some(s => s.type === activeSection)
        }

        // Show messages without sections in all views
        return true
      })

  const isEmpty = filteredMessages.length === 0

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto scroll-smooth"
      style={{ scrollbarGutter: 'stable' }}
    >
      <div className="max-w-4xl mx-auto py-8 pb-40">
        {/* Section indicator */}
        {activeSection !== 'all' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <div className="px-4 py-2 rounded-full
              bg-gradient-to-r from-blue-500/10 to-purple-500/10
              border border-blue-200/50 dark:border-blue-800/50">
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 capitalize">
                Viewing: {activeSection.replace('-', ' ')}
              </span>
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <EmptyState key="empty" />
          ) : (
            filteredMessages.map((message) => (
              <ChatMessageComponent
                key={message.id}
                message={message}
                onRetry={message.error ? onRetry : undefined}
                onSectionClick={onSectionClick}
              />
            ))
          )}
        </AnimatePresence>

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

// Empty State Component
function EmptyState() {
  const { activeSection } = useChatFirstStore()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6"
    >
      <div className="w-20 h-20 rounded-3xl
        bg-gradient-to-br from-blue-500/10 to-purple-500/10
        flex items-center justify-center mb-6">
        {activeSection === 'all' ? (
          <Sparkles className="w-10 h-10 text-blue-500" />
        ) : (
          <MessageSquare className="w-10 h-10 text-blue-500" />
        )}
      </div>

      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
        {activeSection === 'all'
          ? 'Start a conversation'
          : `No ${activeSection.replace('-', ' ')} content yet`
        }
      </h2>

      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md mb-8">
        {activeSection === 'all'
          ? 'Paste your product feedback, user interviews, or feature requests below to get AI-powered analysis.'
          : 'Generate content by sending a message, then navigate to specific sections to view filtered results.'
        }
      </p>

      {activeSection === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <SuggestionCard
            title="Analyze feedback"
            description="Paste user feedback to identify problems and opportunities"
            prompt="Analyze this feedback and identify key problems..."
          />
          <SuggestionCard
            title="Generate PRD"
            description="Create a comprehensive Product Requirements Document"
            prompt="Generate a detailed PRD for a mobile app that..."
          />
          <SuggestionCard
            title="Estimate costs"
            description="Get realistic cost estimates in INR"
            prompt="Estimate the development cost in INR for..."
          />
          <SuggestionCard
            title="Plan roadmap"
            description="Create an execution timeline with milestones"
            prompt="Create a development roadmap for..."
          />
        </div>
      )}
    </motion.div>
  )
}

// Suggestion Card Component
interface SuggestionCardProps {
  title: string
  description: string
  prompt: string
}

function SuggestionCard({ title, description, prompt }: SuggestionCardProps) {
  const { setInputValue, setInputFocused } = useChatFirstStore()

  const handleClick = useCallback(() => {
    setInputValue(prompt)
    setInputFocused(true)
    // Focus the input
    const textarea = document.querySelector('textarea')
    textarea?.focus()
  }, [prompt, setInputValue, setInputFocused])

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="flex flex-col items-start p-4 rounded-xl
        bg-white/60 dark:bg-gray-800/60
        backdrop-blur-sm
        border border-gray-200/50 dark:border-gray-700/50
        shadow-sm hover:shadow-md
        text-left
        transition-all duration-200"
    >
      <span className="font-medium text-gray-900 dark:text-white mb-1">
        {title}
      </span>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {description}
      </span>
    </motion.button>
  )
}

export default ChatArea
