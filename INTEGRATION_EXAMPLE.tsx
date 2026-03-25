/**
 * Quick Start: Enable New Workspace
 * Copy this file to app/project/[id]/WorkspaceClient.tsx
 * Then import it in page.tsx
 */

'use client'

import { useState, useEffect } from 'react'
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'
import type { Project } from '@/types'
import type { ComprehensiveStrategyResult } from '@/types/comprehensive-strategy'

interface WorkspaceClientProps {
  project: Project
  user: {
    id: string
    email?: string | null
  }
}

export default function WorkspaceClient({ project, user }: WorkspaceClientProps) {
  const [analysisResult, setAnalysisResult] = useState<ComprehensiveStrategyResult | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch latest analysis for this project
  useEffect(() => {
    async function fetchAnalysis() {
      try {
        const response = await fetch(`/api/analyze?project_id=${project.id}&limit=1`)
        const data = await response.json()

        if (data.success && data.data.length > 0) {
          const latestAnalysis = data.data[0]
          setAnalysisResult(latestAnalysis.result)
        }
      } catch (error) {
        console.error('Failed to fetch analysis:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [project.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600">Loading workspace...</p>
        </div>
      </div>
    )
  }

  return <WorkspaceLayout project={project} analysisResult={analysisResult} />
}
