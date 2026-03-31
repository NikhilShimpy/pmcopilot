'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreVertical,
  Trash2,
  Edit2,
  FolderOpen,
  Calendar,
  Sparkles,
  Clock,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Brain,
  History,
} from 'lucide-react'
import type { Project } from '@/types'

interface PremiumProjectCardProps {
  project: Project
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>
  onEdit: (
    id: string,
    name: string,
    description?: string
  ) => Promise<{ success: boolean; error?: string }>
  index: number
}

export default function PremiumProjectCard({
  project,
  onDelete,
  onEdit,
  index,
}: PremiumProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description || '')
  const [editError, setEditError] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const handleDeleteClick = () => {
    setShowMenu(false)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)
    setShowDeleteConfirm(false)
    const result = await onDelete(project.id)
    if (!result.success) {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  const handleOpenEdit = () => {
    setShowMenu(false)
    setEditName(project.name)
    setEditDescription(project.description || '')
    setEditError(null)
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      setEditError('Project name is required')
      return
    }

    setIsSavingEdit(true)
    setEditError(null)

    const result = await onEdit(project.id, editName, editDescription)
    if (result.success) {
      setIsSavingEdit(false)
      setShowEditModal(false)
      return
    }

    setEditError(result.error || 'Failed to save changes')
    setIsSavingEdit(false)
  }

  // Generate gradient based on project name hash
  const getGradient = () => {
    const gradients = [
      'from-blue-500 via-blue-600 to-indigo-600',
      'from-purple-500 via-purple-600 to-violet-600',
      'from-emerald-500 via-emerald-600 to-teal-600',
      'from-orange-500 via-orange-600 to-amber-600',
      'from-pink-500 via-pink-600 to-rose-600',
      'from-cyan-500 via-cyan-600 to-sky-600',
    ]
    const hash = project.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return gradients[hash % gradients.length]
  }

  const gradient = getGradient()

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.08,
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative overflow-hidden
          bg-white dark:bg-gray-900
          rounded-2xl border border-gray-200/80 dark:border-gray-800/80
          transition-all duration-300 ease-out
          ${isHovered ? 'shadow-xl shadow-gray-200/50 dark:shadow-gray-900/50 border-gray-300 dark:border-gray-700 -translate-y-1' : 'shadow-sm'}
          ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <motion.div
              animate={{
                scale: isHovered ? 1.05 : 1,
                rotate: isHovered ? 3 : 0,
              }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center
                bg-gradient-to-br ${gradient}
                shadow-lg shadow-gray-200 dark:shadow-gray-900`}
            >
              <FolderOpen className="w-7 h-7 text-white" />
            </motion.div>

            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200
                  opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="w-4 h-4" />
              </motion.button>

              <AnimatePresence>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute right-0 top-full mt-2 w-48
                        bg-white dark:bg-gray-800
                        rounded-xl shadow-2xl shadow-gray-200/50 dark:shadow-gray-900/50
                        border border-gray-200 dark:border-gray-700
                        overflow-hidden z-50"
                    >
                      <div className="p-1">
                        <button
                          onClick={handleOpenEdit}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                            text-sm text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Project
                        </button>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                        <button
                          onClick={handleDeleteClick}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                            text-sm text-red-600 dark:text-red-400
                            hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 line-clamp-1">
            {project.name}
          </h3>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 line-clamp-2 min-h-[40px]">
            {project.description || 'No description provided yet.'}
          </p>

          <div className="flex items-center gap-4 mb-5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(project.created_at)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ready for analysis</span>
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Project workspace</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {formatDate(project.updated_at || project.created_at)}
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: isHovered ? '70%' : '55%' }}
                transition={{ duration: 0.3 }}
                className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-800/30 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <Link
            href={`/project/${project.id}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
              font-semibold text-sm
              bg-gray-900 dark:bg-white
              text-white dark:text-gray-900
              hover:bg-gray-800 dark:hover:bg-gray-100
              shadow-lg shadow-gray-900/10 dark:shadow-white/5
              transition-all duration-200 group/btn"
          >
            <span>Open Project</span>
            <motion.div
              animate={{ x: isHovered ? 3 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </Link>
          <Link
            href={`/analysis?project=${project.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
              font-medium text-sm border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-all duration-200"
          >
            <Brain className="w-4 h-4" />
            <span>AI Analysis</span>
          </Link>
          <Link
            href={`/project/${project.id}/history`}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
              font-medium text-sm border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-all duration-200"
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 0.02 : 0 }}
          className={`absolute inset-0 rounded-2xl pointer-events-none
            bg-gradient-to-br ${gradient}`}
        />

        <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300
          ${isHovered ? 'opacity-100' : 'opacity-0'}
          ring-1 ring-inset ring-gray-200/50 dark:ring-gray-700/50`}
        />
      </motion.div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleDeleteCancel}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                w-full max-w-md p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
                border border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Project</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Delete <span className="font-semibold">&quot;{project.name}&quot;</span> and all related analysis data?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteCancel}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                    text-gray-700 dark:text-gray-300 font-medium
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium
                    hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => !isSavingEdit && setShowEditModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                w-full max-w-lg p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
                border border-gray-200 dark:border-gray-800 space-y-4"
            >
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Project</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Update your project name and description.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  value={editName}
                  onChange={(event) => {
                    setEditName(event.target.value)
                    setEditError(null)
                  }}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700
                    bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {editError && (
                <p className="text-sm text-red-500">{editError}</p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
                    text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800
                    transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 text-white
                    hover:bg-blue-700 transition-colors disabled:opacity-50
                    flex items-center gap-2"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
