'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Send,
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  ChevronDown,
  X,
  Loader2,
  Instagram,
  Linkedin,
  MessageSquare,
  Zap,
  Target,
  TrendingUp,
  Lightbulb,
  Edit2,
  Trash2,
  Settings,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import type { Project } from '@/types'

// WhatsApp icon component
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

type OutputLength = 'short' | 'medium' | 'long' | 'extra-long'

interface ProjectInputClientProps {
  project: Project
  user: {
    id: string
    email?: string | null
  }
}

const OUTPUT_LENGTH_OPTIONS: { value: OutputLength; label: string; description: string; icon: React.ElementType }[] = [
  { value: 'short', label: 'Short', description: 'Concise overview, 2-3 pages', icon: Zap },
  { value: 'medium', label: 'Medium', description: 'Balanced detail, 5-8 pages', icon: Target },
  { value: 'long', label: 'Long', description: 'Comprehensive, 10-15 pages', icon: TrendingUp },
  { value: 'extra-long', label: 'Extra Long', description: 'Maximum detail, 20+ pages', icon: Lightbulb },
]

const QUICK_PROMPTS = [
  "I'm building a food delivery app for college students...",
  "I have user feedback from our beta testers...",
  "I want to analyze competitor products in...",
  "Help me create a PRD for a SaaS product that...",
]

export default function ProjectInputClient({ project: initialProject, user }: ProjectInputClientProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [project, setProject] = useState(initialProject)
  const [inputValue, setInputValue] = useState('')
  const [outputLength, setOutputLength] = useState<OutputLength>('long')
  const [showLengthMenu, setShowLengthMenu] = useState(false)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [saving, setSaving] = useState(false)

  // Focus textarea on mount
  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 400)}px`
    }
  }, [inputValue])

  // Keyboard shortcut: Cmd/Ctrl + Enter to generate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && inputValue.trim()) {
        e.preventDefault()
        handleGenerate()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [inputValue])

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files])
      showToast(`${files.length} file(s) added`, 'success')
    }
    setShowUploadMenu(false)
  }, [showToast])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleGenerate = async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) {
      showToast('Please enter your product idea or upload files', 'error')
      return
    }

    setIsGenerating(true)

    try {
      // Prepare the input text (including file contents if any)
      let fullInput = inputValue.trim()

      // TODO: Handle file uploads - for now just mention them
      if (uploadedFiles.length > 0) {
        fullInput += `\n\n[Uploaded files: ${uploadedFiles.map(f => f.name).join(', ')}]`
      }

      // Save the input to the project (optional - can be used to restore later)
      const supabase = createClientSupabaseClient()
      await supabase
        .from('projects')
        .update({
          description: fullInput.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id)
        .eq('user_id', user.id)

      // Navigate to output page with parameters
      // URLSearchParams handles encoding automatically - do NOT use encodeURIComponent
      const params = new URLSearchParams({
        input: fullInput,  // Fixed: No manual encoding needed
        length: outputLength,
        generate: 'true',
      })

      router.push(`/project/${project.id}/output?${params.toString()}`)

    } catch (error) {
      console.error('Error starting generation:', error)
      showToast('Failed to start generation', 'error')
      setIsGenerating(false)
    }
  }

  const handleSaveProject = async () => {
    if (!editName.trim()) {
      showToast('Project name cannot be empty', 'error')
      return
    }

    setSaving(true)
    try {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: editName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', project.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      setProject(data)
      setIsEditing(false)
      showToast('Project updated', 'success')
    } catch {
      showToast('Failed to update project', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 h-16
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl
        border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="h-full max-w-5xl mx-auto px-6 flex items-center justify-between">
          {/* Left - Back + Project Title */}
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-xl
                text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>

            <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-1.5 rounded-lg
                    bg-gray-100 dark:bg-gray-800
                    border border-gray-200 dark:border-gray-700
                    text-gray-900 dark:text-white font-semibold
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveProject}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg
                    bg-blue-500 text-white text-sm font-medium
                    hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(project.name)
                  }}
                  className="px-3 py-1.5 rounded-lg
                    text-gray-500 hover:text-gray-700 text-sm
                    hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-gray-900 dark:text-white
                  hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
              >
                <h1 className="font-semibold text-lg">{project.name}</h1>
                <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>

          {/* Right - Settings */}
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600
                hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-3xl">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
              bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10
              border border-blue-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                AI-Powered Analysis
              </span>
            </div>

            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              What would you like to build?
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              Describe your product idea, paste customer feedback, or upload documents.
              AI will generate the All Sections overview first, then each section on demand.
            </p>
          </motion.div>

          {/* Main Input Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-900
              rounded-3xl border border-gray-200 dark:border-gray-800
              shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50
              overflow-hidden"
          >
            {/* Uploaded Files */}
            <AnimatePresence>
              {uploadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pt-4"
                >
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl
                          bg-blue-50 dark:bg-blue-900/30
                          border border-blue-100 dark:border-blue-800"
                      >
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800"
                        >
                          <X className="w-3 h-3 text-blue-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Textarea */}
            <div className="p-6">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe your product idea, customer needs, or paste feedback here..."
                rows={6}
                className="w-full resize-none bg-transparent
                  text-gray-900 dark:text-white text-lg leading-relaxed
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none"
              />
            </div>

            {/* Actions Bar */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between gap-4">
                {/* Left Actions */}
                <div className="flex items-center gap-2">
                  {/* Upload Button */}
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowUploadMenu(!showUploadMenu)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                        bg-white dark:bg-gray-700
                        border border-gray-200 dark:border-gray-600
                        text-gray-600 dark:text-gray-300 text-sm font-medium
                        hover:bg-gray-100 dark:hover:bg-gray-600
                        transition-all"
                    >
                      <Paperclip className="w-4 h-4" />
                      <span>Attach</span>
                    </motion.button>

                    <AnimatePresence>
                      {showUploadMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowUploadMenu(false)} />
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
                                accept=".pdf,.doc,.docx,.txt,.csv,.json"
                                multiple
                                className="hidden"
                              />
                              <UploadOption
                                icon={FileText}
                                label="PDF / Word / Text"
                                onClick={() => fileInputRef.current?.click()}
                              />
                              <UploadOption
                                icon={ImageIcon}
                                label="Image / Screenshot"
                                onClick={() => fileInputRef.current?.click()}
                              />
                              <UploadOption
                                icon={Mic}
                                label="Audio Recording"
                                onClick={() => showToast('Coming soon', 'info')}
                              />
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                                Import From
                              </p>
                              <UploadOption
                                icon={WhatsAppIcon}
                                label="WhatsApp"
                                onClick={() => showToast('Coming soon', 'info')}
                              />
                              <UploadOption
                                icon={Linkedin}
                                label="LinkedIn"
                                onClick={() => showToast('Coming soon', 'info')}
                              />
                              <UploadOption
                                icon={Instagram}
                                label="Instagram"
                                onClick={() => showToast('Coming soon', 'info')}
                              />
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Output Length Selector */}
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowLengthMenu(!showLengthMenu)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                        bg-white dark:bg-gray-700
                        border border-gray-200 dark:border-gray-600
                        text-gray-600 dark:text-gray-300 text-sm font-medium
                        hover:bg-gray-100 dark:hover:bg-gray-600
                        transition-all"
                    >
                      <span className="capitalize">{outputLength.replace('-', ' ')}</span>
                      <ChevronDown className="w-4 h-4" />
                    </motion.button>

                    <AnimatePresence>
                      {showLengthMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowLengthMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-2 w-64
                              bg-white dark:bg-gray-800
                              rounded-xl shadow-xl border border-gray-200 dark:border-gray-700
                              overflow-hidden z-50"
                          >
                            <div className="p-2">
                              <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                                Output Length
                              </p>
                              {OUTPUT_LENGTH_OPTIONS.map((option) => (
                                <motion.button
                                  key={option.value}
                                  whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                                  onClick={() => {
                                    setOutputLength(option.value)
                                    setShowLengthMenu(false)
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg
                                    text-left transition-colors
                                    ${outputLength === option.value
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                                    ${outputLength === option.value
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 dark:bg-gray-700'
                                    }`}>
                                    <option.icon className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{option.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {option.description}
                                    </p>
                                  </div>
                                </motion.button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Generate Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGenerate}
                  disabled={isGenerating || (!inputValue.trim() && uploadedFiles.length === 0)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl
                    bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500
                    hover:from-blue-600 hover:via-purple-600 hover:to-pink-600
                    text-white font-semibold
                    shadow-lg shadow-purple-500/25
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-all duration-200"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Quick Prompts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              Try one of these to get started:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((prompt, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setInputValue(prompt)}
                  className="px-4 py-2 rounded-xl
                    bg-white dark:bg-gray-800
                    border border-gray-200 dark:border-gray-700
                    text-sm text-gray-600 dark:text-gray-400
                    hover:border-blue-300 dark:hover:border-blue-700
                    hover:text-blue-600 dark:hover:text-blue-400
                    transition-all"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Keyboard Hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-xs text-gray-400 mt-8"
          >
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono ml-1">Enter</kbd>
            {' '}to generate
          </motion.p>
        </div>
      </main>
    </div>
  )
}

// Upload Option Component
interface UploadOptionProps {
  icon: React.ElementType
  label: string
  onClick: () => void
}

function UploadOption({ icon: Icon, label, onClick }: UploadOptionProps) {
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
