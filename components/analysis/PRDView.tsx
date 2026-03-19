'use client'

import { motion } from 'framer-motion'
import { FileText, Target, CheckCircle2, TrendingUp, AlertTriangle, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { PRD } from '@/types/analysis'
import { useState } from 'react'

interface PRDViewProps {
  prd: PRD
}

export default function PRDView({ prd }: PRDViewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    userStories: true,
    acceptance: true,
    metrics: false,
    risks: false,
    dependencies: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const SectionHeader = ({
    title,
    icon: Icon,
    sectionKey
  }: {
    title: string
    icon: any
    sectionKey: string
  }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className="flex items-center justify-between w-full text-left group hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-600" />
        <h3 className="font-bold text-sm text-gray-900">{title}</h3>
      </div>
      {expandedSections[sectionKey] ? (
        <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
      )}
    </button>
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-medium opacity-90">Product Requirements Document</h2>
            <div className="text-xs opacity-75">AI-Generated PRD</div>
          </div>
        </div>
        <h1 className="text-2xl font-bold">{prd.title}</h1>
      </div>

      {/* Document Body */}
      <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
        {/* Problem Statement */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-red-600" />
            <h3 className="font-bold text-sm text-gray-900">Problem Statement</h3>
          </div>
          <div className="pl-6 border-l-4 border-red-200 bg-red-50 p-4 rounded-r-lg">
            <p className="text-gray-700 leading-relaxed">{prd.problem_statement}</p>
          </div>
        </div>

        {/* Solution Overview */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h3 className="font-bold text-sm text-gray-900">Solution Overview</h3>
          </div>
          <div className="pl-6 border-l-4 border-green-200 bg-green-50 p-4 rounded-r-lg">
            <p className="text-gray-700 leading-relaxed">{prd.solution_overview}</p>
          </div>
        </div>

        {/* Goals & Non-Goals */}
        <div className="grid grid-cols-2 gap-4">
          {/* Goals */}
          <div>
            <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-green-600">✓</span> Goals
            </h3>
            <ul className="space-y-2">
              {prd.goals.map((goal, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="text-green-600 mt-0.5">•</span>
                  <span>{goal}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Non-Goals */}
          <div>
            <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-red-600">✗</span> Non-Goals
            </h3>
            <ul className="space-y-2">
              {prd.non_goals.map((nonGoal, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-2 text-sm text-gray-700"
                >
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>{nonGoal}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        {/* User Stories */}
        <div>
          <SectionHeader title="User Stories" icon={Target} sectionKey="userStories" />
          {expandedSections.userStories && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-3"
            >
              {prd.user_stories.map((story, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-md flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 leading-relaxed italic">
                        {story.full_statement}
                      </p>
                      {story.persona && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-semibold">Persona:</span> {story.persona}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Acceptance Criteria */}
        <div>
          <SectionHeader title="Acceptance Criteria" icon={CheckCircle2} sectionKey="acceptance" />
          {expandedSections.acceptance && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-2"
            >
              {prd.acceptance_criteria.map((criteria, i) => (
                <motion.div
                  key={criteria.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {criteria.testable ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{criteria.description}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          criteria.priority === 'Must'
                            ? 'bg-red-100 text-red-700'
                            : criteria.priority === 'Should'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {criteria.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {criteria.testable ? 'Testable' : 'Non-testable'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Success Metrics */}
        {prd.success_metrics.length > 0 && (
          <div>
            <SectionHeader title="Success Metrics" icon={TrendingUp} sectionKey="metrics" />
            {expandedSections.metrics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <ul className="space-y-2">
                  {prd.success_metrics.map((metric, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 text-sm text-gray-700 p-2 hover:bg-gray-50 rounded"
                    >
                      <TrendingUp className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{metric}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        )}

        {/* Risks */}
        {prd.risks.length > 0 && (
          <div>
            <SectionHeader title="Risks & Challenges" icon={AlertTriangle} sectionKey="risks" />
            {expandedSections.risks && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <ul className="space-y-2">
                  {prd.risks.map((risk, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 text-sm text-gray-700 p-2 hover:bg-red-50 rounded"
                    >
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <span>{risk}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        )}

        {/* Dependencies */}
        {prd.dependencies.length > 0 && (
          <div>
            <SectionHeader title="Dependencies" icon={LinkIcon} sectionKey="dependencies" />
            {expandedSections.dependencies && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <ul className="space-y-2">
                  {prd.dependencies.map((dep, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 text-sm text-gray-700 p-2 hover:bg-blue-50 rounded"
                    >
                      <LinkIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{dep}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 text-center">
        <p className="text-xs text-gray-500">
          AI-Generated PRD • Review and refine as needed
        </p>
      </div>
    </motion.div>
  )
}
