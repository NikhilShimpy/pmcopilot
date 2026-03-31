'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Share2,
  AlertCircle,
  BarChart3,
  Search,
  Zap,
  Brain,
  AlertTriangle,
} from 'lucide-react'
import { ComprehensiveAnalysisResult } from '@/types/analysis'
import { EnhancedAnalysisResult } from '@/types/enhanced-analysis'

// Components
import LoadingState from '@/components/analysis/LoadingState'
import EmptyState from '@/components/analysis/EmptyState'
import InsightHeader from '@/components/analysis/InsightHeader'
import ProblemClusters from '@/components/analysis/ProblemClusters'
import FeatureSuggestions from '@/components/analysis/FeatureSuggestions'
import ImpactCard from '@/components/analysis/ImpactCard'
import PRDView from '@/components/analysis/PRDView'
import TaskBoard from '@/components/analysis/TaskBoard'
import { EnhancedAnalysisView } from '@/components/analysis/EnhancedAnalysisView'

// Helper to detect enhanced analysis
function isEnhancedAnalysis(data: any): data is EnhancedAnalysisResult {
  return !!(
    data &&
    (data.manpower || data.resources || data.cost_breakdown || data.timeline || data.gap_analysis || data.system_design)
  )
}

interface AnalysisPageClientProps {
  projectId: string
  analysisId: string
}

export default function AnalysisPageClient({ projectId, analysisId }: AnalysisPageClientProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysisResult | EnhancedAnalysisResult | null>(null)
  const [isEnhanced, setIsEnhanced] = useState(false)

  useEffect(() => {
    fetchAnalysis()
  }, [analysisId])

  const fetchAnalysis = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/analyze/${analysisId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch analysis')
      }

      if (!result.data) {
        throw new Error('No analysis data found')
      }

      // Detect if this is an enhanced analysis
      const enhanced = isEnhancedAnalysis(result.data)
      setIsEnhanced(enhanced)
      setAnalysis(result.data)
    } catch (err) {
      console.error('Error fetching analysis:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push(`/project/${projectId}`)
  }

  const handleRefresh = () => {
    fetchAnalysis()
  }

  // Loading State
  if (isLoading) {
    return <LoadingState />
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-2xl p-8 shadow-sm text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={handleBack}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={handleRefresh}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // Empty State
  if (!analysis) {
    return <EmptyState projectId={projectId} />
  }

  // Enhanced Analysis View
  if (isEnhanced) {
    return (
      <EnhancedAnalysisView
        analysis={analysis as EnhancedAnalysisResult}
        projectId={projectId}
        analysisId={analysisId}
      />
    )
  }

  // Standard Analysis View (cast to ComprehensiveAnalysisResult)
  const standardAnalysis = analysis as ComprehensiveAnalysisResult

  // Main Analysis View
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to Project</span>
            </button>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">Refresh</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Export</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Share2 className="w-4 h-4" />
                <span className="text-sm font-medium">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Insight Header */}
        <InsightHeader
          problemsCount={standardAnalysis.problems.length}
          featuresCount={standardAnalysis.features.length}
          confidenceScore={standardAnalysis.impact.confidence_score}
          createdAt={standardAnalysis.created_at}
        />

        {/* Executive Summary */}
        {standardAnalysis.executive_summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6"
          >
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Executive Summary
            </h3>
            <p className="text-gray-700 leading-relaxed">{standardAnalysis.executive_summary}</p>
          </motion.div>
        )}

        {/* Key Findings */}
        {standardAnalysis.key_findings && standardAnalysis.key_findings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Key Findings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {standardAnalysis.key_findings.map((finding, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  className="flex items-start gap-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200"
                >
                  <span className="text-blue-600 font-bold text-lg mt-0.5">-</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{finding}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <ProblemClusters problems={standardAnalysis.problems} />
            <FeatureSuggestions features={standardAnalysis.features} />
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            <ImpactCard impact={standardAnalysis.impact} />
            <PRDView prd={standardAnalysis.prd} />
          </div>
        </div>

        {/* Task Board - Full Width */}
        <TaskBoard tasks={standardAnalysis.tasks} />

        {/* Immediate Actions */}
        {standardAnalysis.immediate_actions && standardAnalysis.immediate_actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6"
          >
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Immediate Actions
            </h3>
            <div className="space-y-2">
              {standardAnalysis.immediate_actions.map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="flex items-start gap-3 p-4 bg-white rounded-xl"
                >
                  <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-md flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <p className="text-gray-700 leading-relaxed">{action}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Explainability Section */}
        {standardAnalysis.explainability && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
          >
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              AI Methodology & Confidence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Methodology */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Methodology</h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {standardAnalysis.explainability.methodology}
                </p>
                <div className="mt-3">
                  <div className="text-sm font-semibold text-gray-700 mb-1">
                    Data Quality Score
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                        style={{
                          width: `${standardAnalysis.explainability.data_quality_score * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {Math.round(standardAnalysis.explainability.data_quality_score * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Limitations */}
              {standardAnalysis.explainability.limitations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Limitations</h4>
                  <ul className="space-y-1">
                    {standardAnalysis.explainability.limitations.map((limit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Footer Metadata */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center py-6 text-sm text-gray-500"
        >
          <p>
            Analysis ID: {standardAnalysis.analysis_id} - Model: {standardAnalysis.model_used} - Processing Time:{' '}
            {(standardAnalysis.processing_time_ms / 1000).toFixed(2)}s
          </p>
          <p className="mt-1">
            Powered by PMCopilot AI - {standardAnalysis.total_feedback_items} feedback items analyzed
          </p>
        </motion.div>
      </div>
    </div>
  )
}

