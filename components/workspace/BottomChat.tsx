/**
 * Bottom Chat - Emergent-style chat panel at bottom
 * Features: Sticky positioning, expandable, drop zone, robust streaming
 *
 * FIXED: Eliminated infinite render loops by:
 * 1. Using refs to avoid stale closures in callbacks
 * 2. Using individual store selectors
 * 3. Memoizing handlers with useCallback
 */

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  StopCircle,
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
import { ChatDropZone } from '@/components/dnd/DroppableZone'
import { useChatStream } from '@/hooks/useChatStream'
import type { DraggableItem, ChatMessage as ChatMessageType } from '@/types/workspace'

interface ChatMessageProps {
  message: ChatMessageType
  onCopy: () => void
  onRetry?: () => void
}

const ChatMessage = React.memo(function ChatMessage({ message, onCopy, onRetry }: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 2000)
  }, [message.content, onCopy])

  return (
    <div
      className={`group flex gap-3 ${
        message.role === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      {message.role === 'assistant' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`
          max-w-[80%] rounded-lg p-3
          ${
            message.role === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200'
          }
        `}
      >
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 last:mb-0 pl-4">{children}</ul>,
              ol: ({ children }) => <ol className="mb-2 last:mb-0 pl-4">{children}</ol>,
              code: ({ children, className }) => {
                const isInline = !className
                return isInline ? (
                  <code className="px-1 py-0.5 bg-slate-100 rounded text-xs">
                    {children}
                  </code>
                ) : (
                  <code className={className}>{children}</code>
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {message.isStreaming && (
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Streaming response...</span>
          </div>
        )}

        {/* Actions */}
        {message.role === 'assistant' && !message.isStreaming && (
          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
            {onRetry && (
              <>
                <span className="text-slate-300">|</span>
                <button
                  onClick={onRetry}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Regenerate
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {message.role === 'user' && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
          <span className="text-xs font-medium text-slate-600">U</span>
        </div>
      )}
    </div>
  )
})

interface BottomChatProps {
  projectId: string
  analysisResult: any
  className?: string
}

export function BottomChat({
  projectId,
  analysisResult,
  className = '',
}: BottomChatProps) {
  // FIXED: Use individual selectors to avoid infinite loops
  const messages = useChatStore(selectMessages)
  const status = useChatStore(selectStatus)
  const error = useChatStore(selectError)
  const isLoading = useChatStore(selectIsLoading)

  // FIXED: Use individual action selectors
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
  const generateQueryFromDroppedItem = useChatStore((state) => state.generateQueryFromDroppedItem)
  const clearDroppedItems = useChatStore((state) => state.clearDroppedItems)

  // FIXED: Use individual selectors for workspace store
  const chatExpanded = useWorkspaceStore((state) => state.chatExpanded)
  const toggleChat = useWorkspaceStore((state) => state.toggleChat)
  const expandChat = useWorkspaceStore((state) => state.expandChat)

  const [localInput, setLocalInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { stream, abort: abortStream } = useChatStream()

  // FIXED: Use ref to track status for callbacks to avoid stale closures
  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  // FIXED: One-way sync from store to local - only when store value differs
  const prevInputValueRef = useRef(inputValue)
  useEffect(() => {
    // Only sync if store value changed (not from our local updates)
    if (inputValue !== prevInputValueRef.current) {
      prevInputValueRef.current = inputValue
      setLocalInput(inputValue)
    }
  }, [inputValue])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length]) // FIXED: Only depends on length, not object reference

  // Keyboard shortcut: Cmd/Ctrl + K to focus chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!chatExpanded) {
          expandChat()
        }
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [chatExpanded, expandChat])

  // FIXED: Memoize handleSend to prevent recreation
  const handleSend = useCallback(async (messageToSend?: string) => {
    const finalMessage = messageToSend || localInput.trim()
    if (!finalMessage) return

    // Check loading state from current ref
    const currentStatus = useChatStore.getState().status
    if (currentStatus === 'thinking' || currentStatus === 'streaming') return

    // Clear input
    setLocalInput('')
    prevInputValueRef.current = '' // Update ref to prevent sync loop
    clearInput()
    clearDroppedItems()

    // Add user message
    addMessage({ role: 'user', content: finalMessage })

    // Add assistant message placeholder
    const assistantMessageId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
    })

    // Start streaming
    setStatus('thinking')
    setError(null)

    // FIXED: Track if we've switched to streaming to prevent duplicate calls
    let hasStartedStreaming = false

    try {
      startStreaming(assistantMessageId)

      await stream(
        '/api/chat',
        {
          message: finalMessage,
          context: {
            projectId,
            analysis: analysisResult,
          },
        },
        {
          timeout: 30000,
          onChunk: (chunk) => {
            appendToStream(assistantMessageId, chunk)
            // FIXED: Use ref to get current status, only switch once
            if (!hasStartedStreaming && statusRef.current === 'thinking') {
              hasStartedStreaming = true
              setStatus('streaming')
            }
          },
          onComplete: () => {
            finishStreaming(assistantMessageId)
          },
          onError: (err) => {
            setError(err.message)
            finishStreaming(assistantMessageId)
            useChatStore.getState().updateMessage(
              assistantMessageId,
              `⚠️ **Error:** ${err.message}\n\nPlease try again or rephrase your question.`
            )
          },
        }
      )
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to get response'
      setError(errorMessage)
      finishStreaming(assistantMessageId)
    }
  }, [localInput, projectId, analysisResult, clearInput, clearDroppedItems, addMessage, setStatus, setError, startStreaming, stream, appendToStream, finishStreaming])

  const handleRetry = useCallback(async () => {
    const retryMessage = prepareRetry()
    if (retryMessage) {
      await handleSend(retryMessage)
    }
  }, [prepareRetry, handleSend])

  const handleDrop = useCallback((item: DraggableItem) => {
    const query = generateQueryFromDroppedItem(item)
    setLocalInput(query)
    prevInputValueRef.current = query // Prevent sync loop
    setInputValue(query)
    if (!chatExpanded) {
      expandChat()
    }
    inputRef.current?.focus()
  }, [generateQueryFromDroppedItem, setInputValue, chatExpanded, expandChat])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const handleLocalInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalInput(e.target.value)
  }, [])

  const handleAbort = useCallback(() => {
    abort()
    abortStream()
  }, [abort, abortStream])

  const handleToggleChat = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    toggleChat()
  }, [toggleChat])

  // Memoize empty copy handler
  const handleCopyNoop = useCallback(() => {}, [])

  return (
    <motion.div
      initial={false}
      animate={{
        height: chatExpanded ? 400 : 60,
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`
        fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40
        ${className}
      `}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={toggleChat}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-slate-800">AI Assistant</h3>
          {status === 'streaming' && (
            <div className="flex items-center gap-1 text-xs text-purple-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Responding...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <XCircle className="w-3 h-3" />
              <span>Error</span>
            </div>
          )}
        </div>

        <button
          onClick={handleToggleChat}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
        >
          {chatExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-600" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-600" />
          )}
        </button>
      </div>

      {/* Chat content */}
      <AnimatePresence>
        {chatExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[340px]"
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onCopy={handleCopyNoop}
                  onRetry={
                    index === messages.length - 1 &&
                    message.role === 'assistant' &&
                    error
                      ? handleRetry
                      : undefined
                  }
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <ChatDropZone className="border-t border-slate-200 p-4">
              {error && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-red-700">
                    <XCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={localInput}
                  onChange={handleLocalInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about problems, features, or drag items here..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-50 disabled:text-slate-400"
                  rows={2}
                />
                <div className="flex flex-col gap-2">
                  {isLoading && (
                    <button
                      onClick={handleAbort}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      title="Stop generation"
                    >
                      <StopCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleSend()}
                    disabled={!localInput.trim() || isLoading}
                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                    title="Send message"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </ChatDropZone>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default BottomChat
