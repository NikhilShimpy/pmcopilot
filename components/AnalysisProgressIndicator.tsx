/**
 * Analysis Progress Indicator Component
 * Shows real-time progress during analysis like Claude, ChatGPT, Perplexity
 */

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, CheckCircle2, Loader2 } from 'lucide-react'

interface AnalysisProgress {
  stage: 'starting' | 'problems' | 'features' | 'prd' | 'tasks' | 'impact' | 'completing' | 'done'
  message: string
  progress: number
}

const STAGES: Record<AnalysisProgress['stage'], { message: string; progress: number; duration: number }> = {
  starting: { message: 'Initializing AI analysis engine...', progress: 5, duration: 2000 },
  problems: { message: 'Identifying problems and pain points...', progress: 20, duration: 25000 },
  features: { message: 'Generating feature recommendations (10-15 features)...', progress: 40, duration: 30000 },
  prd: { message: 'Creating Product Requirements Document...', progress: 60, duration: 25000 },
  tasks: { message: 'Breaking down into development tasks (20-40 tasks)...', progress: 75, duration: 30000 },
  impact: { message: 'Estimating business impact and ROI...', progress: 90, duration: 20000 },
  completing: { message: 'Finalizing analysis results...', progress: 95, duration: 5000 },
  done: { message: 'Analysis complete!', progress: 100, duration: 0 },
}

interface AnalysisProgressIndicatorProps {
  isAnalyzing: boolean
  onComplete?: () => void
}

export function AnalysisProgressIndicator({ isAnalyzing, onComplete }: AnalysisProgressIndicatorProps) {
  const [currentStage, setCurrentStage] = useState<AnalysisProgress['stage']>('starting')
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (!isAnalyzing) {
      setCurrentStage('starting')
      setElapsedTime(0)
      return
    }

    // Progress through stages
    const stageOrder: AnalysisProgress['stage'][] = [
      'starting',
      'problems',
      'features',
      'prd',
      'tasks',
      'impact',
      'completing',
    ]

    let currentIndex = 0
    let intervalId: ReturnType<typeof setInterval>

    const advanceStage = () => {
      if (currentIndex < stageOrder.length) {
        const stage = stageOrder[currentIndex]
        setCurrentStage(stage)

        const timeout = setTimeout(() => {
          currentIndex++
          advanceStage()
        }, STAGES[stage].duration)

        return () => clearTimeout(timeout)
      }
    }

    advanceStage()

    // Track elapsed time
    intervalId = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [isAnalyzing])

  useEffect(() => {
    if (currentStage === 'completing' && onComplete) {
      const timeout = setTimeout(() => {
        setCurrentStage('done')
        onComplete()
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [currentStage, onComplete])

  if (!isAnalyzing) return null

  const stageInfo = STAGES[currentStage]
  const isDone = currentStage === 'done'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 max-w-md"
      >
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            {isDone ? (
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white animate-pulse" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900">
                  {isDone ? 'Complete!' : 'Analyzing...'}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <p className="text-sm text-slate-600 truncate">
                {stageInfo.message}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stageInfo.progress}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className={`absolute inset-y-0 left-0 rounded-full ${
                isDone
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500'
              }`}
            />
          </div>

          {/* Progress Percentage */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{stageInfo.progress}% complete</span>
            {!isDone && <Loader2 className="w-3 h-3 animate-spin" />}
          </div>

          {/* Estimated time remaining */}
          {!isDone && (
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <span>⏱️</span>
              <span>Est. 2-3 min remaining...</span>
            </div>
          )}

          {/* Success message */}
          {isDone && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-green-600 font-medium"
            >
              ✨ Generated comprehensive analysis with 10+ features and 20+ tasks!
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
