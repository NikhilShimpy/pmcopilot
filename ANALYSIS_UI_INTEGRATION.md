# Analysis UI Integration Guide

## Quick Start

### 1. Navigate to Analysis
```typescript
// From your project page, navigate to:
router.push(`/project/${projectId}/analysis`)

// Or with specific analysis ID:
router.push(`/project/${projectId}/analysis?analysis=${analysisId}`)
```

### 2. Trigger Analysis
```typescript
// Call the analyze endpoint
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    project_id: projectId,
    feedback: userFeedback,
    context: {
      project_name: 'My Product',
      industry: 'SaaS',
      // ... other context
    }
  })
})

const result = await response.json()
const analysisId = result.data.analysis_id

// Navigate to results
router.push(`/project/${projectId}/analysis?analysis=${analysisId}`)
```

### 3. View Results
The UI automatically:
- ✅ Fetches analysis data
- ✅ Displays all components
- ✅ Handles loading states
- ✅ Shows errors gracefully

## Adding to Existing Pages

### Option A: Link from Project Page

```tsx
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'

function ProjectPage({ project }) {
  return (
    <div>
      {/* Your existing content */}

      <Link
        href={`/project/${project.id}/analysis`}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <BarChart3 className="w-4 h-4" />
        View AI Analysis
      </Link>
    </div>
  )
}
```

### Option B: Button with Analysis Trigger

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

function RunAnalysisButton({ projectId, feedback }) {
  const router = useRouter()
  const [isRunning, setIsRunning] = useState(false)

  const handleRun = async () => {
    setIsRunning(true)
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          feedback: feedback,
        })
      })

      const result = await response.json()

      if (result.success) {
        // Navigate to analysis page
        router.push(`/project/${projectId}/analysis?analysis=${result.data.analysis_id}`)
      }
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <button
      onClick={handleRun}
      disabled={isRunning}
      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
    >
      <Sparkles className="w-5 h-5" />
      {isRunning ? 'Running Analysis...' : 'Run AI Analysis'}
    </button>
  )
}
```

### Option C: Embed Components Directly

```tsx
import { ProblemClusters, FeatureSuggestions, ImpactCard } from '@/components/analysis'

function CustomAnalysisView({ analysis }) {
  return (
    <div className="space-y-6">
      {/* Your custom header */}

      <div className="grid grid-cols-2 gap-6">
        <ProblemClusters problems={analysis.problems} />
        <ImpactCard impact={analysis.impact} />
      </div>

      <FeatureSuggestions features={analysis.features} />
    </div>
  )
}
```

## Component Props Reference

### InsightHeader
```typescript
interface InsightHeaderProps {
  problemsCount: number
  featuresCount: number
  confidenceScore: number  // 0-1
  createdAt: string         // ISO date
}
```

### ProblemClusters
```typescript
interface ProblemClustersProps {
  problems: Problem[]
}

interface Problem {
  id: string
  title: string
  description: string
  frequency_score: number  // 1-10
  severity_score: number   // 1-10
  evidence: string[]
  category?: string
  user_segment?: string
}
```

### FeatureSuggestions
```typescript
interface FeatureSuggestionsProps {
  features: Feature[]
}

interface Feature {
  id: string
  name: string
  priority: 'High' | 'Medium' | 'Low'
  reason: string
  linked_problems: string[]
  complexity?: 'Simple' | 'Medium' | 'Complex'
  estimated_impact?: string
  supporting_evidence: string[]
}
```

### ImpactCard
```typescript
interface ImpactCardProps {
  impact: ImpactEstimation
}

interface ImpactEstimation {
  user_impact: string
  user_impact_score: number          // 1-10
  business_impact: string
  business_impact_score: number      // 1-10
  confidence_score: number           // 0-1
  time_to_value?: string
  affected_user_percentage?: number
  revenue_impact?: 'Increase' | 'Decrease' | 'Neutral' | 'Unknown'
  retention_impact?: 'Positive' | 'Negative' | 'Neutral' | 'Unknown'
}
```

### PRDView
```typescript
interface PRDViewProps {
  prd: PRD
}

interface PRD {
  title: string
  problem_statement: string
  solution_overview: string
  goals: string[]
  non_goals: string[]
  user_stories: UserStory[]
  acceptance_criteria: AcceptanceCriteria[]
  success_metrics: string[]
  risks: string[]
  dependencies: string[]
}
```

### TaskBoard
```typescript
interface TaskBoardProps {
  tasks: DevelopmentTask[]
}

interface DevelopmentTask {
  id: string
  title: string
  description: string
  type: 'frontend' | 'backend' | 'api' | 'database' | 'infrastructure' | 'design' | 'testing'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  story_points?: number
  size?: 'XS' | 'S' | 'M' | 'L' | 'XL'
  linked_feature?: string
  dependencies?: string[]
  technical_notes?: string
  acceptance_criteria?: string[]
}
```

## Styling Customization

### Using Tailwind Utilities

All components use Tailwind CSS. Customize by:

1. **Wrapping with your own container:**
```tsx
<div className="max-w-5xl mx-auto">
  <ProblemClusters problems={problems} />
</div>
```

2. **Overriding colors via Tailwind config:**
```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'brand-blue': '#1E40AF',
      'brand-purple': '#7C3AED',
    }
  }
}
```

3. **Adding custom animations:**
```typescript
// tailwind.config.ts
animation: {
  'custom-pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
}
```

## Error Handling

### Client-Side Errors
```tsx
// The AnalysisPageClient handles errors automatically
// But you can add custom error boundaries:

import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error }) {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
      <h3 className="font-bold text-red-900">Something went wrong</h3>
      <p className="text-red-700">{error.message}</p>
    </div>
  )
}

function MyPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AnalysisPageClient {...props} />
    </ErrorBoundary>
  )
}
```

## Performance Tips

### 1. Lazy Load Heavy Components
```tsx
import dynamic from 'next/dynamic'

const TaskBoard = dynamic(() => import('@/components/analysis/TaskBoard'), {
  loading: () => <div>Loading tasks...</div>
})
```

### 2. Memoize Expensive Calculations
```tsx
import { useMemo } from 'react'

const sortedProblems = useMemo(() =>
  problems.sort((a, b) => b.severity_score - a.severity_score),
  [problems]
)
```

### 3. Virtualize Long Lists
```tsx
// For large datasets, use react-window or similar
import { FixedSizeList } from 'react-window'

function LongTaskList({ tasks }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={tasks.length}
      itemSize={120}
    >
      {({ index, style }) => (
        <div style={style}>
          <TaskCard task={tasks[index]} />
        </div>
      )}
    </FixedSizeList>
  )
}
```

## Testing

### Unit Tests (Jest + React Testing Library)
```tsx
import { render, screen } from '@testing-library/react'
import { InsightHeader } from '@/components/analysis'

test('renders problem count', () => {
  render(
    <InsightHeader
      problemsCount={5}
      featuresCount={3}
      confidenceScore={0.85}
      createdAt="2024-03-18T10:00:00Z"
    />
  )

  expect(screen.getByText('5')).toBeInTheDocument()
})
```

### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test('analysis page loads correctly', async ({ page }) => {
  await page.goto('/project/123/analysis')

  // Wait for header
  await expect(page.locator('h1')).toContainText('AI Analysis Complete')

  // Check for problem clusters
  await expect(page.locator('[data-testid="problem-cluster"]')).toBeVisible()
})
```

## Accessibility

All components include:
- ✅ Semantic HTML
- ✅ ARIA labels
- ✅ Keyboard navigation
- ✅ Focus management
- ✅ Screen reader support

### Adding Custom ARIA Labels
```tsx
<button
  onClick={handleExpand}
  aria-expanded={isExpanded}
  aria-label="Show problem evidence"
>
  View Evidence
</button>
```

## Deployment Checklist

- [ ] Verify all API endpoints are accessible
- [ ] Check authentication guards are in place
- [ ] Test responsive layouts on all breakpoints
- [ ] Verify animations are smooth (60fps)
- [ ] Test with real data (not just mock data)
- [ ] Check error states render correctly
- [ ] Verify loading states show immediately
- [ ] Test navigation flows
- [ ] Check that all images/assets load
- [ ] Verify SEO meta tags

## Common Issues & Solutions

### Issue: Components not rendering
**Solution:** Check that data matches TypeScript interfaces exactly

### Issue: Animations laggy
**Solution:** Use `will-change` CSS property or reduce motion complexity

### Issue: Layout breaks on mobile
**Solution:** Test with Chrome DevTools device emulation and adjust breakpoints

### Issue: API timeout
**Solution:** Implement retry logic and show appropriate loading states

## Support

For issues or questions:
1. Check [ANALYSIS_UI_README.md](./ANALYSIS_UI_README.md)
2. Review component source code
3. Check Next.js and Framer Motion docs
4. Open an issue on the repo

---

**Version:** 1.0.0
**Last Updated:** 2024-03-18
**Maintained by:** PMCopilot Team
