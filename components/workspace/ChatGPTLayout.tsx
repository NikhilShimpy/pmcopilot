/**
 * ChatGPT-Style Layout - Full screen chat without sidebar
 *
 * Layout Structure:
 * ┌─────────────────────────────────────────────────────┐
 * │              MAIN OUTPUT AREA (scrollable)          │
 * │         (All AI responses render here)              │
 * │                                                     │
 * │                                                     │
 * ├─────────────────────────────────────────────────────┤
 * │         FIXED CHAT INPUT (Always visible)           │
 * └─────────────────────────────────────────────────────┘
 */

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Send,
  RotateCcw,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  StopCircle,
  Sparkles,
  User,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  useChatStore,
  selectMessages,
  selectStatus,
  selectError,
  selectIsLoading
} from '@/stores/chatStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useChatStream } from '@/hooks/useChatStream'
import type { ChatMessage as ChatMessageType } from '@/types/workspace'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'
import type { Project } from '@/types'

interface ChatMessageProps {
  message: ChatMessageType
  onRetry?: () => void
}

const ChatMessage = React.memo(function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 p-6 ${isUser ? 'bg-white' : 'bg-slate-50'}`}
    >
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
        ${isUser ? 'bg-blue-600' : 'bg-gradient-to-br from-purple-600 to-blue-600'}
      `}>
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Sparkles className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-4xl">
        <div className="font-semibold text-sm text-slate-600 mb-2">
          {isUser ? 'You' : 'PMCopilot AI'}
        </div>

        <div className="prose prose-slate max-w-none text-slate-800">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
              h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-3 border-b pb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold text-slate-900 mt-5 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-900 mt-4 mb-2">{children}</h3>,
              h4: ({ children }) => <h4 className="text-base font-semibold text-slate-800 mt-3 mb-2">{children}</h4>,
              ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
              li: ({ children }) => <li className="text-slate-700 leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
              em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-purple-500 pl-4 py-2 italic text-slate-600 my-4 bg-purple-50 rounded-r-lg">
                  {children}
                </blockquote>
              ),
              code: ({ children, className }) => {
                const isInline = !className
                return isInline ? (
                  <code className="px-1.5 py-0.5 bg-slate-200 text-purple-700 rounded text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-4">
                    <code className={className}>{children}</code>
                  </pre>
                )
              },
              table: ({ children }) => (
                <div className="overflow-x-auto my-4 rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>,
              th: ({ children }) => <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">{children}</th>,
              td: ({ children }) => <td className="px-4 py-3 text-sm text-slate-700">{children}</td>,
              hr: () => <hr className="my-6 border-slate-200" />,
              a: ({ href, children }) => (
                <a href={href} className="text-purple-600 hover:text-purple-700 underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {message.content || '...'}
          </ReactMarkdown>
        </div>

        {/* Streaming indicator */}
        {message.isStreaming && (
          <div className="flex items-center gap-2 mt-4 text-purple-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Generating response...</span>
          </div>
        )}

        {/* Actions for assistant messages */}
        {!isUser && !message.isStreaming && message.content && (
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
})

interface ChatGPTLayoutProps {
  project: Project
  analysisResult: ComprehensiveStrategyResult | null
  className?: string
}

export function ChatGPTLayout({
  project,
  analysisResult,
  className = '',
}: ChatGPTLayoutProps) {
  // Chat store selectors
  const messages = useChatStore(selectMessages)
  const status = useChatStore(selectStatus)
  const error = useChatStore(selectError)
  const isLoading = useChatStore(selectIsLoading)

  const inputValue = useChatStore((state) => state.inputValue)
  const setInputValue = useChatStore((state) => state.setInputValue)
  const clearInput = useChatStore((state) => state.clearInput)
  const addMessage = useChatStore((state) => state.addMessage)
  const setStatus = useChatStore((state) => state.setStatus)
  const setError = useChatStore((state) => state.setError)
  const startStreaming = useChatStore((state) => state.startStreaming)
  const finishStreaming = useChatStore((state) => state.finishStreaming)
  const appendToStream = useChatStore((state) => state.appendToStream)
  const prepareRetry = useChatStore((state) => state.prepareRetry)
  const abort = useChatStore((state) => state.abort)

  // Workspace store
  const setProject = useWorkspaceStore((state) => state.setProject)
  const setAnalysisResult = useWorkspaceStore((state) => state.setAnalysisResult)

  const [localInput, setLocalInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { stream, abort: abortStream } = useChatStream()

  // Refs for stable callbacks
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  // Sync input from store
  const prevInputValueRef = useRef(inputValue)
  useEffect(() => {
    if (inputValue !== prevInputValueRef.current) {
      prevInputValueRef.current = inputValue
      setLocalInput(inputValue)
    }
  }, [inputValue])

  // Initialize workspace
  const lastProjectIdRef = useRef<string | null>(null)
  const lastAnalysisIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastProjectIdRef.current !== project.id) {
      lastProjectIdRef.current = project.id
      setProject(project.id, project.name)
    }
  }, [project.id, project.name, setProject])

  useEffect(() => {
    const currentAnalysisId = analysisResult?.metadata?.analysis_id ?? null
    if (currentAnalysisId !== lastAnalysisIdRef.current) {
      lastAnalysisIdRef.current = currentAnalysisId
      setAnalysisResult(analysisResult)
    }
  }, [analysisResult?.metadata?.analysis_id, setAnalysisResult, analysisResult])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Send message handler with auto-retry
  const handleSend = useCallback(async (messageToSend?: string, retryCount = 0) => {
    const finalMessage = messageToSend || localInput.trim()
    if (!finalMessage) return

    const currentStatus = useChatStore.getState().status
    if (currentStatus === 'thinking' || currentStatus === 'streaming') return

    // Clear input only on first attempt
    if (retryCount === 0) {
      setLocalInput('')
      prevInputValueRef.current = ''
      clearInput()
      // Add user message
      addMessage({ role: 'user', content: finalMessage })
    }

    // Store last message for retry
    useChatStore.getState().setLastUserMessage(finalMessage)

    // Add assistant placeholder
    const assistantMessageId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    })

    setStatus('thinking')
    setError(null)

    let hasStartedStreaming = false

    try {
      startStreaming(assistantMessageId)

      await stream(
        '/api/chat',
        {
          message: finalMessage,
          context: {
            projectId: project.id,
            analysis: analysisResult,
          },
        },
        {
          timeout: 60000, // 60 seconds for longer responses
          onChunk: (chunk) => {
            appendToStream(assistantMessageId, chunk)
            if (!hasStartedStreaming && statusRef.current === 'thinking') {
              hasStartedStreaming = true
              setStatus('streaming')
            }
          },
          onComplete: () => {
            finishStreaming(assistantMessageId)
          },
          onError: async (err) => {
            // Auto-retry once on first failure
            if (retryCount < 1) {
              console.log('Auto-retrying after error:', err.message)
              useChatStore.getState().removeMessage(assistantMessageId)
              await new Promise(resolve => setTimeout(resolve, 1000))
              handleSend(finalMessage, retryCount + 1)
              return
            }

            setError(err.message)
            finishStreaming(assistantMessageId)
            useChatStore.getState().updateMessage(
              assistantMessageId,
              `**Error:** ${err.message}\n\nPlease try again or rephrase your question.`
            )
          },
        }
      )
    } catch (err) {
      // Auto-retry once on first failure
      if (retryCount < 1) {
        console.log('Auto-retrying after catch:', err)
        useChatStore.getState().removeMessage(assistantMessageId)
        await new Promise(resolve => setTimeout(resolve, 1000))
        handleSend(finalMessage, retryCount + 1)
        return
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to get response'
      setError(errorMessage)
      finishStreaming(assistantMessageId)
      useChatStore.getState().updateMessage(
        assistantMessageId,
        `**Error:** ${errorMessage}\n\nPlease try again or rephrase your question.`
      )
    }
  }, [localInput, project.id, analysisResult, clearInput, addMessage, setStatus, setError, startStreaming, stream, appendToStream, finishStreaming])

  const handleRetry = useCallback(async () => {
    const retryMessage = prepareRetry()
    if (retryMessage) {
      await handleSend(retryMessage)
    }
  }, [prepareRetry, handleSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleAbort = useCallback(() => {
    abort()
    abortStream()
  }, [abort, abortStream])

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInput(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }, [])

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Messages Area - Scrollable, Full Width */}
      <div className="flex-1 overflow-y-auto">
        {messages.length <= 1 ? (
          // Welcome state - centered
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-2xl">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                How can I help you today?
              </h2>
              <p className="text-lg text-slate-600 mb-8">
                Ask me anything about your product analysis. I'll provide practical,
                actionable insights with real cost estimates and timelines.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm max-w-xl mx-auto">
                <button
                  onClick={() => setLocalInput('Generate a detailed week-by-week timeline for MVP development with milestones')}
                  className="p-4 text-left bg-slate-50 hover:bg-purple-50 hover:border-purple-300 rounded-xl border border-slate-200 transition-all"
                >
                  <span className="font-semibold text-slate-800 block mb-1">📅 Development Timeline</span>
                  <p className="text-slate-500 text-xs">Week-by-week MVP plan with milestones</p>
                </button>
                <button
                  onClick={() => setLocalInput('Estimate the complete development cost in INR with detailed breakdown by phase (MVP, Growth, Scale)')}
                  className="p-4 text-left bg-slate-50 hover:bg-purple-50 hover:border-purple-300 rounded-xl border border-slate-200 transition-all"
                >
                  <span className="font-semibold text-slate-800 block mb-1">💰 Cost Estimation</span>
                  <p className="text-slate-500 text-xs">Detailed cost breakdown in INR</p>
                </button>
                <button
                  onClick={() => setLocalInput('What are the top 5 problems users face and how should I prioritize solving them?')}
                  className="p-4 text-left bg-slate-50 hover:bg-purple-50 hover:border-purple-300 rounded-xl border border-slate-200 transition-all"
                >
                  <span className="font-semibold text-slate-800 block mb-1">🎯 Problem Priority</span>
                  <p className="text-slate-500 text-xs">Top problems ranked by impact</p>
                </button>
                <button
                  onClick={() => setLocalInput('What team composition and skills do I need to build this MVP? Include roles, seniority, and estimated salaries.')}
                  className="p-4 text-left bg-slate-50 hover:bg-purple-50 hover:border-purple-300 rounded-xl border border-slate-200 transition-all"
                >
                  <span className="font-semibold text-slate-800 block mb-1">👥 Team Planning</span>
                  <p className="text-slate-500 text-xs">Required team with salary estimates</p>
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Messages list - centered content
          <div className="max-w-5xl mx-auto">
            {messages.slice(1).map((message, sliceIndex) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={
                  // Show retry on the last assistant message if there's an error
                  sliceIndex === messages.length - 2 &&  // Last item in sliced array
                  message.role === 'assistant' &&
                  (error || message.content?.startsWith('**Error:**'))
                    ? handleRetry
                    : undefined
                }
              />
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </div>

      {/* Fixed Chat Input - ALWAYS VISIBLE */}
      <div className="border-t border-slate-200 bg-white p-4 shadow-lg">
        {/* Error Banner */}
        {error && (
          <div className="max-w-4xl mx-auto mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <XCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleRetry}
              className="px-4 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3 bg-slate-50 rounded-2xl border border-slate-200 p-3 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all shadow-sm">
            <textarea
              ref={inputRef}
              value={localInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about problems, features, costs, timeline, team requirements..."
              disabled={isLoading}
              className="flex-1 bg-transparent resize-none focus:outline-none text-slate-800 placeholder-slate-400 min-h-[24px] max-h-[200px] text-base"
              rows={1}
            />
            <div className="flex items-center gap-2">
              {isLoading && (
                <button
                  onClick={handleAbort}
                  className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Stop generation"
                >
                  <StopCircle className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => handleSend()}
                disabled={!localInput.trim() || isLoading}
                className="p-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                title="Send message (Enter)"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Enter</kbd> to send,{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  )
}

export default ChatGPTLayout
