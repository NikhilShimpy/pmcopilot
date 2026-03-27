/**
 * ChatInputBar - Bottom-fixed input like ChatGPT
 * Features:
 * - Multi-modal input (text, file upload, voice)
 * - Depth selector (Short/Medium/Long/Extra Long)
 * - Dropped context chips
 * - Glassmorphism styling
 * - Keyboard shortcuts
 */

'use client'

import { useRef, useCallback, useState, useEffect, KeyboardEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send,
  Paperclip,
  Mic,
  X,
  FileText,
  Image as ImageIcon,
  Upload,
  ChevronDown,
  Sparkles,
  Loader2,
  MessageSquare,
  Instagram,
  Linkedin,
} from 'lucide-react'
import { useChatFirstStore, OutputDepth, DroppedContext } from '@/stores/chatFirstStore'

// WhatsApp icon component
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

interface ChatInputBarProps {
  onSend: (message: string, contexts: DroppedContext[], depth: OutputDepth) => void
  disabled?: boolean
}

const DEPTH_OPTIONS: { value: OutputDepth; label: string; description: string }[] = [
  { value: 'short', label: 'Short', description: 'Concise, to the point' },
  { value: 'medium', label: 'Medium', description: 'Balanced detail' },
  { value: 'long', label: 'Long', description: 'Comprehensive' },
  { value: 'extra-long', label: 'Extra Long', description: 'Maximum detail' },
]

export function ChatInputBar({ onSend, disabled = false }: ChatInputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDepthMenu, setShowDepthMenu] = useState(false)
  const [showImportMenu, setShowImportMenu] = useState(false)

  const {
    inputValue,
    droppedContexts,
    outputDepth,
    streamingPhase,
    setInputValue,
    setOutputDepth,
    removeDroppedContext,
    clearDroppedContexts,
    setInputFocused,
  } = useChatFirstStore()

  const isLoading = streamingPhase !== 'idle' && streamingPhase !== 'complete' && streamingPhase !== 'error'

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [inputValue])

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        textareaRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSubmit = useCallback(() => {
    if (!inputValue.trim() && droppedContexts.length === 0) return
    if (isLoading || disabled) return

    onSend(inputValue.trim(), droppedContexts, outputDepth)
    setInputValue('')
    clearDroppedContexts()
  }, [inputValue, droppedContexts, outputDepth, isLoading, disabled, onSend, setInputValue, clearDroppedContexts])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      // TODO: Handle file upload
      console.log('Files selected:', files)
    }
  }, [])

  const handleImportClick = useCallback((source: string) => {
    setShowImportMenu(false)
    // TODO: Handle import from different sources
    console.log('Import from:', source)
  }, [])

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2
      bg-gradient-to-t from-white via-white to-transparent
      dark:from-gray-900 dark:via-gray-900">
      <div className="max-w-4xl mx-auto">
        {/* Dropped context chips */}
        <AnimatePresence>
          {droppedContexts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex flex-wrap gap-2 mb-3"
            >
              {droppedContexts.map((context) => (
                <ContextChip
                  key={context.id}
                  context={context}
                  onRemove={() => removeDroppedContext(context.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main input container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-end gap-2 p-3 rounded-2xl
            bg-white/80 dark:bg-gray-800/80
            backdrop-blur-xl
            border border-gray-200/50 dark:border-gray-700/50
            shadow-xl shadow-gray-200/30 dark:shadow-gray-900/50
            ring-1 ring-gray-100 dark:ring-gray-700/50"
        >
          {/* File upload button */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowImportMenu(!showImportMenu)}
              className="p-2.5 rounded-xl
                bg-gray-100 dark:bg-gray-700
                hover:bg-gray-200 dark:hover:bg-gray-600
                text-gray-500 dark:text-gray-400
                transition-colors"
              title="Upload or Import"
            >
              <Paperclip className="w-5 h-5" />
            </motion.button>

            {/* Import dropdown menu */}
            <AnimatePresence>
              {showImportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full left-0 mb-2 w-56
                    bg-white dark:bg-gray-800
                    rounded-xl shadow-xl border border-gray-200 dark:border-gray-700
                    overflow-hidden z-50"
                >
                  <div className="p-2">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                      Upload File
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.txt,.mp3,.wav"
                      className="hidden"
                    />
                    <ImportOption
                      icon={FileText}
                      label="PDF / Word / Text"
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <ImportOption
                      icon={ImageIcon}
                      label="Image"
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <ImportOption
                      icon={Mic}
                      label="Audio Recording"
                      onClick={() => fileInputRef.current?.click()}
                    />
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                      Import From
                    </p>
                    <ImportOption
                      icon={WhatsAppIcon}
                      label="WhatsApp"
                      onClick={() => handleImportClick('whatsapp')}
                    />
                    <ImportOption
                      icon={Linkedin}
                      label="LinkedIn"
                      onClick={() => handleImportClick('linkedin')}
                    />
                    <ImportOption
                      icon={Instagram}
                      label="Instagram"
                      onClick={() => handleImportClick('instagram')}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Paste feedback, idea, or ask anything…"
              disabled={disabled || isLoading}
              rows={1}
              className="w-full resize-none bg-transparent
                text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none
                text-base leading-relaxed
                max-h-[200px]"
            />
          </div>

          {/* Depth selector */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDepthMenu(!showDepthMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl
                bg-gray-100 dark:bg-gray-700
                hover:bg-gray-200 dark:hover:bg-gray-600
                text-gray-600 dark:text-gray-300
                text-sm font-medium
                transition-colors"
            >
              <span className="capitalize">{outputDepth.replace('-', ' ')}</span>
              <ChevronDown className="w-4 h-4" />
            </motion.button>

            {/* Depth dropdown menu */}
            <AnimatePresence>
              {showDepthMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute bottom-full right-0 mb-2 w-48
                    bg-white dark:bg-gray-800
                    rounded-xl shadow-xl border border-gray-200 dark:border-gray-700
                    overflow-hidden z-50"
                >
                  <div className="p-2">
                    <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                      Response Length
                    </p>
                    {DEPTH_OPTIONS.map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                        onClick={() => {
                          setOutputDepth(option.value)
                          setShowDepthMenu(false)
                        }}
                        className={`w-full flex flex-col items-start px-3 py-2 rounded-lg
                          text-left transition-colors
                          ${outputDepth === option.value
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {option.description}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={disabled || isLoading || (!inputValue.trim() && droppedContexts.length === 0)}
            className={`p-3 rounded-xl
              font-medium
              transition-all duration-200
              ${disabled || isLoading || (!inputValue.trim() && droppedContexts.length === 0)
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
              }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </motion.div>

        {/* Thinking indicator */}
        <AnimatePresence>
          {isLoading && (
            <ThinkingIndicator phase={streamingPhase} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Context Chip Component
interface ContextChipProps {
  context: DroppedContext
  onRemove: () => void
}

function ContextChip({ context, onRemove }: ContextChipProps) {
  const typeColors: Record<string, string> = {
    problem: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
    feature: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    task: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    section: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    text: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full
        text-sm font-medium border ${typeColors[context.type]}`}
    >
      <span className="capitalize text-xs opacity-70">{context.type}:</span>
      <span className="truncate max-w-[150px]">{context.title}</span>
      <button
        onClick={onRemove}
        className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}

// Import Option Component
interface ImportOptionProps {
  icon: React.ElementType
  label: string
  onClick: () => void
}

function ImportOption({ icon: Icon, label, onClick }: ImportOptionProps) {
  return (
    <motion.button
      whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
        text-gray-700 dark:text-gray-300 text-sm
        hover:text-blue-600 dark:hover:text-blue-400
        transition-colors"
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </motion.button>
  )
}

// Thinking Indicator Component
interface ThinkingIndicatorProps {
  phase: string
}

function ThinkingIndicator({ phase }: ThinkingIndicatorProps) {
  const phaseMessages: Record<string, string> = {
    connecting: 'Connecting to AI...',
    'analyzing-input': 'Analyzing your input...',
    'identifying-problems': 'Identifying key problems...',
    'generating-features': 'Generating feature suggestions...',
    'creating-prd': 'Creating PRD...',
    'estimating-costs': 'Estimating costs in INR...',
    streaming: 'Generating response...',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center justify-center gap-3 mt-3"
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full
        bg-gradient-to-r from-blue-500/10 to-purple-500/10
        border border-blue-200/50 dark:border-blue-800/50">
        <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          {phaseMessages[phase] || 'Thinking...'}
        </span>
        <div className="flex gap-1">
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full"
          />
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full"
          />
          <motion.span
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  )
}

export default ChatInputBar
