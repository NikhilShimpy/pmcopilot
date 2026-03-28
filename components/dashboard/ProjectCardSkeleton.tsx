'use client'

import { motion } from 'framer-motion'

export default function ProjectCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg"
          />
        </div>
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"
        />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full mb-1"
        />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-4"
        />
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3"
        />
      </div>
      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
          className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg"
        />
      </div>
    </div>
  )
}
