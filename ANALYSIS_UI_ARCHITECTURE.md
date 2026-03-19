# 🏗️ Analysis UI Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  app/project/[id]/analysis/page.tsx (Server Component)      │
│  • Handles authentication                                    │
│  • Fetches project & analysis data                          │
│  • Server-side rendering                                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  AnalysisPageClient.tsx (Client Component)                   │
│  • Manages state (loading, error, data)                     │
│  • Fetches analysis via API                                  │
│  • Orchestrates all child components                         │
│  • Handles navigation & actions                              │
└───────────┬──────────────────────────────────┬──────────────┘
            │                                  │
            ▼                                  ▼
┌─────────────────────┐          ┌─────────────────────────┐
│   Loading State     │          │     Empty State          │
│   (if loading)      │          │   (if no analysis)       │
└─────────────────────┘          └─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Main Analysis View                       │
└─────────────────────────────────────────────────────────────┘
            │
            ├──► InsightHeader
            │    └─ Animated counters, metrics
            │
            ├──► Executive Summary Section
            │    └─ Summary text + key findings grid
            │
            ├──► Two-Column Grid Layout
            │    │
            │    ├─ LEFT COLUMN (lg:col-span-2)
            │    │  │
            │    │  ├──► ProblemClusters
            │    │  │    ├─ ProblemCard (expandable)
            │    │  │    │  ├─ Severity indicator
            │    │  │    │  ├─ Progress bars
            │    │  │    │  └─ Evidence quotes
            │    │  │    └─ ... (multiple cards)
            │    │  │
            │    │  └──► FeatureSuggestions
            │    │       ├─ FeatureCard (expandable)
            │    │       │  ├─ Priority badge
            │    │       │  ├─ Complexity indicator
            │    │       │  └─ Supporting evidence
            │    │       └─ ... (multiple cards)
            │    │
            │    └─ RIGHT COLUMN (lg:col-span-1)
            │       │
            │       ├──► ImpactCard
            │       │    ├─ Circular progress (user impact)
            │       │    ├─ Circular progress (business impact)
            │       │    ├─ Impact descriptions
            │       │    └─ Additional metrics
            │       │
            │       └──► PRDView
            │            ├─ Header (gradient)
            │            ├─ Problem statement
            │            ├─ Solution overview
            │            ├─ Goals & Non-goals
            │            ├─ User stories (collapsible)
            │            ├─ Acceptance criteria (collapsible)
            │            ├─ Success metrics (collapsible)
            │            ├─ Risks (collapsible)
            │            └─ Dependencies (collapsible)
            │
            ├──► TaskBoard (Full Width)
            │    ├─ Todo Column
            │    │  └─ TaskCard (expandable)
            │    │     ├─ Type badge
            │    │     ├─ Priority badge
            │    │     ├─ Size/Story points
            │    │     └─ Technical details
            │    ├─ In Progress Column
            │    │  └─ TaskCard...
            │    └─ Done Column
            │       └─ TaskCard...
            │
            ├──► Immediate Actions Section
            │    └─ Numbered action cards
            │
            └──► Explainability Section
                 ├─ Methodology
                 ├─ Data quality score
                 └─ Limitations
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Action                           │
│          Navigate to /project/[id]/analysis                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Server Component (page.tsx)                 │
│  1. Check authentication via Supabase                        │
│  2. Verify project ownership                                 │
│  3. Get analysis ID (from query or latest)                   │
│  4. Verify analysis exists                                   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Client Component (AnalysisPageClient)           │
│  1. Mount & show loading state                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Call (useEffect)                        │
│  GET /api/analyze/[analysisId]                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Response Handler                       │
│  • Success → Set analysis data → Hide loading → Show UI     │
│  • Error → Set error → Show error state with retry          │
│  • Empty → Show empty state with CTA                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Render All Components with Data                 │
│  • Each component animates in with stagger                   │
│  • User can interact with expandable sections                │
│  • Progress bars animate                                     │
│  • Counters count up                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Animation Timeline

```
Time (ms)    Component                    Animation
─────────────────────────────────────────────────────────────
0            Page Load                    → Loading shimmer starts
500          InsightHeader                → Fade in + slide down
700          Counters                     → Count up animation (1.5s)
800          Executive Summary            → Fade in + slide up
900          Key Findings                 → Stagger fade + scale
1000         Problem Cluster 1            → Fade in + slide up
1100         Problem Cluster 2            → Fade in + slide up (stagger +100ms each)
1200         Problem Cluster 3            → Fade in + slide up
1000         Feature Card 1               → Fade in + scale
1080         Feature Card 2               → Fade in + scale (stagger +80ms each)
1160         Feature Card 3               → Fade in + scale
1000         ImpactCard                   → Fade in + slide left
              - Circular Progress         → Stroke animation (1.5s)
              - Confidence Bar            → Width animation (1s)
1200         PRDView                      → Fade in + slide left
              - User expands section      → Height auto animation (300ms)
1000         Task Board                   → Fade in
              - Task Card 1               → Fade in + scale
              - Task Card 2               → Fade in + scale (stagger +50ms each)
1500         Immediate Actions            → Fade in + slide up
              - Action 1                  → Slide in from left (stagger +50ms)
1600         Explainability               → Fade in + slide up
              - Data Quality Bar          → Width animation (1s)

Hover        Any Card                     → Scale 1.02 + lift shadow (300ms)
Click        Expandable Section           → Height auto + rotate chevron (300ms)
```

---

## State Management

```
┌─────────────────────────────────────────────────────────────┐
│                  AnalysisPageClient State                    │
├─────────────────────────────────────────────────────────────┤
│  const [isLoading, setIsLoading] = useState(true)           │
│  const [error, setError] = useState<string | null>(null)    │
│  const [analysis, setAnalysis] =                             │
│    useState<ComprehensiveAnalysisResult | null>(null)       │
└─────────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────────┐ ┌────────────┐ ┌─────────────────┐
│  Loading State  │ │ Error State│ │  Success State  │
│  (isLoading)    │ │  (error)   │ │  (analysis)     │
└─────────────────┘ └────────────┘ └─────────────────┘

Individual Components have their own state for:
• ProblemCard: [isExpanded, setIsExpanded]
• FeatureCard: [isExpanded, setIsExpanded]
• PRDView: [expandedSections, setExpandedSections]
• TaskCard: [isExpanded, setIsExpanded]
```

---

## Props Flow

```
API Response (ComprehensiveAnalysisResult)
│
├─► analysis.problems → ProblemClusters → ProblemCard[]
│   │
│   └─► props: { problem: Problem, index: number }
│       ├─ problem.title
│       ├─ problem.description
│       ├─ problem.frequency_score
│       ├─ problem.severity_score
│       └─ problem.evidence[]
│
├─► analysis.features → FeatureSuggestions → FeatureCard[]
│   │
│   └─► props: { feature: Feature, index: number }
│       ├─ feature.name
│       ├─ feature.priority
│       ├─ feature.reason
│       └─ feature.supporting_evidence[]
│
├─► analysis.impact → ImpactCard
│   │
│   └─► props: { impact: ImpactEstimation }
│       ├─ impact.user_impact_score
│       ├─ impact.business_impact_score
│       └─ impact.confidence_score
│
├─► analysis.prd → PRDView
│   │
│   └─► props: { prd: PRD }
│       ├─ prd.title
│       ├─ prd.problem_statement
│       ├─ prd.user_stories[]
│       └─ prd.acceptance_criteria[]
│
└─► analysis.tasks → TaskBoard → TaskCard[]
    │
    └─► props: { task: DevelopmentTask, index: number }
        ├─ task.title
        ├─ task.type
        ├─ task.priority
        └─ task.acceptance_criteria[]
```

---

## Styling Architecture

```
Global Styles (Tailwind Config)
├─ Colors
│  └─ Default Tailwind + Custom gradients
├─ Border Radius
│  └─ rounded-2xl (16px) primary
├─ Shadows
│  └─ shadow-sm, shadow-lg
└─ Animations
   ├─ shimmer (loading)
   ├─ pulse (spinners)
   └─ [Framer Motion animations]

Component-Level Styles
├─ Utility Classes (Tailwind)
│  ├─ Layout: flex, grid, gap-6, p-6
│  ├─ Colors: bg-*, text-*, border-*
│  ├─ Typography: font-bold, text-sm
│  └─ Effects: hover:shadow-lg, transition-all
│
└─ Motion Components (Framer)
   ├─ initial={{ opacity: 0, y: 20 }}
   ├─ animate={{ opacity: 1, y: 0 }}
   ├─ transition={{ duration: 0.5 }}
   └─ whileHover={{ scale: 1.02 }}
```

---

## Performance Optimization Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Current Implementation                    │
├─────────────────────────────────────────────────────────────┤
│ ✅ Server-side rendering (initial page load)                │
│ ✅ Client-side data fetching (analysis data)                │
│ ✅ Staggered animations (smooth 60fps)                      │
│ ✅ Conditional rendering (loading/error/success)            │
│ ✅ Component-level state (no global store needed)           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Future Optimizations                      │
├─────────────────────────────────────────────────────────────┤
│ □ React.memo for expensive components                       │
│ □ useMemo for sorted/filtered data                          │
│ □ Virtual scrolling for large lists (react-window)          │
│ □ Image optimization (Next.js Image)                        │
│ □ Code splitting (dynamic imports)                          │
│ □ Prefetch analysis data on hover                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Boundaries

```
Browser Error
     │
     ▼
Component Throws
     │
     ▼
React Error Boundary (can be added)
     │
     ├─► Log to monitoring service
     │
     └─► Show Fallback UI
         ├─ Error message
         ├─ Retry button
         └─ Back to safety

Network Error (API)
     │
     ▼
try/catch in fetchAnalysis()
     │
     ├─► setError(message)
     │
     └─► Render Error State
         ├─ Error icon
         ├─ Error message
         ├─ Retry button
         └─ Go back button
```

---

## Extensibility Points

```
Want to add a new section?

1. Create Component
   components/analysis/MyNewSection.tsx

2. Define Props Interface
   interface MyNewSectionProps {
     data: MyData
   }

3. Add to AnalysisPageClient
   import MyNewSection from '@/components/analysis/MyNewSection'

   // In render:
   <MyNewSection data={analysis.myData} />

4. Export from index.ts
   export { default as MyNewSection } from './MyNewSection'

5. Add animations (optional)
   <motion.div
     initial={{ opacity: 0, y: 20 }}
     animate={{ opacity: 1, y: 0 }}
     transition={{ delay: 0.7 }}
   >
     <MyNewSection {...props} />
   </motion.div>
```

---

## Testing Structure

```
Unit Tests (Components)
├─ LoadingState.test.tsx
│  └─ Renders shimmer skeletons
├─ EmptyState.test.tsx
│  └─ Shows CTA button
├─ InsightHeader.test.tsx
│  ├─ Displays correct counts
│  └─ Animates counters
├─ ProblemClusters.test.tsx
│  ├─ Renders problem cards
│  └─ Expands on click
└─ ... (all components)

Integration Tests (Page)
├─ AnalysisPage.test.tsx
   ├─ Fetches data on mount
   ├─ Shows loading state
   ├─ Handles errors
   └─ Renders all components

E2E Tests (Playwright)
├─ analysis-flow.spec.ts
   ├─ Navigate to analysis page
   ├─ Wait for data to load
   ├─ Verify all sections visible
   ├─ Interact with expandable sections
   └─ Test navigation buttons
```

---

This architecture ensures:
- ✅ Clear separation of concerns
- ✅ Predictable data flow
- ✅ Easy to understand and maintain
- ✅ Simple to extend with new features
- ✅ Performance optimized
- ✅ Type-safe throughout
