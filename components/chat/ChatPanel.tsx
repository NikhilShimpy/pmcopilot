'use client'

/**
 * Conversational AI Chat Panel - Right-side panel for asking questions about analysis
 * Provides context-aware AI assistant that understands your product data
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, Send, Loader2, X, Minimize2, Maximize2,
  Sparkles, Copy, RotateCw, ChevronDown, AlertCircle
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface ChatPanelProps {
  analysis: ComprehensiveStrategyResult
  projectId: string
  isOpen: boolean
  onClose: () => void
  onDrop?: (item: any) => void // For drag & drop
}

export function ChatPanel({
  analysis,
  projectId,
  isOpen,
  onClose,
  onDrop
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    role: 'assistant',
    content: `👋 Hi! I'm your AI product assistant. I've analyzed your feedback and I'm ready to answer questions.\n\n**Quick examples:**\n- "Why is this feature high priority?"\n- "Show me evidence for problem X"\n- "What should I build first?"\n- "Explain the impact scores"\n\nYou can also **drag any problem or feature** into this chat to ask about it!`,
    timestamp: new Date()
  }])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle keyboard shortcuts
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

  // Send message to AI
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Call chat API with streaming
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          analysis_id: analysis.metadata?.analysis_id || 'unknown',
          message: input,
          context: {
            problems: analysis.problem_analysis,
            features: analysis.feature_system,
            prd: analysis.prd,
            tasks: analysis.development_tasks,
            impact: analysis.impact_analysis
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ''

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }

      setMessages(prev => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  aiResponse += parsed.content
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1].content = aiResponse
                    return updated
                  })
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }

      // Mark streaming as complete
      setMessages(prev => {
        const updated = [...prev]
        if (updated[updated.length - 1]) {
          updated[updated.length - 1].isStreaming = false
        }
        return updated
      })

    } catch (err) {
      console.error('Chat error:', err)
      setError('Failed to get AI response. Please try again.')
      // Remove the failed assistant message
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    try {
      const data = e.dataTransfer.getData('application/json')
      const item = JSON.parse(data)

      // Auto-generate query based on dropped item
      let query = ''
      if (item.type === 'problem') {
        query = `Tell me more about this problem: "${item.payload.title}". Show me all the evidence and suggest how to solve it.`
      } else if (item.type === 'feature') {
        query = `Explain why the feature "${item.payload.name}" was suggested and what impact it will have.`
      } else if (item.type === 'task') {
        query = `Break down this task: "${item.payload.title}". What are the implementation details?`
      }

      if (query) {
        setInput(query)
        // Auto-send after short delay
        setTimeout(() => {
          const event = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true })
          sendMessage()
        }, 500)
      }

      if (onDrop) {
        onDrop(item)
      }
    } catch (err) {
      console.error('Drop error:', err)
    }
  }

  // Copy message to clipboard
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  // Regenerate last response
  const regenerateResponse = () => {
    if (messages.length >= 2) {
      const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
      if (lastUserMessage) {
        setInput(lastUserMessage.content)
        // Remove last AI response
        setMessages(prev => prev.filter(m => m.id !== messages[messages.length - 1].id))
        setTimeout(() => sendMessage(), 100)
      }
    }
  }

  // Quick action buttons
  const quickActions = [
    { label: "What's most urgent?", query: "What are the most urgent issues I should address first?" },
    { label: "Explain prioritization", query: "Explain how the features were prioritized" },
    { label: "Show top feedback", query: "Show me the most impactful user feedback" },
    { label: "Task breakdown", query: "Break down the implementation tasks by complexity" }
  ]

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className={`
        fixed right-0 top-0 h-screen bg-white border-l border-slate-200 shadow-2xl z-50
        flex flex-col
        ${isMinimized ? 'w-16' : 'w-[400px]'}
      `}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 flex items-center justify-between">
        {!isMinimized && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold">AI Assistant</h2>
              <p className="text-xs text-purple-100">Ask me anything</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-600 mb-2 font-medium">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInput(action.query)
                      inputRef.current?.focus()
                    }}
                    className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onCopy={copyMessage}
                onRegenerate={message.role === 'assistant' && !message.isStreaming ? regenerateResponse : undefined}
              />
            ))}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Ask me anything... (⌘+Enter to send)"
                  disabled={isLoading}
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Tip: Drag any problem or feature into this chat to ask about it!
            </p>
          </div>
        </>
      )}

      {isMinimized && (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-3 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <MessageSquare className="w-6 h-6 text-slate-400" />
          </button>
        </div>
      )}
    </motion.div>
  )
}

function ChatMessage({
  message,
  onCopy,
  onRegenerate
}: {
  message: Message
  onCopy: (content: string) => void
  onRegenerate?: () => void
}) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`
        flex gap-3
        ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${message.role === 'user' ? 'bg-blue-600' : 'bg-purple-600'}
      `}>
        {message.role === 'user' ? (
          <span className="text-white text-sm font-semibold">U</span>
        ) : (
          <Sparkles className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`
        flex-1 max-w-[85%]
        ${message.role === 'user' ? 'text-right' : 'text-left'}
      `}>
        <div className={`
          inline-block px-4 py-3 rounded-lg
          ${message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-900'
          }
        `}>
          {message.role === 'assistant' ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>
                {message.content || '_Thinking..._'}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm">{message.content}</p>
          )}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-purple-600 animate-pulse ml-1" />
          )}
        </div>

        {/* Actions */}
        {showActions && !message.isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 mt-2"
          >
            <button
              onClick={() => onCopy(message.content)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              Copy
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" />
                Regenerate
              </button>
            )}
            <span className="text-xs text-slate-400">
              {message.timestamp.toLocaleTimeString()}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
