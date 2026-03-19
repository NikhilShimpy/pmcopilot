'use client'

/**
 * Advanced Analysis View - Enhanced visualization with charts and interactivity
 * Transforms basic analysis output into production-ready insights display
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line
} from 'recharts'
import {
  Filter, Download, Share2, MessageSquare, TrendingUp,
  AlertCircle, CheckCircle, Clock, Target, Users, Zap
} from 'lucide-react'
import { ComprehensiveAnalysisResult } from '@/types/analysis'

interface AdvancedAnalysisViewProps {
  analysis: ComprehensiveAnalysisResult
  projectId: string
  onToggleChat?: () => void
}

export function AdvancedAnalysisView({
  analysis,
  projectId,
  onToggleChat
}: AdvancedAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'features' | 'prd' | 'tasks' | 'impact'>('overview')
  const [filterSeverity, setFilterSeverity] = useState<number | null>(null)
  const [filterPriority, setFilterPriority] = useState<string | null>(null)

  // Filter problems and features based on user selection
  const filteredProblems = filterSeverity
    ? analysis.problems.filter(p => p.severity_score >= filterSeverity)
    : analysis.problems

  const filteredFeatures = filterPriority
    ? analysis.features.filter(f => f.priority === filterPriority)
    : analysis.features

  // Prepare data for charts
  const severityData = analysis.problems.map((p) => ({
    name: p.title.substring(0, 20) + '...',
    fullName: p.title,
    severity: p.severity_score,
    frequency: p.frequency_score,
    combined: p.severity_score + p.frequency_score
  }))

  const priorityDistribution = [
    {
      name: 'High',
      value: analysis.features.filter(f => f.priority === 'High').length,
      color: '#EF4444'
    },
    {
      name: 'Medium',
      value: analysis.features.filter(f => f.priority === 'Medium').length,
      color: '#F59E0B'
    },
    {
      name: 'Low',
      value: analysis.features.filter(f => f.priority === 'Low').length,
      color: '#10B981'
    }
  ]

  const impactData = [
    {
      subject: 'User Impact',
      value: analysis.impact.user_impact_score,
      fullMark: 10
    },
    {
      subject: 'Business Impact',
      value: analysis.impact.business_impact_score,
      fullMark: 10
    },
    {
      subject: 'Confidence',
      value: analysis.impact.confidence_score * 10, // Scale to 10
      fullMark: 10
    },
    {
      subject: 'Urgency',
      value: analysis.problems.length > 0
        ? analysis.problems.reduce((sum, p) => sum + p.severity_score, 0) / analysis.problems.length
        : 0,
      fullMark: 10
    }
  ]

  const taskDistribution = analysis.tasks.reduce((acc, task) => {
    const type = task.type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const taskChartData = Object.entries(taskDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Analysis Results</h1>
              <p className="text-sm text-slate-600 mt-1">
                Generated {new Date(analysis.created_at).toLocaleString()} • {analysis.processing_time_ms}ms
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onToggleChat}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Ask AI
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
            {(['overview', 'problems', 'features', 'prd', 'tasks', 'impact'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 px-4 py-2 rounded-md font-medium text-sm transition-all
                  ${activeTab === tab
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                  }
                `}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Executive Summary */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <h2 className="text-xl font-bold mb-3">Executive Summary</h2>
                <p className="text-blue-50 leading-relaxed">{analysis.executive_summary}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<AlertCircle className="w-6 h-6" />}
                  label="Problems Found"
                  value={analysis.problems.length}
                  color="red"
                  subtext={`Avg severity: ${(analysis.problems.reduce((sum, p) => sum + p.severity_score, 0) / analysis.problems.length).toFixed(1)}/10`}
                />
                <StatCard
                  icon={<Zap className="w-6 h-6" />}
                  label="Features Suggested"
                  value={analysis.features.length}
                  color="purple"
                  subtext={`${analysis.features.filter(f => f.priority === 'High').length} high priority`}
                />
                <StatCard
                  icon={<CheckCircle className="w-6 h-6" />}
                  label="Tasks Created"
                  value={analysis.tasks.length}
                  color="green"
                  subtext={`${analysis.tasks.reduce((sum, t) => sum + (t.story_points || 0), 0)} story points`}
                />
                <StatCard
                  icon={<Target className="w-6 h-6" />}
                  label="User Impact"
                  value={`${analysis.impact.user_impact_score}/10`}
                  color="blue"
                  subtext={`${Math.round(analysis.impact.confidence_score * 100)}% confidence`}
                />
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Problem Severity vs Frequency */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold mb-4 text-slate-900">Problem Severity vs Frequency</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="frequency" name="Frequency" unit="/10" />
                      <YAxis dataKey="severity" name="Severity" unit="/10" />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            return (
                              <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                                <p className="font-semibold text-sm">{data.fullName}</p>
                                <p className="text-xs text-slate-600 mt-1">Severity: {data.severity}/10</p>
                                <p className="text-xs text-slate-600">Frequency: {data.frequency}/10</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Scatter
                        data={severityData}
                        fill="#3B82F6"
                        fillOpacity={0.6}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Feature Priority Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold mb-4 text-slate-900">Feature Priority Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={priorityDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {priorityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Impact Radar Chart */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold mb-4 text-slate-900">Impact Assessment</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={impactData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis domain={[0, 10]} />
                      <Radar
                        name="Impact"
                        dataKey="value"
                        stroke="#8B5CF6"
                        fill="#8B5CF6"
                        fillOpacity={0.6}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Task Type Distribution */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold mb-4 text-slate-900">Task Breakdown by Type</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={taskChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Key Findings */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold mb-4 text-slate-900">Key Findings</h3>
                <ul className="space-y-3">
                  {analysis.key_findings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="text-slate-700 leading-relaxed">{finding}</p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Immediate Actions */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-amber-900 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Immediate Actions
                </h3>
                <ul className="space-y-2">
                  {analysis.immediate_actions.map((action, index) => (
                    <li key={index} className="flex items-center gap-3 text-amber-800">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === 'problems' && (
            <motion.div
              key="problems"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Filter Bar */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex items-center gap-4">
                <Filter className="w-5 h-5 text-slate-400" />
                <select
                  value={filterSeverity || ''}
                  onChange={(e) => setFilterSeverity(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Severities</option>
                  <option value="8">Critical (8-10)</option>
                  <option value="5">Medium (5-7)</option>
                  <option value="1">Low (1-4)</option>
                </select>
                <span className="text-sm text-slate-600">
                  Showing {filteredProblems.length} of {analysis.problems.length} problems
                </span>
              </div>

              {/* Problems List */}
              <div className="space-y-4">
                {filteredProblems.map((problem) => (
                  <ProblemCard key={problem.id} problem={problem} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'features' && (
            <motion.div
              key="features"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Filter Bar */}
              <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex items-center gap-4">
                <Filter className="w-5 h-5 text-slate-400" />
                <select
                  value={filterPriority || ''}
                  onChange={(e) => setFilterPriority(e.target.value || null)}
                  className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Priorities</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
                <span className="text-sm text-slate-600">
                  Showing {filteredFeatures.length} of {analysis.features.length} features
                </span>
              </div>

              {/* Features List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeatures.map((feature) => (
                  <FeatureCard key={feature.id} feature={feature} />
                ))}
              </div>
            </motion.div>
          )}

          {/* Add other tabs similarly... */}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Utility Components

function StatCard({
  icon,
  label,
  value,
  color,
  subtext
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  color: 'red' | 'purple' | 'green' | 'blue'
  subtext?: string
}) {
  const colors = {
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600'
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  )
}

function ProblemCard({ problem }: { problem: any }) {
  const getSeverityColor = (score: number) => {
    if (score >= 8) return 'bg-red-100 text-red-700 border-red-300'
    if (score >= 5) return 'bg-amber-100 text-amber-700 border-amber-300'
    return 'bg-green-100 text-green-700 border-green-300'
  }

  return (
    <div
      className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group"
      draggable
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
          {problem.title}
        </h3>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(problem.severity_score)}`}>
            Severity: {problem.severity_score}/10
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300">
            Frequency: {problem.frequency_score}/10
          </span>
        </div>
      </div>
      <p className="text-slate-600 mb-4">{problem.description}</p>
      {problem.evidence && problem.evidence.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Evidence:</p>
          <div className="space-y-2">
            {problem.evidence.slice(0, 2).map((evidence: string, index: number) => (
              <p key={index} className="text-sm text-slate-600 italic pl-4 border-l-2 border-blue-300">
                &ldquo;{evidence}&rdquo;
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function FeatureCard({ feature }: { feature: any }) {
  const getPriorityColor = (priority: string) => {
    if (priority === 'High') return 'bg-red-100 text-red-700 border-red-300'
    if (priority === 'Medium') return 'bg-amber-100 text-amber-700 border-amber-300'
    return 'bg-green-100 text-green-700 border-green-300'
  }

  const getComplexityColor = (complexity: string) => {
    if (complexity === 'Complex') return 'text-red-600'
    if (complexity === 'Medium') return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900">{feature.name}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(feature.priority)}`}>
          {feature.priority}
        </span>
      </div>
      <p className="text-slate-600 mb-3">{feature.reason}</p>
      <div className="flex items-center gap-4 text-sm">
        {feature.complexity && (
          <span className={`font-medium ${getComplexityColor(feature.complexity)}`}>
            {feature.complexity} complexity
          </span>
        )}
        {feature.estimated_impact && (
          <span className="text-slate-600">{feature.estimated_impact}</span>
        )}
      </div>
    </div>
  )
}
