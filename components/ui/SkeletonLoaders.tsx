'use client'

import { motion } from 'framer-motion'
import ProjectCardSkeleton from '@/components/dashboard/ProjectCardSkeleton'

interface DashboardSkeletonGridProps {
  count?: number
  className?: string
}

interface ContentSkeletonGridProps {
  count?: number
  className?: string
}

function PulseBlock({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 0.95, 0.5] }}
      transition={{ duration: 1.4, repeat: Infinity, delay }}
      className={className}
    />
  )
}

export function DashboardSkeletonGrid({ count = 6, className = '' }: DashboardSkeletonGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <ProjectCardSkeleton key={index} />
      ))}
    </div>
  )
}

export function ContentSkeletonGrid({ count = 6, className = '' }: ContentSkeletonGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-gray-800 bg-gray-900/80 overflow-hidden"
        >
          <div className="p-5 space-y-3">
            <PulseBlock className="w-10 h-10 rounded-xl bg-gray-700/80" delay={index * 0.05} />
            <PulseBlock className="h-5 rounded bg-gray-700/70 w-3/4" delay={index * 0.05 + 0.08} />
            <PulseBlock className="h-4 rounded bg-gray-800 w-full" delay={index * 0.05 + 0.16} />
            <PulseBlock className="h-4 rounded bg-gray-800 w-2/3" delay={index * 0.05 + 0.24} />
            <PulseBlock className="h-3 rounded bg-gray-800 w-1/2" delay={index * 0.05 + 0.32} />
          </div>
          <div className="px-5 py-4 border-t border-gray-800 bg-gray-900">
            <PulseBlock className="h-9 rounded-lg bg-gray-700/70 w-full" delay={index * 0.05 + 0.4} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5">
      <div className="space-y-3">
        <PulseBlock className="h-5 rounded bg-gray-700/70 w-48" />
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="grid grid-cols-12 gap-3">
            <PulseBlock className="h-4 rounded bg-gray-800 col-span-4" delay={index * 0.06 + 0.05} />
            <PulseBlock className="h-4 rounded bg-gray-800 col-span-2" delay={index * 0.06 + 0.12} />
            <PulseBlock className="h-4 rounded bg-gray-800 col-span-2" delay={index * 0.06 + 0.19} />
            <PulseBlock className="h-4 rounded bg-gray-800 col-span-2" delay={index * 0.06 + 0.26} />
            <PulseBlock className="h-4 rounded bg-gray-800 col-span-2" delay={index * 0.06 + 0.33} />
          </div>
        ))}
      </div>
    </div>
  )
}
