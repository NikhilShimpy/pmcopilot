'use client'

import { motion } from 'framer-motion'
import { Target, TrendingUp, Users, DollarSign, Clock } from 'lucide-react'
import { ImpactEstimation } from '@/types/analysis'

interface ImpactCardProps {
  impact: ImpactEstimation
}

function CircularProgress({ value, label, icon: Icon }: { value: number; label: string; icon: any }) {
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (value / 10) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28 mb-3">
        <svg className="w-28 h-28 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="56"
            cy="56"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <motion.circle
            cx="56"
            cy="56"
            r="45"
            stroke="url(#gradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600 mb-1" />
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500">/ 10</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-700 text-center">{label}</span>
    </div>
  )
}

function ImpactBadge({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex items-center gap-3 p-4 rounded-xl border ${color} hover:shadow-md transition-all duration-200`}
    >
      <div className="flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-600 mb-0.5">{label}</div>
        <div className="text-sm font-semibold text-gray-900 truncate">{value}</div>
      </div>
    </motion.div>
  )
}

export default function ImpactCard({ impact }: ImpactCardProps) {
  const confidencePercentage = Math.round(impact.confidence_score * 100)

  const getRevenueColor = (impact?: string) => {
    switch (impact) {
      case 'Increase':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'Decrease':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'Neutral':
        return 'bg-gray-50 border-gray-200 text-gray-700'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700'
    }
  }

  const getRetentionColor = (impact?: string) => {
    switch (impact) {
      case 'Positive':
        return 'bg-green-50 border-green-200 text-green-700'
      case 'Negative':
        return 'bg-red-50 border-red-200 text-red-700'
      case 'Neutral':
        return 'bg-gray-50 border-gray-200 text-gray-700'
      default:
        return 'bg-blue-50 border-blue-200 text-blue-700'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 rounded-2xl p-6 shadow-sm border border-gray-100"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-sm">
          <Target className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Impact Analysis</h2>
      </div>

      {/* Circular Progress Indicators */}
      <div className="flex justify-around mb-8 pb-6 border-b border-gray-200">
        <CircularProgress
          value={impact.user_impact_score}
          label="User Impact"
          icon={Users}
        />
        <CircularProgress
          value={impact.business_impact_score}
          label="Business Impact"
          icon={TrendingUp}
        />
      </div>

      {/* Description Cards */}
      <div className="space-y-4 mb-6">
        {/* User Impact */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">User Impact</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{impact.user_impact}</p>
            </div>
          </div>
        </div>

        {/* Business Impact */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-900 mb-1">Business Impact</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{impact.business_impact}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="space-y-3">
        {impact.time_to_value && (
          <ImpactBadge
            icon={Clock}
            label="Time to Value"
            value={impact.time_to_value}
            color="bg-blue-50 border-blue-200 text-blue-700"
          />
        )}

        {impact.affected_user_percentage !== undefined && (
          <ImpactBadge
            icon={Users}
            label="Users Affected"
            value={`${impact.affected_user_percentage}% of user base`}
            color="bg-purple-50 border-purple-200 text-purple-700"
          />
        )}

        {impact.revenue_impact && (
          <ImpactBadge
            icon={DollarSign}
            label="Revenue Impact"
            value={impact.revenue_impact}
            color={getRevenueColor(impact.revenue_impact)}
          />
        )}

        {impact.retention_impact && (
          <ImpactBadge
            icon={TrendingUp}
            label="Retention Impact"
            value={impact.retention_impact}
            color={getRetentionColor(impact.retention_impact)}
          />
        )}
      </div>

      {/* Confidence Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 pt-6 border-t border-gray-200"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">AI Confidence</span>
          <span className="text-sm font-bold text-gray-900">{confidencePercentage}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidencePercentage}%` }}
            transition={{ delay: 0.7, duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Based on data quality and pattern confidence
        </p>
      </motion.div>
    </motion.div>
  )
}
