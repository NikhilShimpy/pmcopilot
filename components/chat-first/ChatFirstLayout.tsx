/**
 * ChatFirstLayout - Main layout component for chat-centered UI
 * Features:
 * - Collapsible sidebar on left
 * - Centered chat area
 * - Fixed bottom input bar
 * - Drag & drop context injection
 *
 * FIXED: Removed blocking thinking phases, improved streaming flow
 */

'use client'

import { useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  useChatFirstStore,
  OutputDepth,
  DroppedContext,
  SectionId,
} from '@/stores/chatFirstStore'
import { useChatStream } from '@/hooks/useChatStream'
import CollapsibleSidebar from './CollapsibleSidebar'
import ChatArea from './ChatArea'
import ChatInputBar from './ChatInputBar'

interface ChatFirstLayoutProps {
  projectId?: string
  projectName?: string
  children?: React.ReactNode
}

export function ChatFirstLayout({ projectId, projectName, children }: ChatFirstLayoutProps) {
  const {
    sidebarExpanded,
    sidebarHovered,
    messages,
    outputDepth,
    activeSection,
    streamingPhase,
    addMessage,
    updateMessage,
    appendToMessage,
    setStreamingPhase,
    setThinkingMessage,
    setError,
    setActiveSection,
    setProject,
    clearDroppedContexts,
  } = useChatFirstStore()

  const { stream, abort, isStreaming } = useChatStream()
  const abortedRef = useRef(false)

  // Set project context
  useEffect(() => {
    if (projectId && projectName) {
      setProject(projectId, projectName)
    }
  }, [projectId, projectName, setProject])

  // Calculate sidebar offset for main content
  const sidebarWidth = sidebarExpanded || sidebarHovered ? 280 : 64

  // Handle sending messages - FIXED: Removed blocking delays
  const handleSend = useCallback(async (
    message: string,
    contexts: DroppedContext[],
    depth: OutputDepth
  ) => {
    console.log('[ChatFirstLayout] handleSend called:', { message: message.slice(0, 50), contexts: contexts.length, depth })

    // Reset abort flag
    abortedRef.current = false

    // Build the full message with context
    let fullMessage = message

    if (contexts.length > 0) {
      const contextStr = contexts.map(ctx =>
        `[${ctx.type.toUpperCase()}] ${ctx.title}:\n${ctx.content}`
      ).join('\n\n')
      fullMessage = `${contextStr}\n\n${message || 'Tell me more about this.'}`
    }

    // Add user message
    addMessage({
      role: 'user',
      content: message || 'Analyze the provided context',
      droppedContext: contexts,
      depth,
    })

    // Add placeholder assistant message
    const assistantMsgId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    })

    // Set initial thinking state
    setStreamingPhase('connecting')
    setThinkingMessage('Connecting to AI...')

    try {
      // Build system prompt
      const depthInstructions: Record<OutputDepth, string> = {
        short: 'Keep response concise, 2-3 paragraphs max.',
        medium: 'Provide balanced detail, 4-6 paragraphs.',
        long: 'Be comprehensive with 8-12 paragraphs.',
        'extra-long': 'Maximum detail with 15+ paragraphs, include examples and edge cases.',
      }

      const systemPrompt = `You are PMCopilot, an AI Product Operating System.
You help product managers analyze feedback, generate PRDs, estimate costs, and plan development.

IMPORTANT RULES:
1. All costs MUST be in INR (Indian Rupees) using lakhs and crores format
2. Realistic Indian salary ranges (Junior: ₹4-8L, Mid: ₹8-15L, Senior: ₹15-30L, Lead: ₹25-45L, Principal: ₹40-70L)
3. Use AWS/GCP India regions for infrastructure costs
4. ${depthInstructions[depth]}
5. Structure your response with clear markdown headers
6. If the user is describing a product idea, provide comprehensive analysis including: Executive Summary, Problems, Features, PRD outline, Tasks, Cost Estimation, and Timeline

Current section filter: ${activeSection}
${activeSection !== 'all' ? `Focus specifically on ${activeSection.replace('-', ' ')} content.` : 'Provide comprehensive analysis.'}`

      console.log('[ChatFirstLayout] Starting stream to /api/chat-first')

      // Update to analyzing phase
      setStreamingPhase('analyzing-input')
      setThinkingMessage('Analyzing your input...')

      // Start streaming - NO blocking delays
      const result = await stream('/api/chat-first', {
        message: fullMessage,
        systemPrompt,
        depth,
        section: activeSection,
        projectId,
        history: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      }, {
        timeout: 120000, // 2 minutes for long responses
        onChunk: (chunk) => {
          // Update to streaming phase on first chunk
          if (streamingPhase !== 'streaming') {
            setStreamingPhase('streaming')
            setThinkingMessage('')
          }
          appendToMessage(assistantMsgId, chunk)
        },
        onComplete: (fullResponse) => {
          console.log('[ChatFirstLayout] Stream complete, response length:', fullResponse.length)
          updateMessage(assistantMsgId, {
            content: fullResponse,
            isStreaming: false,
          })
          setStreamingPhase('complete')
          setThinkingMessage('')
        },
        onError: (error) => {
          console.error('[ChatFirstLayout] Stream error:', error)
          updateMessage(assistantMsgId, {
            content: `**Error:** ${error.message}\n\nPlease try again.`,
            isStreaming: false,
            error: error.message,
          })
          setError(error.message)
          setStreamingPhase('error')
        },
      })

      console.log('[ChatFirstLayout] Stream result:', { aborted: result.aborted, contentLength: result.content?.length })

      if (result.aborted) {
        updateMessage(assistantMsgId, {
          content: result.content || 'Response cancelled',
          isStreaming: false,
        })
        setStreamingPhase('idle')
      }

    } catch (error) {
      console.error('[ChatFirstLayout] handleSend error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      updateMessage(assistantMsgId, {
        content: `**Error:** ${errorMessage}\n\nPlease try again.`,
        isStreaming: false,
        error: errorMessage,
      })
      setError(errorMessage)
      setStreamingPhase('error')
    }

    clearDroppedContexts()

    // Reset to idle after a short delay if not already
    setTimeout(() => {
      const currentPhase = useChatFirstStore.getState().streamingPhase
      if (currentPhase === 'complete' || currentPhase === 'error') {
        setStreamingPhase('idle')
      }
    }, 1000)
  }, [
    addMessage, updateMessage, appendToMessage, setStreamingPhase,
    setThinkingMessage, setError, clearDroppedContexts, stream,
    messages, activeSection, projectId, streamingPhase
  ])

  // Handle retry
  const handleRetry = useCallback(() => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      handleSend(
        lastUserMessage.content,
        lastUserMessage.droppedContext || [],
        lastUserMessage.depth || 'medium'
      )
    }
  }, [messages, handleSend])

  // Handle section click from message cards
  const handleSectionClick = useCallback((section: SectionId) => {
    setActiveSection(section)
  }, [setActiveSection])

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Sidebar */}
      <CollapsibleSidebar />

      {/* Main content area */}
      <motion.main
        animate={{ paddingLeft: sidebarWidth }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-gray-200/50 dark:border-gray-700/50
          bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {projectName || 'AI Workspace'}
            </h1>
            {activeSection !== 'all' && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-3 py-1 rounded-full text-sm font-medium
                  bg-blue-100 dark:bg-blue-900/30
                  text-blue-600 dark:text-blue-400
                  capitalize"
              >
                {activeSection.replace(/-/g, ' ')}
              </motion.span>
            )}
          </div>

          {/* Additional header actions */}
          {children}
        </header>

        {/* Chat area */}
        <ChatArea
          onSectionClick={handleSectionClick}
          onRetry={handleRetry}
        />

        {/* Input bar */}
        <ChatInputBar
          onSend={handleSend}
          disabled={isStreaming || streamingPhase === 'analyzing-input' || streamingPhase === 'streaming'}
        />
      </motion.main>
    </div>
  )
}

export default ChatFirstLayout
