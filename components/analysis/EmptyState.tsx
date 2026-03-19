'use client'

import { motion } from 'framer-motion'
import { Brain, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface EmptyStateProps {
  projectId: string
}

export default function EmptyState({ projectId }: EmptyStateProps) {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)

  const handleRunAnalysis = async () => {
    setIsRunning(true)
    // Navigate back to project page where analysis can be triggered
    router.push(`/project/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full mb-6"
          >
            <Brain className="w-12 h-12 text-blue-600" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-bold text-gray-900 mb-4"
          >
            No Analysis Yet
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 text-lg mb-8 leading-relaxed"
          >
            Transform your user feedback into actionable insights with AI-powered analysis.
            Discover problems, generate features, and create comprehensive PRDs automatically.
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 mb-1">🎯</div>
              <div className="text-sm font-medium text-gray-700">Problems</div>
              <div className="text-xs text-gray-500">Identified</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="text-2xl font-bold text-purple-600 mb-1">🚀</div>
              <div className="text-sm font-medium text-gray-700">Features</div>
              <div className="text-xs text-gray-500">Generated</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="text-2xl font-bold text-green-600 mb-1">📋</div>
              <div className="text-sm font-medium text-gray-700">Tasks</div>
              <div className="text-xs text-gray-500">Created</div>
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={handleRunAnalysis}
            disabled={isRunning}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Run AI Analysis
              </>
            )}
          </motion.button>

          {/* Helper Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm text-gray-500 mt-6"
          >
            Powered by advanced AI models for comprehensive product insights
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}
