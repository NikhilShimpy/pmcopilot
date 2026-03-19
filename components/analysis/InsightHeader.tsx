'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { CheckCircle2, TrendingUp, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

interface InsightHeaderProps {
  problemsCount: number
  featuresCount: number
  confidenceScore: number
  createdAt: string
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) => Math.round(latest))
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.5,
      ease: 'easeOut',
    })

    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayValue(latest)
    })

    return () => {
      controls.stop()
      unsubscribe()
    }
  }, [value, count, rounded])

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  )
}

export default function InsightHeader({
  problemsCount,
  featuresCount,
  confidenceScore,
  createdAt,
}: InsightHeaderProps) {
  const displayDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const confidencePercentage = Math.round(confidenceScore * 100)
  const confidenceColor =
    confidenceScore >= 0.8
      ? 'text-green-600 bg-green-50 border-green-200'
      : confidenceScore >= 0.6
      ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
      : 'text-orange-600 bg-orange-50 border-orange-200'

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left Section */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AI Analysis Complete</h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-gray-600 text-sm"
          >
            Generated on {displayDate}
          </motion.p>
        </div>

        {/* Metrics Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-wrap gap-4"
        >
          {/* Problems Count */}
          <div className="group relative">
            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg shadow-sm">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={problemsCount} />
                </div>
                <div className="text-xs font-medium text-gray-600">Problems Found</div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap pointer-events-none">
              Based on user feedback
            </div>
          </div>

          {/* Features Count */}
          <div className="group relative">
            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-sm">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  <AnimatedCounter value={featuresCount} />
                </div>
                <div className="text-xs font-medium text-gray-600">Features Generated</div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap pointer-events-none">
              AI-powered suggestions
            </div>
          </div>

          {/* Confidence Score */}
          <div className="group relative">
            <div
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border hover:shadow-md transition-all duration-200 ${confidenceColor}`}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-white/50 rounded-lg backdrop-blur-sm">
                <div className="text-2xl font-bold">
                  <AnimatedCounter value={confidencePercentage} suffix="%" />
                </div>
              </div>
              <div>
                <div className="text-xs font-medium">Confidence</div>
              </div>
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap pointer-events-none">
              AI confidence level
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
