import { createServerSupabaseClient, requireServerAuth } from '@/lib/supabase/server'
import { handleError, successResponse, throwValidationError } from '@/lib/errorHandler'
import { isValidUUID } from '@/utils/helpers'
import {
  REQUIRED_ANALYSIS_SECTIONS,
  deriveGeneratedSectionsFromResult,
} from '@/lib/analysisSessionStore'

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const user = await requireServerAuth()

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (projectId && !isValidUUID(projectId)) {
      throwValidationError('Invalid project_id format')
    }

    let projectQuery = supabase
      .from('projects')
      .select('id, name, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (projectId) {
      projectQuery = projectQuery.eq('id', projectId)
    }

    const { data: projects, error: projectsError } = await projectQuery
    if (projectsError) {
      throw projectsError
    }

    const projectIds = (projects || []).map((project) => project.id)
    if (projectIds.length === 0) {
      return successResponse({
        totals: {
          projects: 0,
          feedback: 0,
          analyses: 0,
          analyzed_projects: 0,
        },
        status_distribution: {},
        priority_distribution: {},
        source_distribution: {},
        monthly_activity: [],
        project_summaries: [],
      })
    }

    const [
      { data: feedbacks, error: feedbackError },
      { data: analyses, error: analysisError },
      { data: sessionRows, error: sessionsError },
    ] = await Promise.all([
      supabase
        .from('feedbacks')
        .select('id, project_id, status, priority, source, created_at')
        .in('project_id', projectIds),
      supabase
        .from('analyses')
        .select('id, project_id, created_at, result')
        .in('project_id', projectIds),
      supabase
        .from('analysis_sessions')
        .select(
          'id, project_id, legacy_analysis_id, created_at, completion_percentage, generated_sections, section_status'
        )
        .eq('user_id', user.id)
        .in('project_id', projectIds),
    ])

    if (feedbackError) {
      throw feedbackError
    }
    if (analysisError) {
      throw analysisError
    }

    const feedbackList = feedbacks || []
    const analysisList = analyses || []
    const sessionList = sessionsError ? [] : (sessionRows || [])

    const statusDistribution: Record<string, number> = {}
    const priorityDistribution: Record<string, number> = {}
    const sourceDistribution: Record<string, number> = {}

    for (const feedback of feedbackList) {
      const status = feedback.status || 'new'
      const priority = feedback.priority || 'medium'
      const source = feedback.source || 'manual'

      statusDistribution[status] = (statusDistribution[status] || 0) + 1
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1
      sourceDistribution[source] = (sourceDistribution[source] || 0) + 1
    }

    const monthKey = (date: string) => {
      const parsed = new Date(date)
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
    }

    const monthBuckets = new Map<string, { month: string; feedback: number; analyses: number }>()

    for (const feedback of feedbackList) {
      const month = monthKey(feedback.created_at)
      const existing = monthBuckets.get(month) || { month, feedback: 0, analyses: 0 }
      existing.feedback += 1
      monthBuckets.set(month, existing)
    }

    const activitySource =
      sessionList.length > 0
        ? sessionList.map((session: any) => ({
            created_at: session.created_at,
          }))
        : analysisList

    for (const analysis of activitySource) {
      const month = monthKey(analysis.created_at)
      const existing = monthBuckets.get(month) || { month, feedback: 0, analyses: 0 }
      existing.analyses += 1
      monthBuckets.set(month, existing)
    }

    const projectSummaries = (projects || []).map((project) => {
      const projectFeedback = feedbackList.filter((feedback) => feedback.project_id === project.id)
      const projectAnalyses = analysisList.filter((analysis) => analysis.project_id === project.id)
      const projectSessions = sessionList.filter((session: any) => session.project_id === project.id)

      const computeCoverageFromResult = (result: unknown) => {
        if (!result || typeof result !== 'object') return 0
        const generatedSections = deriveGeneratedSectionsFromResult(result as Record<string, any>)
        const covered = REQUIRED_ANALYSIS_SECTIONS.filter((section) =>
          generatedSections.includes(section)
        ).length
        return Math.round((covered / REQUIRED_ANALYSIS_SECTIONS.length) * 100)
      }

      let completionScore = 0
      if (projectSessions.length > 0) {
        const latestSession = projectSessions
          .slice()
          .sort((a: any, b: any) => Number(new Date(b.created_at)) - Number(new Date(a.created_at)))[0]

        if (
          typeof latestSession.completion_percentage === 'number' &&
          latestSession.completion_percentage > 0
        ) {
          completionScore = Math.max(0, Math.min(100, Math.round(latestSession.completion_percentage)))
        } else if (Array.isArray(latestSession.generated_sections)) {
          const covered = REQUIRED_ANALYSIS_SECTIONS.filter((section) =>
            latestSession.generated_sections.includes(section)
          ).length
          completionScore = Math.round((covered / REQUIRED_ANALYSIS_SECTIONS.length) * 100)
        }

        if (completionScore === 0) {
          const legacyAnalysis =
            latestSession.legacy_analysis_id
              ? projectAnalyses.find((analysis) => analysis.id === latestSession.legacy_analysis_id)
              : projectAnalyses
                  .slice()
                  .sort(
                    (a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at))
                  )[0]

          if (legacyAnalysis?.result) {
            completionScore = computeCoverageFromResult(legacyAnalysis.result)
          }
        }
      } else {
        const latestAnalysis = projectAnalyses
          .slice()
          .sort((a, b) => Number(new Date(b.created_at)) - Number(new Date(a.created_at)))[0]
        if (latestAnalysis?.result) {
          completionScore = computeCoverageFromResult(latestAnalysis.result)
        }
      }

      const lastActivityDate = [
        project.updated_at || project.created_at,
        ...projectFeedback.map((feedback) => feedback.created_at),
        ...projectSessions.map((session: any) => session.created_at),
        ...projectAnalyses.map((analysis) => analysis.created_at),
      ]
        .filter(Boolean)
        .sort((a, b) => Number(new Date(b)) - Number(new Date(a)))[0]

      return {
        project_id: project.id,
        project_name: project.name,
        feedback_count: projectFeedback.length,
        analysis_count: projectSessions.length > 0 ? projectSessions.length : projectAnalyses.length,
        completion_score: completionScore,
        last_activity_at: lastActivityDate,
      }
    })

    const analyzedProjectCount = new Set(
      (sessionList.length > 0 ? sessionList : analysisList).map((analysis: any) => analysis.project_id)
    ).size

    return successResponse({
      totals: {
        projects: projectIds.length,
        feedback: feedbackList.length,
        analyses: sessionList.length > 0 ? sessionList.length : analysisList.length,
        analyzed_projects: analyzedProjectCount,
      },
      status_distribution: statusDistribution,
      priority_distribution: priorityDistribution,
      source_distribution: sourceDistribution,
      monthly_activity: Array.from(monthBuckets.values()).sort((a, b) =>
        a.month.localeCompare(b.month)
      ),
      project_summaries: projectSummaries,
    })
  } catch (error) {
    return handleError(error)
  }
}
