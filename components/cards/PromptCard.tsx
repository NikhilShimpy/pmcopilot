/**
 * Prompt Card - Draggable card for action prompts
 * Triggers detailed outputs when dropped in chat
 * Examples: "Generate timeline", "Estimate cost in INR"
 */

'use client'

import React from 'react'
import {
  MessageSquare,
  Clock,
  DollarSign,
  Users,
  Database,
  FileText,
  BarChart3,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { DraggableCard } from '../dnd/DraggableCard'
import { PromptCard as PromptCardType, PromptCategory } from '@/types/workspace'

// Predefined prompt cards for common actions
export const PROMPT_CARDS: PromptCardType[] = [
  // Generate category
  {
    id: 'generate-timeline',
    label: 'Generate detailed timeline',
    prompt: `Generate a detailed development timeline with:
- Phase breakdown (MVP, Growth, Scale)
- Week-by-week milestones
- Task dependencies
- Critical path analysis
- Risk factors and buffers
- Team allocation per phase`,
    description: 'Get a comprehensive development schedule',
    icon: 'Clock',
    category: 'generate',
  },
  {
    id: 'generate-cost-inr',
    label: 'Estimate cost in INR (₹)',
    prompt: `Estimate the complete development cost in Indian Rupees (₹) including:
- Development cost breakdown (frontend, backend, AI/ML, DevOps)
- Infrastructure costs (AWS/GCP estimate for India region)
- Third-party service costs
- Team salaries (based on Indian market rates)
- Monthly burn rate
- MVP cost vs Scale cost
- Cost optimization suggestions
Use realistic Indian startup pricing.`,
    description: 'Get India-focused cost estimation',
    icon: 'DollarSign',
    category: 'generate',
  },
  {
    id: 'generate-manpower',
    label: 'Provide manpower breakdown',
    prompt: `Provide detailed manpower planning with:
- Role-wise breakdown (Frontend, Backend, DevOps, PM, Designer)
- Seniority levels needed (Junior/Mid/Senior)
- Monthly salary ranges in INR (₹)
- Full-time vs Contract recommendations
- Hiring timeline
- Team scaling plan
- Key skills required per role`,
    description: 'Get team structure and salary estimates',
    icon: 'Users',
    category: 'generate',
  },
  {
    id: 'generate-schema',
    label: 'Expand database schema',
    prompt: `Generate a complete database schema with:
- All tables and their relationships
- Field types and constraints
- Primary and foreign keys
- Indexes for performance
- Sample data structure
- Scalability considerations
- Migration strategy`,
    description: 'Get detailed database design',
    icon: 'Database',
    category: 'generate',
  },

  // Detail category
  {
    id: 'detail-prd',
    label: 'Expand PRD details',
    prompt: `Expand the Product Requirements Document with:
- Detailed user personas with demographics
- Complete user journey maps
- All functional requirements
- Non-functional requirements (performance, security, scalability)
- Success metrics and KPIs
- Release criteria
- Out of scope items`,
    description: 'Get comprehensive PRD',
    icon: 'FileText',
    category: 'detail',
  },
  {
    id: 'detail-analytics',
    label: 'Define analytics & KPIs',
    prompt: `Define comprehensive analytics and KPIs:
- Core business metrics
- Product health metrics
- User engagement metrics
- Technical performance metrics
- Tracking implementation plan
- Dashboard recommendations
- Alert thresholds`,
    description: 'Get metrics and analytics plan',
    icon: 'BarChart3',
    category: 'detail',
  },

  // Expand category
  {
    id: 'expand-features',
    label: 'Expand feature details',
    prompt: `For each feature, provide:
- Detailed requirements
- User stories with acceptance criteria
- Technical implementation approach
- Effort estimation
- Dependencies
- Edge cases to handle
- Testing requirements`,
    description: 'Get detailed feature specs',
    icon: 'Sparkles',
    category: 'expand',
  },
  {
    id: 'expand-tasks',
    label: 'Break down into subtasks',
    prompt: `Break down development tasks into granular subtasks:
- Each subtask should be < 4 hours
- Include technical approach
- List dependencies
- Define done criteria
- Estimate complexity
- Identify risks`,
    description: 'Get actionable subtasks',
    icon: 'ArrowRight',
    category: 'expand',
  },

  // Compare category
  {
    id: 'compare-approaches',
    label: 'Compare implementation approaches',
    prompt: `Compare different implementation approaches for this:
- Option A: [Approach 1]
- Option B: [Approach 2]
For each, analyze:
- Pros and cons
- Development effort
- Scalability implications
- Cost implications
- Risk factors
- Recommendation with reasoning`,
    description: 'Get decision analysis',
    icon: 'MessageSquare',
    category: 'compare',
  },
]

// Icon mapping
const iconComponents: Record<string, React.ElementType> = {
  MessageSquare,
  Clock,
  DollarSign,
  Users,
  Database,
  FileText,
  BarChart3,
  ArrowRight,
  Sparkles,
}

interface PromptCardProps {
  prompt: PromptCardType
  index?: number
  draggable?: boolean
  onClick?: () => void
  className?: string
}

export function PromptCard({
  prompt,
  index = 0,
  draggable = true,
  onClick,
  className = '',
}: PromptCardProps) {
  const Icon = iconComponents[prompt.icon] || MessageSquare

  const categoryStyles: Record<PromptCategory, { bg: string; border: string; text: string }> = {
    generate: { bg: 'bg-indigo-50', border: 'border-indigo-200 hover:border-indigo-400', text: 'text-indigo-700' },
    detail: { bg: 'bg-purple-50', border: 'border-purple-200 hover:border-purple-400', text: 'text-purple-700' },
    expand: { bg: 'bg-blue-50', border: 'border-blue-200 hover:border-blue-400', text: 'text-blue-700' },
    compare: { bg: 'bg-amber-50', border: 'border-amber-200 hover:border-amber-400', text: 'text-amber-700' },
  }

  const style = categoryStyles[prompt.category]

  const content = (
    <div
      onClick={onClick}
      className={`
        group flex items-center gap-3 p-3
        ${style.bg} border ${style.border} rounded-lg
        transition-all duration-200 cursor-pointer
        hover:shadow-md hover:scale-[1.02]
        ${className}
      `}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${style.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm ${style.text}`}>{prompt.label}</p>
        <p className="text-xs text-slate-500 truncate">{prompt.description}</p>
      </div>
      <ArrowRight className={`w-4 h-4 ${style.text} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </div>
  )

  if (!draggable) return content

  return (
    <DraggableCard
      id={prompt.id}
      type="prompt"
      payload={prompt}
      metadata={{
        sourceSection: 'prompts',
        originalIndex: index,
        title: prompt.label,
        subtitle: prompt.category,
      }}
      showHandle={false}
    >
      {content}
    </DraggableCard>
  )
}

// Grouped prompt cards by category
interface PromptCardGroupProps {
  category: PromptCategory
  prompts?: PromptCardType[]
  onPromptClick?: (prompt: PromptCardType) => void
}

export function PromptCardGroup({
  category,
  prompts = PROMPT_CARDS.filter((p) => p.category === category),
  onPromptClick,
}: PromptCardGroupProps) {
  const categoryLabels: Record<PromptCategory, string> = {
    generate: 'Generate Detailed Outputs',
    detail: 'Get More Details',
    expand: 'Expand & Break Down',
    compare: 'Compare & Analyze',
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        {categoryLabels[category]}
      </h4>
      <div className="space-y-2">
        {prompts.map((prompt, index) => (
          <PromptCard
            key={prompt.id}
            prompt={prompt}
            index={index}
            onClick={() => onPromptClick?.(prompt)}
          />
        ))}
      </div>
    </div>
  )
}

// All prompts grid
export function AllPromptCards({
  onPromptClick,
}: {
  onPromptClick?: (prompt: PromptCardType) => void
}) {
  const categories: PromptCategory[] = ['generate', 'detail', 'expand', 'compare']

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <PromptCardGroup
          key={category}
          category={category}
          onPromptClick={onPromptClick}
        />
      ))}
    </div>
  )
}

export default PromptCard
