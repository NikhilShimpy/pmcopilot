'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  FolderKanban,
  Loader2,
  FileText,
  Lightbulb,
  Target,
  Briefcase,
  Zap,
} from 'lucide-react'

interface PremiumCreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string, description?: string) => Promise<{ success: boolean; project?: { id: string } }>
}

const PROJECT_TEMPLATES = [
  {
    icon: Lightbulb,
    name: 'Product Idea',
    description: 'Validate and plan a new product concept',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    icon: Target,
    name: 'Feature Request',
    description: 'Analyze and prioritize feature requests',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Briefcase,
    name: 'Competitive Analysis',
    description: 'Research competitors and market gaps',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: Zap,
    name: 'MVP Planning',
    description: 'Plan your minimum viable product',
    gradient: 'from-emerald-500 to-teal-500',
  },
]

export default function PremiumCreateProjectModal({ isOpen, onClose, onCreate }: PremiumCreateProjectModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCreating) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isCreating])

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Project name is required')
      return
    }

    setIsCreating(true)
    setError('')

    try {
      const fullDescription = selectedTemplate
        ? `[${selectedTemplate}] ${description}`.trim()
        : description

      const result = await onCreate(name.trim(), fullDescription || undefined)

      if (result.success && result.project) {
        // Reset form
        setName('')
        setDescription('')
        setSelectedTemplate(null)
        onClose()
        // Navigate to the new project's input page
        router.push(`/project/${result.project.id}`)
      } else {
        setError('Failed to create project')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleCreate()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={() => !isCreating && onClose()}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="w-full max-w-2xl
                bg-white dark:bg-gray-900
                rounded-3xl shadow-2xl shadow-gray-900/30
                border border-gray-200 dark:border-gray-800
                overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl
                    bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500
                    flex items-center justify-center shadow-xl shadow-purple-500/25">
                    <FolderKanban className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      Create New Project
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                      Start your product journey with AI-powered insights
                    </p>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => !isCreating && onClose()}
                  className="absolute top-6 right-6 p-2 rounded-xl
                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                    hover:bg-gray-100 dark:hover:bg-gray-800
                    transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6" onKeyDown={handleKeyDown}>
                {/* Project Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Project Name *
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setError('')
                    }}
                    placeholder="Enter your project name..."
                    maxLength={100}
                    className="w-full px-4 py-4 rounded-xl
                      bg-gray-50 dark:bg-gray-800
                      border-2 border-gray-200 dark:border-gray-700
                      text-gray-900 dark:text-white text-lg
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:border-blue-500 dark:focus:border-blue-500
                      focus:ring-4 focus:ring-blue-500/10
                      transition-all duration-200"
                  />
                </div>

                {/* Project Type (Templates) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Project Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {PROJECT_TEMPLATES.map((template) => (
                      <motion.button
                        key={template.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedTemplate(
                          selectedTemplate === template.name ? null : template.name
                        )}
                        className={`relative flex items-center gap-3 p-4 rounded-xl
                          border-2 transition-all duration-200 text-left
                          ${selectedTemplate === template.name
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                          bg-gradient-to-br ${template.gradient}`}>
                          <template.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm
                            ${selectedTemplate === template.name
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-900 dark:text-white'
                            }`}>
                            {template.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {template.description}
                          </p>
                        </div>
                        {selectedTemplate === template.name && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-blue-500
                              flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                    <span className="font-normal text-gray-400 ml-1">(optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe your project..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl
                      bg-gray-50 dark:bg-gray-800
                      border-2 border-gray-200 dark:border-gray-700
                      text-gray-900 dark:text-white
                      placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:border-blue-500 dark:focus:border-blue-500
                      focus:ring-4 focus:ring-blue-500/10
                      resize-none transition-all duration-200"
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">
                    {description.length}/500
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm font-medium"
                  >
                    {error}
                  </motion.p>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 py-6 bg-gray-50 dark:bg-gray-800/50
                border-t border-gray-200 dark:border-gray-800
                flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded ml-1">Enter</kbd> to create
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => !isCreating && onClose()}
                    disabled={isCreating}
                    className="px-6 py-3 rounded-xl
                      text-gray-700 dark:text-gray-300
                      hover:bg-gray-200 dark:hover:bg-gray-700
                      font-medium transition-colors
                      disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreate}
                    disabled={isCreating || !name.trim()}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl
                      bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
                      hover:from-blue-600 hover:via-purple-600 hover:to-pink-600
                      text-white font-semibold
                      shadow-lg shadow-purple-500/25
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-200"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Create Project
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
