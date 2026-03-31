import { SupabaseClient } from '@supabase/supabase-js'
import type { StrategySectionId } from '@/types/comprehensive-strategy'

export type AnalysisSessionRecord = {
  id: string
  project_id: string
  user_id: string
  legacy_analysis_id?: string | null
  title: string
  prompt: string
  prompt_hash?: string | null
  detail_level?: string | null
  provider?: string | null
  model?: string | null
  completion_percentage: number
  required_sections: string[]
  generated_sections: string[]
  section_status: Record<string, string>
  metadata: Record<string, unknown>
  created_at: string
  updated_at?: string
}

export type AnalysisSectionRecord = {
  id: string
  session_id: string
  project_id: string
  user_id: string
  section_id: string
  section_title?: string | null
  status?: string | null
  content: unknown
  provider?: string | null
  model?: string | null
  input_hash?: string | null
  generated_at: string
  updated_at?: string
}

const SECTION_LABELS: Record<StrategySectionId, string> = {
  overview: 'Overview',
  'executive-dashboard': 'Executive Dashboard',
  'problem-analysis': 'Problem Analysis',
  'feature-system': 'Feature System',
  'gaps-opportunities': 'Gaps & Opportunities',
  prd: 'PRD',
  'system-design': 'System Design',
  'development-tasks': 'Development Tasks',
  'execution-roadmap': 'Execution Roadmap',
  'manpower-planning': 'Manpower Planning',
  resources: 'Resources',
  'cost-estimation': 'Cost Estimation',
  timeline: 'Timeline',
  'impact-analysis': 'Impact Analysis',
}

export const REQUIRED_ANALYSIS_SECTIONS: StrategySectionId[] = [
  'executive-dashboard',
  'problem-analysis',
  'feature-system',
  'gaps-opportunities',
  'prd',
  'system-design',
  'development-tasks',
  'execution-roadmap',
  'manpower-planning',
  'resources',
  'cost-estimation',
  'timeline',
  'impact-analysis',
]

export const ALL_ANALYSIS_SECTIONS: StrategySectionId[] = [
  'overview',
  ...REQUIRED_ANALYSIS_SECTIONS,
]

const SECTION_TO_RESULT_KEY: Record<Exclude<StrategySectionId, 'overview'>, string> = {
  'executive-dashboard': 'executive_dashboard',
  'problem-analysis': 'problem_analysis',
  'feature-system': 'feature_system',
  'gaps-opportunities': 'gaps_opportunities',
  prd: 'prd',
  'system-design': 'system_design',
  'development-tasks': 'development_tasks',
  'execution-roadmap': 'execution_roadmap',
  'manpower-planning': 'manpower_planning',
  resources: 'resource_requirements',
  'cost-estimation': 'cost_estimation',
  timeline: 'time_estimation',
  'impact-analysis': 'impact_analysis',
}

export function getSectionLabel(sectionId: StrategySectionId): string {
  return SECTION_LABELS[sectionId] || sectionId
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasArrayItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

function hasObjectValues(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Object.values(value as Record<string, unknown>).some((entry) => {
    if (hasText(entry)) return true
    if (hasArrayItems(entry)) return true
    if (entry && typeof entry === 'object') return hasObjectValues(entry)
    return false
  })
}

export function isMeaningfulSectionContent(
  sectionId: StrategySectionId,
  content: unknown
): boolean {
  if (sectionId === 'overview') {
    if (!content || typeof content !== 'object' || Array.isArray(content)) return false
    const record = content as Record<string, unknown>
    return hasObjectValues(record.executive_dashboard) || hasObjectValues(record.overview_summary)
  }
  if (sectionId === 'problem-analysis' || sectionId === 'feature-system' || sectionId === 'development-tasks') {
    return hasArrayItems(content)
  }
  if (sectionId === 'prd') {
    return hasObjectValues(content)
  }
  if (sectionId === 'timeline') {
    return hasObjectValues(content) || hasArrayItems(content)
  }
  return hasObjectValues(content) || hasText(content) || hasArrayItems(content)
}

export function extractSectionContent(
  result: Record<string, any>,
  sectionId: StrategySectionId
): unknown {
  if (sectionId === 'overview') {
    return {
      executive_dashboard: result.executive_dashboard || null,
      overview_summary: result.overview_summary || null,
    }
  }

  const key = SECTION_TO_RESULT_KEY[sectionId]
  if (sectionId === 'timeline') {
    return result.time_estimation || result.time_planning || null
  }
  return key ? (result as any)[key] : null
}

export function injectSectionContent(
  target: Record<string, any>,
  sectionId: StrategySectionId,
  content: unknown
): void {
  if (sectionId === 'overview') {
    const data =
      content && typeof content === 'object' && !Array.isArray(content)
        ? (content as Record<string, unknown>)
        : {}
    if (data.executive_dashboard) {
      target.executive_dashboard = data.executive_dashboard
    }
    if (data.overview_summary) {
      target.overview_summary = data.overview_summary
    }
    return
  }

  if (sectionId === 'timeline') {
    target.time_estimation = content
    target.time_planning = content
    return
  }

  const key = SECTION_TO_RESULT_KEY[sectionId]
  if (key) {
    target[key] = content
  }
}

export function deriveGeneratedSectionsFromResult(result: Record<string, any>): StrategySectionId[] {
  const derived: StrategySectionId[] = []
  for (const sectionId of ALL_ANALYSIS_SECTIONS) {
    const content = extractSectionContent(result, sectionId)
    if (isMeaningfulSectionContent(sectionId, content)) {
      derived.push(sectionId)
    }
  }

  const metadataSections = Array.isArray(result?.metadata?.generated_sections)
    ? (result.metadata.generated_sections as string[])
    : []
  for (const section of metadataSections) {
    if (ALL_ANALYSIS_SECTIONS.includes(section as StrategySectionId)) {
      derived.push(section as StrategySectionId)
    }
  }

  return Array.from(new Set(derived))
}

export function calculateSectionCompletion(generatedSections: string[]): number {
  const generated = new Set(generatedSections)
  let completed = 0
  for (const section of REQUIRED_ANALYSIS_SECTIONS) {
    if (generated.has(section)) completed += 1
  }
  return Math.round((completed / REQUIRED_ANALYSIS_SECTIONS.length) * 100)
}

export function buildSectionStatus(generatedSections: string[]): Record<string, string> {
  const generated = new Set(generatedSections)
  const status: Record<string, string> = {}
  for (const section of REQUIRED_ANALYSIS_SECTIONS) {
    status[section] = generated.has(section) ? 'generated' : 'missing'
  }
  return status
}

export function deriveSessionTitle(
  result: Record<string, any>,
  prompt: string,
  projectName: string
): string {
  const explicitTitle = result?.metadata?.session_title
  if (hasText(explicitTitle) && !isGenericSessionTitle(String(explicitTitle))) {
    return normalizeSessionTitle(String(explicitTitle))
  }

  const productName = result?.overview_summary?.product_name
  if (hasText(productName) && !isGenericSessionTitle(String(productName))) {
    return normalizeSessionTitle(String(productName))
  }

  const promptTitle = derivePromptBasedTitle(prompt)
  if (promptTitle) {
    return promptTitle
  }

  return normalizeSessionTitle(`Analysis - ${projectName}`)
}

const GENERIC_TITLE_PATTERNS = [
  /^analysis session$/i,
  /^analysis$/i,
  /^untitled$/i,
  /^demo$/i,
  /^new analysis$/i,
  /^analysis - demo$/i,
  /^analysis - untitled/i,
]

const TITLE_STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'build',
  'by',
  'create',
  'for',
  'from',
  'i',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'our',
  'that',
  'the',
  'their',
  'to',
  'we',
  'with',
])

function isGenericSessionTitle(value: string): boolean {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return true
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(normalized))
}

function titleCaseToken(token: string): string {
  const upperToken = token.toUpperCase()
  if (upperToken === 'AI' || upperToken === 'API' || upperToken === 'B2B' || upperToken === 'B2C') {
    return upperToken
  }
  if (!token) return token
  return token[0].toUpperCase() + token.slice(1).toLowerCase()
}

function normalizeSessionTitle(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned.slice(0, 120)
}

function derivePromptBasedTitle(prompt: string): string | null {
  if (!hasText(prompt)) {
    return null
  }

  const normalized = String(prompt).replace(/\s+/g, ' ').trim()
  const firstSentence = normalized.split(/[.!?]/).find((sentence) => sentence.trim().length > 12) || normalized

  const cleanedSentence = firstSentence
    .replace(/^[\-\*\d\.\)\(]+/, '')
    .replace(/^(i am|i'm|i want to|i need to|we want to|we need to)\s+/i, '')
    .replace(/^(build|create|develop|design)\s+/i, '')
    .trim()

  const allTokens = cleanedSentence.match(/[A-Za-z0-9]+/g) || []
  if (allTokens.length === 0) {
    return null
  }

  const meaningfulTokens = allTokens.filter((token) => !TITLE_STOP_WORDS.has(token.toLowerCase()))
  const sourceTokens = meaningfulTokens.length >= 3 ? meaningfulTokens : allTokens
  const sliced = sourceTokens.slice(0, 8).map(titleCaseToken)

  if (sliced.length < 2) {
    return null
  }

  return normalizeSessionTitle(sliced.join(' '))
}

export function buildResultFromSections(
  sectionRows: Array<Pick<AnalysisSectionRecord, 'section_id' | 'content'>>,
  fallbackResult?: Record<string, any> | null,
  metadata?: Record<string, unknown> | null
): Record<string, any> {
  const result: Record<string, any> = {
    ...(fallbackResult || {}),
    metadata: {
      ...((fallbackResult?.metadata as Record<string, unknown>) || {}),
      ...(metadata || {}),
    },
  }

  const generated: string[] = []
  for (const row of sectionRows) {
    const sectionId = row.section_id as StrategySectionId
    if (!ALL_ANALYSIS_SECTIONS.includes(sectionId)) continue
    injectSectionContent(result, sectionId, row.content)
    if (isMeaningfulSectionContent(sectionId, row.content)) {
      generated.push(sectionId)
    }
  }

  const mergedGenerated = Array.from(
    new Set([
      ...generated,
      ...(Array.isArray(result.metadata?.generated_sections)
        ? (result.metadata?.generated_sections as string[])
        : []),
    ])
  )

  result.metadata = {
    ...result.metadata,
    generated_sections: mergedGenerated,
    section_status: buildSectionStatus(mergedGenerated),
  }

  return result
}

export async function ensureAnalysisSession(
  supabase: SupabaseClient,
  params: {
    userId: string
    projectId: string
    projectName: string
    prompt: string
    detailLevel: string
    provider: string
    model?: string | null
    result: Record<string, any>
    legacyAnalysisId?: string | null
  }
): Promise<{ id: string; title: string } | null> {
  try {
    if (params.legacyAnalysisId) {
      const { data: existing } = await supabase
        .from('analysis_sessions')
        .select('id, title')
        .eq('legacy_analysis_id', params.legacyAnalysisId)
        .eq('project_id', params.projectId)
        .maybeSingle()

      if (existing?.id) {
        return { id: existing.id, title: existing.title || `Analysis - ${params.projectName}` }
      }
    }

    const generatedSections = deriveGeneratedSectionsFromResult(params.result)
    const completion = calculateSectionCompletion(generatedSections)
    const sectionStatus = buildSectionStatus(generatedSections)
    const title = deriveSessionTitle(params.result, params.prompt, params.projectName)

    const { data, error } = await supabase
      .from('analysis_sessions')
      .insert({
        user_id: params.userId,
        project_id: params.projectId,
        legacy_analysis_id: params.legacyAnalysisId || null,
        title,
        prompt: params.prompt,
        prompt_hash: params.result?.metadata?.input_hash || null,
        detail_level: params.detailLevel,
        provider: params.provider,
        model: params.model || null,
        completion_percentage: completion,
        required_sections: REQUIRED_ANALYSIS_SECTIONS,
        generated_sections: generatedSections,
        section_status: sectionStatus,
        metadata: {
          ...(params.result?.metadata || {}),
          session_title: title,
        },
      })
      .select('id, title')
      .single()

    if (error || !data?.id) {
      return null
    }

    return { id: data.id, title: data.title || title }
  } catch {
    return null
  }
}

export async function upsertAnalysisSectionsFromResult(
  supabase: SupabaseClient,
  params: {
    sessionId: string
    userId: string
    projectId: string
    result: Record<string, any>
    provider: string
    model?: string | null
    inputHash?: string | null
  }
): Promise<void> {
  const rows = ALL_ANALYSIS_SECTIONS.map((sectionId) => {
    const content = extractSectionContent(params.result, sectionId)
    if (!isMeaningfulSectionContent(sectionId, content)) {
      return null
    }

    return {
      session_id: params.sessionId,
      user_id: params.userId,
      project_id: params.projectId,
      section_id: sectionId,
      section_title: getSectionLabel(sectionId),
      status: 'generated',
      content,
      provider: params.provider,
      model: params.model || null,
      input_hash: params.inputHash || null,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }).filter(Boolean)

  if (rows.length === 0) {
    return
  }

  await supabase
    .from('analysis_sections')
    .upsert(rows, { onConflict: 'session_id,section_id' })
}

export async function syncAnalysisSessionProgress(
  supabase: SupabaseClient,
  params: {
    sessionId: string
    result?: Record<string, any> | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  const { data: sections } = await supabase
    .from('analysis_sections')
    .select('section_id')
    .eq('session_id', params.sessionId)
    .eq('status', 'generated')

  const dbGenerated = (sections || []).map((item) => item.section_id)
  const resultGenerated = params.result
    ? deriveGeneratedSectionsFromResult(params.result)
    : []

  const generatedSections = Array.from(new Set([...dbGenerated, ...resultGenerated]))
  const completion = calculateSectionCompletion(generatedSections)
  const sectionStatus = buildSectionStatus(generatedSections)

  await supabase
    .from('analysis_sessions')
    .update({
      generated_sections: generatedSections,
      completion_percentage: completion,
      section_status: sectionStatus,
      metadata: params.metadata || undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.sessionId)
}
