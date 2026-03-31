'use client'

import { motion } from 'framer-motion'
import { ContentSkeletonGrid } from '@/components/ui/SkeletonLoaders'

export default function LoadingState() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6"
        >
          <div className="h-7 w-64 rounded bg-gray-800 animate-pulse" />
          <div className="h-4 w-96 rounded bg-gray-800/80 animate-pulse mt-3" />
        </motion.div>

        <ContentSkeletonGrid count={6} />
      </div>
    </div>
  )
}
