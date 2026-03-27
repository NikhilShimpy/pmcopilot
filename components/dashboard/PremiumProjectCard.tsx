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
  ExternalLink,
  Sparkles,
  Users,
  Clock,
  ArrowRight,
  Copy,
  Share2,
  Star,
  StarOff,
} from 'lucide-react'
import type { Project } from '@/types'

interface PremiumProjectCardProps {
  project: Project
  onDelete: (id: string) => void
  index: number
}

export default function PremiumProjectCard({ project, onDelete, index }: PremiumProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)

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

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
      setIsDeleting(true)
      await onDelete(project.id)
    }
    setShowMenu(false)
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
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative overflow-hidden
        bg-white dark:bg-gray-900
        rounded-2xl border border-gray-200 dark:border-gray-800
        hover:border-gray-300 dark:hover:border-gray-700
        transition-all duration-500
        ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {/* Top Gradient Bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      {/* Card Content */}
      <div className="p-6">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <motion.div
            animate={{
              scale: isHovered ? 1.05 : 1,
              rotate: isHovered ? 3 : 0
            }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center
              bg-gradient-to-br ${gradient}
              shadow-lg shadow-gray-200 dark:shadow-gray-900`}
          >
            <FolderOpen className="w-7 h-7 text-white" />
          </motion.div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Favorite Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsFavorite(!isFavorite)}
              className={`p-2 rounded-xl transition-all duration-200
                ${isFavorite
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
                  : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'
                }
                opacity-0 group-hover:opacity-100`}
            >
              {isFavorite ? <Star className="w-4 h-4 fill-current" /> : <StarOff className="w-4 h-4" />}
            </motion.button>

            {/* Menu Button */}
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
                          onClick={() => setShowMenu(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                            text-sm text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Project
                        </button>
                        <button
                          onClick={() => setShowMenu(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                            text-sm text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Duplicate
                        </button>
                        <button
                          onClick={() => setShowMenu(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg
                            text-sm text-gray-700 dark:text-gray-300
                            hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          Share
                        </button>
                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                        <button
                          onClick={handleDelete}
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
        </div>

        {/* Project Name */}
        <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2 line-clamp-1
          group-hover:text-transparent group-hover:bg-clip-text
          group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600
          transition-all duration-300">
          {project.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 line-clamp-2 min-h-[40px]">
          {project.description || 'No description provided. Click to add project details.'}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(project.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Ready</span>
          </div>
        </div>

        {/* Progress/Status Bar (mock) */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>No analysis yet</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Start now
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: isHovered ? '15%' : '5%' }}
              transition={{ duration: 0.3 }}
              className={`h-full bg-gradient-to-r ${gradient} rounded-full`}
            />
          </div>
        </div>
      </div>

      {/* Footer with CTA */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
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
      </div>

      {/* Hover Glow Effect */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        className={`absolute inset-0 rounded-2xl pointer-events-none
          bg-gradient-to-br ${gradient} opacity-[0.03]`}
      />

      {/* Corner Shine Effect */}
      <motion.div
        initial={{ opacity: 0, x: -100, y: 100 }}
        animate={{
          opacity: isHovered ? 0.5 : 0,
          x: isHovered ? 100 : -100,
          y: isHovered ? -100 : 100
        }}
        transition={{ duration: 0.6 }}
        className="absolute w-32 h-32 rounded-full
          bg-gradient-to-br from-white to-transparent
          blur-2xl pointer-events-none"
      />
    </motion.div>
  )
}
