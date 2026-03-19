'use client'

import { motion } from 'framer-motion'
import { FolderOpen, Plus, Sparkles } from 'lucide-react'

interface EmptyStateProps {
  onCreateProject: () => void
}

export default function EmptyState({ onCreateProject }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="relative mb-6">
        <motion.div
          animate={{
            rotate: [0, 5, -5, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center"
        >
          <FolderOpen className="w-12 h-12 text-blue-500" />
        </motion.div>
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center"
        >
          <Sparkles className="w-4 h-4 text-white" />
        </motion.div>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        No projects yet
      </h3>
      <p className="text-gray-500 text-center max-w-sm mb-6">
        Create your first project to start managing feedback and getting AI-powered insights for your product.
      </p>

      <motion.button
        onClick={onCreateProject}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/25"
      >
        <Plus className="w-5 h-5" />
        Create Your First Project
      </motion.button>
    </motion.div>
  )
}
