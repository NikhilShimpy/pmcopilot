'use client'

/**
 * PMCopilot - Auto Analysis Notification Component
 *
 * Shows notification when auto-analysis is triggered
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface AutoAnalysisNotificationProps {
  projectId: string
  analysisId: string | null
  isAnalyzing: boolean
  onDismiss: () => void
}

export default function AutoAnalysisNotification({
  projectId,
  analysisId,
  isAnalyzing,
  onDismiss,
}: AutoAnalysisNotificationProps) {
  const [progress, setProgress] = useState(0)

  // Simulate progress while analyzing
  useEffect(() => {
    if (!isAnalyzing) {
      setProgress(0)
      return
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isAnalyzing])

  // Auto-dismiss after showing completed
  useEffect(() => {
    if (analysisId && !isAnalyzing) {
      const timer = setTimeout(onDismiss, 10000)
      return () => clearTimeout(timer)
    }
  }, [analysisId, isAnalyzing, onDismiss])

  if (!isAnalyzing && !analysisId) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
      >
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          {/* Progress bar */}
          {isAnalyzing && (
            <div className="h-1 bg-gray-100">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl ${
                  isAnalyzing
                    ? 'bg-indigo-100'
                    : 'bg-green-100'
                }`}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-green-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {isAnalyzing ? 'Analyzing Feedback...' : 'Analysis Complete!'}
                  </h4>
                  <button
                    onClick={onDismiss}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-1">
                  {isAnalyzing
                    ? 'AI is processing your feedback and generating insights...'
                    : 'Your feedback has been analyzed. View the results to see actionable insights.'}
                </p>

                {/* View Analysis Link */}
                {analysisId && !isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3"
                  >
                    <Link
                      href={`/project/${projectId}/analysis/${analysisId}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
                    >
                      <Sparkles className="w-3 h-3" />
                      View Analysis
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </motion.div>
                )}

                {/* Progress indicator */}
                {isAnalyzing && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                          animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {Math.round(progress)}% complete
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
