# PMCopilot Repository Description

> Analysis scope: this document is based on the repository state in `d:\projects\pmcopilot` as inspected on 2026-05-05. It distinguishes between the current production path and older legacy/demo paths that still exist in the codebase.

## 1. Project Overview

### Purpose
PMCopilot is a Next.js App Router application for product managers, founders, and early product teams who want to turn raw product ideas, mixed research inputs, and customer feedback into structured planning artifacts. The current product centers on:

- creating a project
- collecting input from typed text, documents, screenshots, audio, and pasted social content
- generating an AI-produced product strategy overview first
- generating deeper sections on demand instead of producing the full report in one request
- reviewing, exporting, and discussing the output through a structured follow-up chat

### Problem Solved
The repository solves two related problems:

1. turning messy qualitative input into structured product-planning output
2. letting users progressively expand that output section by section to stay within model/token/runtime limits

The codebase intentionally enforces:

- Gemini free-tier only
- no paid fallback providers in the active runtime path
- section-on-demand generation
- token-safe per-section prompting

### Target Users

- solo founders drafting a product plan
- PMs converting research notes into requirements
- internal teams exploring scope, cost, roadmap, and staffing
- teams collecting ongoing feedback and, on legacy paths, triggering automatic analysis after enough feedback arrives

### Real-World Application
In real usage, a user can create a project such as "AI scheduling assistant", paste a brief, upload screenshots of competitor reviews, import a WhatsApp thread, and ask PMCopilot to generate an overview. From there the user can selectively generate the PRD, feature system, system design, cost estimation, timeline, and follow-up advice without paying for or waiting on one monolithic generation.

### Current Product Reality
The active product flow is:

`dashboard -> project input composer -> /api/analyze overview -> /project/[id]/output -> on-demand /api/analyze/[id]/section -> /api/chat-first follow-up`

The repository also contains older flows:

- full-pipeline legacy analysis in `lib/aiEngine.ts`
- legacy workspace/chat surfaces
- legacy feedback-threshold auto-analysis
- compatibility code for Groq, Claude, and Puter that is no longer part of the active production path

## 2. Complete Feature List

### Feature 1: Authentication and Route Protection

**What it does**

- signs users up and in through Supabase auth
- exchanges auth callbacks for sessions
- protects dashboard/project routes
- redirects authenticated users away from auth pages

**Why it exists**

- every project, analysis session, import, report, settings record, and follow-up history row is user-scoped

**Files/modules involved**

- `app/(auth)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/auth/callback/route.ts`
- `app/layout.tsx`
- `proxy.ts`
- `hooks/useAuth.tsx`
- `lib/auth.ts`
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `app/api/auth/profile/route.ts`

**Internal working**

- `proxy.ts` refreshes the Supabase session per request and guards `/dashboard` and `/project`
- `app/auth/callback/route.ts` exchanges the callback code for a session and redirects
- `hooks/useAuth.tsx` keeps client auth state in sync for UI
- server pages call `requireServerAuth()` before rendering protected pages

**Input required**

- email/password on login/signup pages
- Supabase callback code on `/auth/callback`
- valid auth cookies on protected routes

**Feature Output Deep Analysis**

- Output produced: authenticated session cookies, redirects, and profile bootstrap calls
- Type of output: browser redirect, authenticated UI state, API JSON
- Exact structure of output:

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

Redirect behavior examples:

- unauthenticated request to `/dashboard` -> redirect to `/login`
- authenticated request to `/login` -> redirect to `/dashboard`
- callback success -> redirect to `/dashboard`
- callback failure -> redirect to `/login?error=auth_callback_failed`

- How output is generated:
  1. browser submits credentials to Supabase auth helpers
  2. Supabase sets auth/session state
  3. `proxy.ts` checks route category and session presence
  4. protected pages call server auth helpers before rendering
  5. optional profile creation route inserts a `profiles` row if missing
- Where output is returned/displayed: login/signup pages, protected page redirects, auth callback route
- How input transforms into output: credentials or callback code become a Supabase session, then route-level authorization decides which page to render or where to redirect
- Edge cases affecting output:
  - missing/expired session cookies redirect users to `/login`
  - callback failure redirects with error query param
  - `app/api/auth/profile/route.ts` and `app/api/profile/route.ts` overlap conceptually; the newer route is the main profile CRUD surface
- Timing / async behavior: all session checks are async; callback exchange is a single route-handler round trip

### Feature 2: Project CRUD and Dashboard

**What it does**

- creates, lists, updates, searches, and deletes projects
- shows dashboard cards and summary analytics
- surfaces setup issues such as a missing `projects` table

**Why it exists**

- the project is the root container for analysis, feedback, imports, and follow-up history

**Files/modules involved**

- `app/dashboard/page.tsx`
- `app/dashboard/DashboardClient.tsx`
- `hooks/useProjects.ts`
- `app/api/projects/route.ts`
- `app/api/projects/[id]/route.ts`
- `services/project.service.ts`
- `components/dashboard/*`

**Internal working**

- browser CRUD uses Supabase directly in `useProjects.ts` for some operations and API routes for others
- `projectService` validates names/descriptions, sanitizes input, and enforces ownership
- delete logic retries after cleaning dependent rows when foreign-key blockers remain

**Input required**

- project `name`
- optional `description`
- authenticated user session

**Feature Output Deep Analysis**

- Output produced: project rows and dashboard-ready lists
- Type of output: JSON, UI cards, database inserts/updates/deletes
- Exact structure of output:

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "project-uuid",
        "user_id": "user-uuid",
        "name": "AI Scheduling Assistant",
        "description": "Helps teams auto-plan meetings",
        "created_at": "2026-05-05T12:00:00.000Z",
        "updated_at": "2026-05-05T12:00:00.000Z"
      }
    ],
    "total": 1,
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 1
    }
  }
}
```

- How output is generated:
  1. UI calls `/api/projects` or `/api/projects/[id]`
  2. route validates auth and delegates to `projectService`
  3. service validates and sanitizes
  4. Supabase reads/writes `projects`
  5. response is wrapped through `successResponse()`
- Where output is returned/displayed: dashboard cards, create/edit modal, project selector pages
- How input transforms into output: raw project form values become sanitized DB rows and then become dashboard cards and project navigation links
- Edge cases affecting output:
  - missing `projects` table triggers dashboard setup UI
  - delete may need dependency cleanup for `analysis_sessions`, `analysis_sections`, `feedbacks`, and `analyses`
  - support tickets are detached, not deleted, on project removal
- Timing / async behavior: paginated reads and CRUD are standard async request/response operations

### Feature 3: Multi-Source Analysis Input Composer

**What it does**

- lets the user build the final analysis prompt from typed text plus imported content
- supports editable imported excerpts before generation
- supports output-length selection

**Why it exists**

- the core product needs a token-safe, user-reviewable prompt assembly step before any AI generation occurs

**Files/modules involved**

- `app/project/[id]/ProjectInputClient.tsx`
- `app/project/[id]/page.tsx`
- `app/project/[id]/not-found.tsx`

**Internal working**

- `ProjectInputClient` stores `manualInput`, `imports`, `finalInput`, and `outputLength`
- `mergeFinalPrompt()` concatenates manual text plus each import as `Source: <title>\n<editable_text>`
- the user can rebuild the final prompt or manually edit it before sending to `/api/analyze`

**Input required**

- typed project brief and/or imported inputs
- selected output length: `short | medium | long | extra-long`

**Feature Output Deep Analysis**

- Output produced: a final prompt string plus metadata sent to the analysis API
- Type of output: UI state and JSON request body
- Exact structure of output:

```json
{
  "feedback": "Describe the product...\n\nSource: whatsapp-pasted.txt\n[12/01/2026 10:05 AM] User: ...",
  "project_id": "project-uuid",
  "detail_level": "long",
  "reuse_cached": false,
  "input_import_ids": ["import-uuid-1", "import-uuid-2"],
  "input_sources": [
    {
      "source_type": "text",
      "input_method": "manual_text",
      "label": "Typed input"
    },
    {
      "source_type": "whatsapp",
      "input_method": "social_paste",
      "label": "whatsapp-pasted.txt",
      "import_id": "import-uuid-1"
    }
  ],
  "context": {
    "project_name": "AI Scheduling Assistant",
    "project_context": "Helps teams auto-plan meetings"
  }
}
```

- How output is generated:
  1. user types text and/or imports sources
  2. imported content is normalized and stored
  3. user can edit the extracted import text
  4. `mergeFinalPrompt()` assembles a single analysis payload
  5. client posts the payload to `/api/analyze`
- Where output is returned/displayed: final prompt textarea, then the output page after successful generation
- How input transforms into output: multiple heterogeneous sources become a single linear prompt plus traceable import metadata
- Edge cases affecting output:
  - empty final input blocks generation
  - large files above 4 MB are rejected before processing
  - the user can diverge from the auto-built prompt by editing `finalInput` manually
- Timing / async behavior: import processing is async per file; generation request is async and navigates after completion

### Feature 4: Import Processing for Text, Files, Images, Audio, and Social Sources

**What it does**

- processes uploaded or pasted content into normalized text for analysis
- supports `text`, `file`, `image`, `audio`, `whatsapp`, `linkedin`, and `instagram`
- stores imports in `analysis_input_imports`

**Why it exists**

- the analysis engine needs text; this feature converts mixed media and social content into analysis-ready text while preserving source traceability

**Files/modules involved**

- `app/api/imports/process/route.ts`
- `app/project/[id]/ProjectInputClient.tsx`
- `scripts/migrations/010_analysis_input_imports.sql`

**Internal working**

- WhatsApp text is parsed into `[date time] speaker: message` lines
- LinkedIn and Instagram content are cleaned with source-specific rules
- plain text, CSV, and JSON are decoded directly
- image/audio/PDF/Word extraction uses Gemini multimodal calls
- the normalized result and metadata are inserted into `analysis_input_imports`

**Input required**

- `project_id`
- `source_type`
- either `text` or `file_base64`
- optional `file_name`, `mime_type`, `file_size`, `storage_bucket`, `storage_path`, `additional_context`

**Feature Output Deep Analysis**

- Output produced: a persisted import record containing raw and normalized text
- Type of output: JSON and database row
- Exact structure of output:

```json
{
  "success": true,
  "data": {
    "import": {
      "id": "import-uuid",
      "source_type": "whatsapp",
      "import_method": "social_paste",
      "title": "whatsapp-pasted.txt",
      "normalized_text": "[12/01/2026 10:05 AM] Maya: Users keep asking for offline mode",
      "raw_text": "12/01/2026, 10:05 AM - Maya: Users keep asking for offline mode",
      "file_name": "whatsapp-pasted.txt",
      "mime_type": "text/plain",
      "storage_path": null,
      "storage_bucket": null,
      "metadata": {
        "parser_version": "v1",
        "content_hash": "sha256hex",
        "additional_context": null
      },
      "created_at": "2026-05-05T12:15:00.000Z"
    }
  },
  "message": "Import processed successfully"
}
```

- How output is generated:
  1. route validates auth, project ownership, source type, size, and mime type
  2. if binary, `extractTextFromBinary()` selects direct decode or Gemini multimodal extraction
  3. source-specific normalization cleans the text
  4. route hashes normalized text and builds metadata
  5. Supabase inserts a row into `analysis_input_imports`
- Where output is returned/displayed: import preview cards in `ProjectInputClient`
- How input transforms into output: file bytes or pasted text become normalized plain text plus a source-specific import record
- Edge cases affecting output:
  - missing `analysis_input_imports` table returns a migration error
  - normalized content under 10 characters is rejected
  - unsupported mime types are rejected
  - Gemini extraction failure is surfaced as a validation error
- Timing / async behavior: binary extraction is async; image/audio/document imports depend on external Gemini response time

### Feature List Continuation Note

Features 5 through 16 are documented later in this file alongside the architecture and runtime layers they depend on:

- Feature 5: Overview generation and analysis session creation
- Feature 6: Deferred section generation
- Feature 7: Session history, cached reuse, retrieval, and deletion
- Feature 8: Output viewer, section freshness, and export
- Feature 9: Cost intake questionnaire and cost-aware regeneration
- Feature 10: Structured follow-up chat and persisted follow-up history
- Feature 11: Feedback CRUD and feedback hub
- Feature 12: External ingestion and legacy auto-triggered analysis
- Feature 13: Reports and analytics
- Feature 14: Profile, settings, shortcuts, and support
- Feature 15: Setup, health, and debug utilities
- Feature 16: Legacy workspace, legacy chat, and demo surfaces

## 3. System Architecture

### High-Level Architecture

1. **Frontend**
   - Next.js App Router pages and client components
   - major surfaces: landing, auth, dashboard, project input, project output, history, feedback, reports, settings
2. **Application layer**
   - route handlers under `app/api/*`
   - validation, auth checks, section orchestration, streaming
3. **AI orchestration**
   - current path: `lib/sectionedStrategyEngine.ts` + `lib/geminiSectionClient.ts`
   - legacy path: `lib/aiEngine.ts` and `services/analysis-engine.service.ts`
4. **Persistence**
   - Supabase Postgres for all app data
   - Supabase Storage for optional import file upload
5. **Auth/session**
   - Supabase SSR auth cookies handled via `proxy.ts` and server helpers

### Current Production Data Flow

1. user creates a project
2. user assembles typed and imported context
3. `/api/imports/process` normalizes and stores input sources
4. `/api/analyze` generates overview only
5. `analysis_sessions` row is created
6. `analysis_sections` stores `overview` and `executive-dashboard`
7. output page rehydrates the result
8. user requests deeper sections one at a time
9. `/api/analyze/[id]/section` generates and persists only the requested section
10. follow-up chat uses `/api/chat-first` with a compact analysis snapshot
11. optional export converts the hydrated result into markdown/plain text/print/RTF

### Persistence Model

- `analysis_sessions` is the normalized root record
- `analysis_sections` stores section content separately
- `analysis_input_imports` stores source artifacts
- `analysis_followup_sessions` and `analysis_followup_messages` store chat history
- `analyses` remains as a legacy blob table for backward compatibility

### Legacy Parallel Architecture

- feedback ingestion APIs still save `feedbacks`
- threshold logic in `services/trigger.service.ts` can trigger the older monolithic analysis engine
- older outputs are stored in `analyses.result` JSON blobs
- history and retrieval routes can hydrate either normalized sessions or legacy blobs

## 4. Tech Stack

### Frontend

- **Next.js 16.2.1**: App Router page structure, route handlers, server/client component split
- **React 18.3.0**: UI rendering and stateful client components
- **Tailwind CSS 3.4**: utility styling across pages and components
- **Framer Motion**: animation for panels, cards, and transitions
- **Lucide React**: icon system
- **React Markdown**: rendering structured markdown and follow-up answers
- **Recharts**: reports charts
- **Zustand**: state stores for workspace/chat-first UI variants

### Backend / Server Runtime

- **Next.js route handlers**: the backend layer for API routes and SSE
- **Axios**: direct Gemini HTTP calls
- **Node.js runtime**: used on AI and setup routes with `runtime = 'nodejs'`

### Database / Storage / Auth

- **Supabase Postgres**: projects, analyses, imports, settings, feedback, reports
- **Supabase Storage**: optional uploaded import file persistence
- **Supabase Auth**: session and route protection
- **Supabase RLS**: per-user data isolation

### AI / Model Layer

- **Gemini free-tier models only**:
  - `gemini-2.5-flash-lite`
  - `gemini-2.5-flash`

Why used:

- cheaper/free-tier-compatible generation
- multimodal extraction for images, audio, and some documents
- structured JSON output for section generation and follow-up chat

### Libraries and Utilities

- **react-hook-form**: limited form support in some UIs
- **zod**: dependency present for schema work, though most validation here is manual
- **@supabase/ssr** and **@supabase/supabase-js**: server/client auth and database access
- **@dnd-kit/***: drag-and-drop support for workspace/demo surfaces

### Tools and Deployment

- **TypeScript 5.5**
- **ESLint**
- **Vercel configuration** via `vercel.json`
- **Node >= 20.19.0** declared in `package.json`

### Continued Feature Catalogue

The remaining feature entries appear here because they are tightly coupled to the runtime orchestration, persistence, and UI stack described above.

### Feature 5: Overview Generation and Analysis Session Creation

**What it does**

- generates the initial overview only
- persists a normalized analysis session
- optionally reuses a cached session with the same input hash and depth

**Why it exists**

- the application avoids generating all sections at once and instead establishes a lightweight overview as the root artifact

**Files/modules involved**

- `app/api/analyze/route.ts`
- `lib/sectionedStrategyEngine.ts`
- `lib/geminiSectionClient.ts`
- `lib/analysisSessionStore.ts`
- `types/comprehensive-strategy.ts`

**Internal working**

- request input is normalized and hashed
- authenticated project requests can reuse a matching `analysis_sessions` record
- `generateOverviewAnalysis()` produces:
  - `executive_dashboard`
  - `overview_summary`
  - metadata
- `ensureAnalysisSession()` inserts `analysis_sessions`
- `upsertAnalysisSectionsFromResult()` writes the `overview` and `executive-dashboard` section rows

**Input required**

- `feedback`
- optional `project_id`
- optional `detail_level`
- optional `input_import_ids`, `input_sources`, `context`

**Feature Output Deep Analysis**

- Output produced: overview analysis result and normalized analysis-session persistence
- Type of output: JSON, database rows
- Exact structure of output:

```json
{
  "success": true,
  "data": {
    "executive_dashboard": {
      "idea_expansion": "Expanded explanation of the idea",
      "key_insight": "Main market/product insight",
      "innovation_score": 8.2,
      "market_opportunity": "Specific opportunity statement",
      "complexity_level": "Medium",
      "recommended_strategy": "Suggested product strategy",
      "idea_expansion_breakdown": ["...", "..."],
      "market_opportunity_signals": ["...", "..."],
      "recommended_strategy_actions": ["...", "..."],
      "score_rationale": "Why the score was assigned"
    },
    "overview_summary": {
      "product_name": "AI Scheduling Assistant",
      "one_line_summary": "A tool that auto-schedules internal meetings",
      "core_value_props": ["Cuts coordination time", "Reduces calendar friction"],
      "critical_unknowns": ["Enterprise security needs", "Calendar API limits"]
    },
    "metadata": {
      "analysis_id": "session-or-temp-id",
      "created_at": "2026-05-05T12:20:00.000Z",
      "processing_time_ms": 18741,
      "model_used": "gemini-2.5-flash-lite",
      "input_length": 2480,
      "provider": "gemini",
      "generated_sections": ["overview", "executive-dashboard"],
      "section_providers": {
        "overview": "gemini",
        "executive-dashboard": "gemini"
      },
      "source_input": "normalized prompt text",
      "project_name": "AI Scheduling Assistant",
      "detail_level": "long",
      "input_hash": "sha256hex",
      "saved_analysis_id": "session-uuid",
      "session_id": "session-uuid",
      "session_title": "AI Scheduling Assistant",
      "input_sources": [],
      "input_import_ids": []
    },
    "saved_id": "session-uuid",
    "provider": "gemini",
    "api_processing_time_ms": 18741,
    "depth_level": "long",
    "generation_mode": "section-on-demand-overview"
  },
  "message": "Analysis completed successfully"
}
```

- How output is generated:
  1. `/api/analyze` validates the request
  2. feedback is normalized and hashed
  3. the route loads project context when possible
  4. cached session reuse is attempted
  5. if cache miss, `generateOverviewAnalysis()` prompts Gemini
  6. response metadata is enriched
  7. session and section rows are persisted if user/project context exists
- Where output is returned/displayed: output page overview cards and section sidebar
- How input transforms into output: raw project prompt becomes a structured executive dashboard plus overview summary, not a full report
- Edge cases affecting output:
  - input shorter than 10 meaningful characters is rejected
  - Gemini key pool exhaustion returns HTTP `429`
  - unauthenticated users can generate but do not get durable history
- Timing / async behavior: one Gemini request plus optional persistence writes; max route duration is 60 seconds

### Feature 6: Deferred Section Generation

**What it does**

- generates deep sections one at a time after overview creation
- supports aliases like `problems`, `features`, `cost`, `timeline`, and `impact`
- updates session progress and section freshness

**Why it exists**

- this is the repository's main token-control mechanism and the clearest architectural choice in the active product

**Files/modules involved**

- `app/api/analyze/[id]/section/route.ts`
- `app/api/analyze/section/route.ts`
- `lib/analyzeSectionRoute.ts`
- `lib/sectionedStrategyEngine.ts`
- `lib/analysisSessionStore.ts`
- `app/project/[id]/output/ProjectOutputClient.tsx`

**Internal working**

- request resolves a canonical `StrategySectionId`
- current result is reconstructed from `analysis_sections`
- stale sections are detected by comparing `metadata.input_hash` against `metadata.section_input_hashes[section]`
- `generateDeferredStrategySection()` prompts Gemini with a section-specific schema and richness target
- the route persists the returned section and recalculates completion

**Input required**

- analysis/session id
- section id or alias
- optional `force`
- optional `cost_intake`
- optional context override

**Feature Output Deep Analysis**

- Output produced: one newly generated section plus the updated aggregate result
- Type of output: JSON and database row update
- Exact structure of output:

```json
{
  "success": true,
  "data": {
    "analysis_id": "session-uuid",
    "section": "problem-analysis",
    "provider": "gemini",
    "generated": true,
    "from_cache": false,
    "section_data": [
      {
        "id": "problem_1",
        "title": "Manual scheduling takes too long",
        "deep_description": "Teams spend excessive time coordinating calendars",
        "root_cause": "Fragmented calendar workflows",
        "affected_users": "Team leads and operations coordinators",
        "severity_score": 8,
        "frequency_score": 7,
        "business_impact": "Lost productivity and delayed meetings"
      }
    ],
    "result": {
      "...": "full current analysis result with metadata and generated_sections updated"
    }
  }
}
```

- How output is generated:
  1. route validates auth and section name
  2. route loads current normalized session or falls back to legacy `analyses`
  3. route checks whether the section is already fresh
  4. if stale or missing, section-specific prompt is generated
  5. Gemini returns JSON for only that section
  6. section row is upserted and `analysis_sessions` progress is synchronized
- Where output is returned/displayed: section panel in `ProjectOutputClient`
- How input transforms into output: the original prompt plus existing analysis context becomes a targeted section payload
- Edge cases affecting output:
  - overview sections are not re-generated from this endpoint when input changed; the user must regenerate overview from the main action
  - invalid `cost_intake` is rejected
  - legacy analysis ids are still supported
- Timing / async behavior: one async section call at a time; the UI blocks duplicate in-flight requests per section

### Feature 7: Session History, Cached Reuse, Retrieval, and Deletion

**What it does**

- lists prior analysis sessions
- rehydrates sectioned results into complete result objects
- reuses matching sessions by prompt hash and depth
- supports deleting a session

**Why it exists**

- analysis work is expensive relative to the free-tier constraints, so history and reuse reduce repeated generation

**Files/modules involved**

- `app/api/analyze/route.ts`
- `app/api/analyze/[id]/route.ts`
- `app/project/[id]/history/page.tsx`
- `app/project/[id]/history/ProjectHistoryClient.tsx`
- `app/analysis/page.tsx`
- `app/analysis/AnalysisSelectorClient.tsx`
- `lib/analysisSessionStore.ts`

**Feature Output Deep Analysis**

- Output produced: paginated history objects and hydrated single-analysis payloads
- Type of output: JSON and UI lists
- Exact structure of output:

```json
{
  "success": true,
  "data": {
    "analyses": [
      {
        "id": "session-uuid",
        "session_id": "session-uuid",
        "project_id": "project-uuid",
        "project_name": "AI Scheduling Assistant",
        "title": "AI Scheduling Assistant",
        "prompt": "normalized source input",
        "detail_level": "long",
        "completion_percentage": 46,
        "generated_sections": ["overview", "executive-dashboard", "problem-analysis", "feature-system"],
        "created_at": "2026-05-05T12:20:00.000Z",
        "result": { "...": "hydrated result object" },
        "summary": {
          "problems_count": 12,
          "features_count": 14,
          "tasks_count": 0
        }
      }
    ],
    "total": 1,
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 1,
      "has_more": false
    }
  }
}
```

- How output is generated:
  1. history query fetches `analysis_sessions`
  2. associated `analysis_sections` are loaded
  3. `buildResultFromSections()` rehydrates a complete result object
  4. counts and completion metadata are derived
  5. if normalized tables do not exist, the route falls back to legacy `analyses`
- Where output is returned/displayed: project history screen, analysis selector, output page entry redirect logic
- How input transforms into output: stored session rows and section rows become a UI-friendly history list
- Edge cases affecting output:
  - anonymous history reads return a success wrapper with HTTP status `401` embedded in the payload message path
  - a deleted normalized session may also conditionally delete its linked legacy row
  - mixed legacy and normalized history is intentionally supported
- Timing / async behavior: section hydration requires additional async reads beyond the session query

### Feature 8: Output Viewer, Section Freshness, and Export

**What it does**

- renders overview and each deep section
- marks sections as generated, remaining, or stale
- exports the current analysis as Markdown, text, print-PDF, or RTF

**Why it exists**

- generated content is only useful if it can be navigated, refreshed selectively, and exported outside the app

**Files/modules involved**

- `app/project/[id]/output/page.tsx`
- `app/project/[id]/output/ProjectOutputClient.tsx`
- `lib/exportUtils.ts`

**Internal working**

- `hasSectionContent()` checks whether a section exists
- `isSectionFresh()` checks PRD completeness, minimum problem/feature richness, and input-hash freshness
- `generateComprehensiveContent()` converts the current result into a single markdown-style document for export
- "PDF" is implemented as HTML opened in a new window and printed
- "docx" is implemented as RTF, downloaded with `.rtf`

**Feature Output Deep Analysis**

- Output produced: section UI, freshness labels, and downloaded files
- Type of output: UI and filesystem download
- Exact structure of output:

Generated status examples:

- `Generated`
- `Remaining`
- `Needs refresh`
- `Generating`

Export examples:

- `my-project-analysis.md`
- `my-project-analysis.txt`
- browser print dialog for PDF
- `my-project-analysis.rtf`

- How output is generated:
  1. client loads current analysis result
  2. section status is derived from metadata and content richness
  3. selected section is rendered using specialized components
  4. export builds a text document from the current result
  5. file blobs or a print window are produced
- Where output is returned/displayed: `/project/[id]/output`
- How input transforms into output: hydrated analysis JSON becomes cards, tables, text sections, and downloadable text formats
- Edge cases affecting output:
  - export is blocked if no analysis is loaded
  - PDF export depends on popup availability
  - the `.docx` label is user-facing, but the actual file is RTF
  - some UI strings in this file contain mojibake for rupee/bullet characters
- Timing / async behavior: export is local/browser-side except for section generation refreshes

### Feature 9: Cost Intake Questionnaire and Cost-Aware Regeneration

**What it does**

- collects structured business, scale, infra, security, and performance assumptions
- injects those assumptions into cost, manpower, and timeline generation

**Why it exists**

- cost and staffing estimates are poor if derived only from a short product brief; this feature lets the user provide cost-sensitive assumptions only when needed

**Files/modules involved**

- `app/project/[id]/output/ProjectOutputClient.tsx`
- `lib/analyzeSectionRoute.ts`
- `types/comprehensive-strategy.ts`
- `lib/sectionedStrategyEngine.ts`

**Feature Output Deep Analysis**

- Output produced: structured `cost_intake` metadata and more tailored planning sections
- Type of output: UI form state, request JSON, metadata update, generated section JSON
- Exact structure of output:

```json
{
  "market_business": {
    "target_market_size": "Large (Rs50Cr+ TAM)",
    "audience_type": "B2B",
    "monetization_model": "Subscription"
  },
  "user_scale": {
    "expected_users": "Growth (10k-100k MAU)",
    "concurrent_users": "Medium (500-5k)"
  },
  "notes": "Need SOC2 readiness before enterprise launch"
}
```

- How output is generated:
  1. user opens cost estimation
  2. form state is stored locally in `CostIntakeState`
  3. on submit the current analysis metadata is updated client-side
  4. `loadSection('cost-estimation', { force: true, costIntake })` is called
  5. the section route sanitizes and stores `metadata.cost_intake`
  6. cost-aware prompts are sent to Gemini
- Where output is returned/displayed: cost questionnaire UI and generated cost/manpower/timeline sections
- How input transforms into output: user planning assumptions become a structured planning context for later AI prompts
- Edge cases affecting output:
  - only cost/manpower/timeline-related requests include cost intake
  - empty intake is allowed; the app falls back to prompt-only estimation
  - malformed intake objects are rejected at the API boundary
- Timing / async behavior: questionnaire capture is local; regeneration is async section generation

### Feature 10: Structured Follow-Up Chat and Persisted Follow-Up History

**What it does**

- lets the user ask analysis-aware follow-up questions
- streams a Gemini answer as markdown while also attempting to recover structured JSON
- saves follow-up sessions and messages when the migration exists

**Why it exists**

- the analysis is not static; the user needs iterative explanation, prioritization, and next-step advice scoped to the active section

**Files/modules involved**

- `app/api/chat-first/route.ts`
- `app/project/[id]/output/ProjectOutputClient.tsx`
- `hooks/useChatStream.ts`
- `scripts/migrations/011_analysis_followup_history.sql`

**Internal working**

- request sends compact context: active section, project info, source input, and a trimmed analysis snapshot
- Gemini is instructed to return JSON only with:
  - `direct_answer`
  - `key_insights`
  - `recommended_action`
  - `risks_notes`
  - `next_step`
- the API converts structured JSON into markdown headings and bullet lists
- SSE chunks stream content progressively; the last chunk may include `structured`
- client saves both the raw assistant markdown and structured payload to Supabase

**Feature Output Deep Analysis**

- Output produced: streamed assistant answer plus optional persisted follow-up history
- Type of output: SSE stream, UI cards, database rows
- Exact structure of output:

SSE chunk example:

```json
{
  "content": "## Direct Answer\nPrioritize the scheduling conflict resolver first...\n",
  "provider": "gemini",
  "progress": 50
}
```

Final SSE chunk example:

```json
{
  "content": "## Next Step\n- Validate the workflow with 5 PMs",
  "provider": "gemini",
  "progress": 100,
  "structured": {
    "direct_answer": "Prioritize the scheduling conflict resolver first.",
    "key_insights": ["Calendar fragmentation is the biggest blocker."],
    "recommended_action": ["Ship Google Calendar first."],
    "risks_notes": ["Enterprise permissions may slow rollout."],
    "next_step": ["Validate with 5 PMs this week."]
  }
}
```

Persisted message row shape:

```json
{
  "session_id": "followup-session-uuid",
  "project_id": "project-uuid",
  "user_id": "user-uuid",
  "role": "assistant",
  "content": "## Direct Answer ...",
  "structured_payload": {
    "direct_answer": "...",
    "key_insights": ["..."],
    "recommended_action": ["..."],
    "risks_notes": ["..."],
    "next_step": ["..."]
  },
  "section_id": "feature-system"
}
```

- How output is generated:
  1. client builds a compact analysis context
  2. `/api/chat-first` builds a strict JSON-only prompt
  3. Gemini returns JSON text
  4. route parses and normalizes the JSON, then formats markdown
  5. SSE chunks are streamed to the client
  6. client persists a follow-up session and two messages per exchange
- Where output is returned/displayed: right-side follow-up panel in the output page
- How input transforms into output: one user question becomes both a human-readable markdown stream and a structured answer card layout
- Edge cases affecting output:
  - if structured parsing fails, fallback uses the raw content as `direct_answer`
  - if migrations are missing, the answer still appears but history persistence fails
  - history loading errors show a dedicated warning
- Timing / async behavior: fully async streaming; UI updates per SSE chunk

### Feature 11: Feedback CRUD and Feedback Hub

**What it does**

- stores manual feedback tied to a project
- filters by status, priority, search, and project
- updates and deletes feedback

**Why it exists**

- ongoing product feedback remains a supported data source even though the main analysis flow is project-input driven

**Files/modules involved**

- `app/api/feedback/route.ts`
- `app/api/feedback/[id]/route.ts`
- `services/feedback.service.ts`
- `app/feedback/FeedbackHubClient.tsx`
- `app/feedback/page.tsx`

**Feature Output Deep Analysis**

- Output produced: feedback rows and filtered hub lists
- Type of output: JSON, UI tables/cards, database rows
- Exact structure of output:

```json
{
  "success": true,
  "data": {
    "feedback": [
      {
        "id": "feedback-uuid",
        "project_id": "project-uuid",
        "title": "Need offline mode",
        "content": "Users in the field cannot rely on connectivity",
        "category": "feature",
        "priority": "high",
        "status": "new",
        "internal_notes": null,
        "source": "manual",
        "created_by": "user-uuid",
        "metadata": {},
        "created_at": "2026-05-05T12:30:00.000Z",
        "updated_at": "2026-05-05T12:30:00.000Z"
      }
    ],
    "total": 1,
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 1
    }
  }
}
```

- How output is generated:
  1. route validates auth
  2. `feedbackService` validates content/category/priority/status
  3. project ownership is checked
  4. rows are created/read/updated/deleted from `feedbacks`
  5. UI filters render the result set
- Where output is returned/displayed: feedback hub and project-linked feedback lists
- How input transforms into output: user-entered feedback becomes a normalized row with ownership and metadata
- Edge cases affecting output:
  - `content` must satisfy min/max length validation
  - ownership is enforced through project joins
  - updates allow partial payloads
- Timing / async behavior: synchronous API CRUD with filtered reads

### Feature 12: External Ingestion and Legacy Auto-Triggered Analysis

**What it does**

- imports simulated Gmail and Slack content
- accepts generic webhook feedback
- on legacy paths, auto-triggers a full analysis after 5 feedback items with debounce/cooldown

**Why it exists**

- it demonstrates continuous feedback ingestion, even though the flagship product flow has shifted toward session-based prompt composition

**Files/modules involved**

- `app/api/integrations/gmail/route.ts`
- `app/api/integrations/slack/route.ts`
- `app/api/webhook/feedback/route.ts`
- `services/ingestion.service.ts`
- `services/trigger.service.ts`
- `services/analysis-engine.service.ts`
- `lib/aiEngine.ts`

**Current status**

- ingestion APIs are live
- Gmail and Slack GET paths are simulated with mock records
- webhook ingestion is real
- the downstream auto-analysis still uses the older full-generation engine

**Feature Output Deep Analysis**

- Output produced: feedback rows, ingestion summaries, and sometimes legacy `analyses` rows
- Type of output: JSON, database changes
- Exact structure of output:

Slack webhook response:

```json
{
  "success": true,
  "data": {
    "feedback_id": "feedback-uuid",
    "message": "Slack message ingested successfully"
  },
  "message": "Success"
}
```

Generic webhook response:

```json
{
  "success": true,
  "data": {
    "feedback_id": "feedback-uuid",
    "project_id": "project-uuid",
    "source": "webhook",
    "message": "Feedback ingested successfully"
  },
  "message": "Success"
}
```

- How output is generated:
  1. route validates payload
  2. `feedbackIngestionService.saveFeedback()` inserts the feedback row
  3. `analysisTriggerService.checkAndTrigger()` inspects threshold/cooldown state
  4. if threshold reached and not cooling down, a debounced analysis run is scheduled
  5. legacy analysis pipeline may save a blob result into `analyses`
- Where output is returned/displayed: integration panel summaries, feedback hub, legacy history
- How input transforms into output: external messages become feedback rows and can eventually become a legacy full analysis blob
- Edge cases affecting output:
  - Gmail GET requires auth and project ownership
  - Slack POST does not authenticate a user; it relies on a valid project id
  - generic webhook verifies project existence, not a signed webhook secret
  - current auto-analysis path is architecturally older than the normalized section-on-demand flow
- Timing / async behavior: ingestion is immediate; auto-analysis is delayed by 10-second debounce and protected by 1-minute cooldown

### Feature 13: Reports and Analytics

**What it does**

- aggregates project, feedback, and analysis/session metrics
- provides distributions, monthly activity, and completion scores

**Why it exists**

- users need portfolio-level visibility, not just a single analysis page

**Files/modules involved**

- `app/api/reports/summary/route.ts`
- `app/reports/ReportsClient.tsx`
- `app/reports/page.tsx`

**Feature Output Deep Analysis**

- Output produced: report summary JSON and charts/tables
- Type of output: JSON and UI visualization
- Exact structure of output:

```json
{
  "success": true,
  "data": {
    "totals": {
      "projects": 4,
      "feedback": 37,
      "analyses": 6,
      "analyzed_projects": 3
    },
    "status_distribution": {
      "new": 12,
      "reviewed": 8,
      "planned": 11,
      "done": 6
    },
    "priority_distribution": {
      "low": 3,
      "medium": 17,
      "high": 12,
      "critical": 5
    },
    "source_distribution": {
      "manual": 14,
      "gmail": 9,
      "slack": 8,
      "webhook": 6
    },
    "monthly_activity": [
      {
        "month": "2026-05",
        "feedback": 18,
        "analyses": 3
      }
    ],
    "project_summaries": [
      {
        "project_id": "project-uuid",
        "project_name": "AI Scheduling Assistant",
        "feedback_count": 9,
        "analysis_count": 2,
        "completion_score": 54,
        "last_activity_at": "2026-05-05T12:40:00.000Z"
      }
    ]
  }
}
```

- How output is generated:
  1. route validates auth
  2. user-owned projects are loaded
  3. feedbacks, legacy analyses, and normalized sessions are queried
  4. distributions and month buckets are derived in memory
  5. project completion is calculated from normalized generated sections or legacy result coverage
- Where output is returned/displayed: `/reports`
- How input transforms into output: stored operational data becomes aggregates suitable for dashboards and CSV export
- Edge cases affecting output:
  - if no projects exist, the route returns zeroed totals
  - if `analysis_sessions` is unavailable, legacy `analyses` data is used
- Timing / async behavior: one authenticated request with parallel aggregate reads

### Feature 14: Profile, Settings, Shortcuts, and Support

**What it does**

- creates/updates user profiles
- stores user settings and AI/dashboard preferences
- displays shortcut help
- lets users submit support tickets

**Why it exists**

- these are necessary product surfaces around the core analysis workflow

**Files/modules involved**

- `app/api/profile/route.ts`
- `app/api/settings/route.ts`
- `app/api/support-tickets/route.ts`
- `app/profile/*`
- `app/settings/*`
- `app/shortcuts/*`
- `app/support/*`
- `utils/avatars.ts`

**Feature Output Deep Analysis**

- Output produced: profile rows, settings rows, support-ticket rows, and settings UI state
- Type of output: JSON, database rows, UI forms
- Exact structure of output:

Profile response example:

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "Maya Rao",
    "job_title": "Senior PM",
    "timezone": "Asia/Calcutta",
    "avatar_url": "https://res.cloudinary.com/...",
    "bio": "Building internal productivity tools"
  }
}
```

Settings response example:

```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "theme": "system",
    "shortcut_hints_enabled": true,
    "notifications": {
      "email": true,
      "product": true,
      "feedback": true,
      "analysis": true
    },
    "dashboard_preferences": {
      "compact_mode": false,
      "default_project_view": "grid",
      "show_welcome_banner": true
    },
    "ai_preferences": {
      "default_output_length": "long",
      "include_cost_estimation": true,
      "include_timeline": true
    }
  }
}
```

- How output is generated:
  1. GET routes fetch-or-create a row if missing
  2. PUT routes sanitize and merge fields
  3. support POST validates subject/message and optional project ownership
  4. Supabase persists the new state
- Where output is returned/displayed: profile/settings/support pages
- How input transforms into output: form submissions become stable user-preference rows consumed by UI pages
- Edge cases affecting output:
  - bio is capped at 500 characters
  - support ticket message must be at least 10 characters
  - optional project selection is ownership-checked
- Timing / async behavior: direct async CRUD, no streaming

### Feature 15: Setup, Health, and Debug Utilities

**What it does**

- checks environment and runtime readiness
- provides setup guidance and partial database bootstrap helpers
- exposes a debug endpoint for AI connectivity

**Why it exists**

- the app depends heavily on Supabase setup and Gemini configuration; onboarding and diagnosis need first-class support

**Files/modules involved**

- `app/api/health/route.ts`
- `app/api/setup/verify/route.ts`
- `app/api/setup/database/route.ts`
- `app/api/setup/projects/route.ts`
- `app/api/setup/projects-auto/route.ts`
- `app/api/setup-db/route.ts`
- `app/api/debug-ai/route.ts`
- `app/setup/page.tsx`
- `scripts/setup.js`
- `scripts/setup-projects-table.sql`
- root setup docs

**Feature Output Deep Analysis**

- Output produced: health JSON, setup checklists, SQL instructions, and AI debug results
- Type of output: JSON, setup UI, console output for the CLI script
- Exact structure of output:

Health response example:

```json
{
  "status": "healthy",
  "timestamp": "2026-05-05T12:45:00.000Z",
  "service": "PMCopilot Authentication System",
  "version": "1.0.0",
  "environment": "development",
  "checks": {
    "environment": true,
    "supabase": true,
    "files": true
  },
  "files": [
    "lib/auth.ts",
    "hooks/useAuth.tsx",
    "lib/supabase/client.ts",
    "lib/supabase/server.ts",
    "proxy.ts"
  ],
  "ready": true,
  "message": "System ready - Visit /setup to complete database setup"
}
```

- How output is generated:
  1. routes inspect env vars and runtime file lists
  2. Supabase reachability is tested with lightweight queries
  3. setup routes return instructions when they cannot safely execute SQL
  4. debug AI route calls the Gemini-only runtime path and returns status
- Where output is returned/displayed: `/setup`, `/api/health`, `/api/setup/verify`, `/api/debug-ai`
- How input transforms into output: runtime configuration becomes human-readable readiness diagnostics
- Edge cases affecting output:
  - `scripts/setup.js` still checks for `middleware.ts` even though the repo uses `proxy.ts`
  - many "auto setup" flows still fall back to manual SQL guidance
- Timing / async behavior: standard request/response; debug AI depends on model latency

### Feature 16: Legacy Workspace, Legacy Chat, and Demo Surfaces

**What it does**

- preserves earlier UI experiments for card dragging, canvas composition, and chat-first workspace flows
- keeps older monolithic strategy rendering and older chat UX available in code

**Why it exists**

- the repository evolved iteratively; older workspaces remain useful reference material and compatibility debt

**Files/modules involved**

- `app/workspace/page.tsx`
- `app/workspace-demo/page.tsx`
- `app/project/[id]/analysis/page.tsx`
- `app/project/[id]/ProjectClient.tsx`
- `components/workspace/*`
- `components/chat/*`
- `components/strategy/*`
- `stores/workspaceStore.ts`
- `stores/chatStore.ts`
- `stores/canvasStore.ts`
- `stores/chatFirstStore.ts`
- `components/chat-first/*`

**Feature Output Deep Analysis**

- Output produced: interactive demo UIs, dragged-card layouts, old chat conversations, older strategy views
- Type of output: UI only
- Exact structure of output:
  - workspace pages render client-side boards and chat panes
  - `components/chat/ChatPanel.tsx` streams free-form markdown from `/api/chat`
  - `components/strategy/ComprehensiveStrategyView.tsx` renders older all-in-one strategy output
- How output is generated:
  1. legacy stores manage client-only state
  2. components render cards, sidebars, and chat panes
  3. some pages use fake seed data or older analysis formats
- Where output is returned/displayed: `/workspace`, `/workspace-demo`, `/project/[id]/analysis`
- How input transforms into output: dropped card or chat input becomes UI-only derived state or a call to the legacy chat endpoint
- Edge cases affecting output:
  - these paths are not the primary production experience
  - some assumptions still reflect earlier monolithic analysis output
  - This behavior is not स्पष्ट from the code. Some demo surfaces may no longer be navigated to from the main product
- Timing / async behavior: mostly client-side state; chat path streams from `/api/chat`

## 5. Feature Deep Dive

### Deep Dive A: Overview-First Analysis Pipeline

1. `ProjectInputClient` composes the final prompt and posts to `/api/analyze`
2. `/api/analyze` validates:
   - JSON body
   - `feedback` presence
   - feedback length
   - optional `project_id`
3. input is normalized and hashed with SHA-256
4. authenticated requests optionally load project context from `projects`
5. cached session reuse is attempted by `prompt_hash + detail_level`
6. on cache miss, `generateOverviewAnalysis()` runs
7. Gemini returns overview-only JSON
8. `analysis_sessions` and `analysis_sections` are persisted
9. client lands on `/project/[id]/output?analysis=<session>`

Resulting state after overview:

- `executive_dashboard` present
- `overview_summary` present
- most deep sections absent
- `generated_sections` contains only overview-related entries

### Deep Dive B: Section-on-Demand Generation

1. user opens a missing or stale section
2. `ProjectOutputClient.loadSection()` builds a request
3. `/api/analyze/[id]/section` resolves aliases and loads the current result
4. input freshness is checked via `input_hash` and per-section hashes
5. `generateDeferredStrategySection()` chooses a section-specific JSON schema
6. Gemini generates only that section
7. `analysis_sections` row is upserted
8. completion percentage is recalculated
9. client re-renders with the updated hydrated result

### Deep Dive C: PRD Generation Behavior

The PRD section is notable because the app explicitly targets a 20-section document. The prompt schema expects:

1. `product_overview`
2. `objectives_goals`
3. `target_users_personas`
4. `problem_statement_structured`
5. `scope`
6. `features_requirements`
7. `user_stories`
8. `user_flow_journey`
9. `wireframes_mockups`
10. `acceptance_criteria`
11. `success_metrics`
12. `risks_assumptions`
13. `dependencies`
14. `timeline_milestones`
15. `release_plan`
16. `constraints`
17. `compliance_legal`
18. `stakeholders`
19. `open_questions`
20. `appendix`

The freshness check for PRD is stronger than many other sections because `ProjectOutputClient` explicitly checks for PRD completeness rather than only presence.

### Deep Dive D: Richness Enforcement

The active section engine tries to avoid thin outputs by enforcing minimum richness:

- problems target 10 to 14 items, with a minimum rich count of 10
- features target 10 to 16 items, with a minimum rich count of 10
- development tasks target 18 to 32 items, with a hard floor of 16

This is one of the clearest code-level expressions of the repo's stated quality bar.

### Deep Dive E: Follow-Up Chat Lifecycle

1. output page prepares a compact context snapshot
2. user submits a question
3. `/api/chat-first` constructs a JSON-only prompt
4. Gemini returns JSON text
5. API parses, normalizes, and reformats as markdown
6. SSE stream sends chunks to the client
7. final structured payload is attached on the last chunk when available
8. client persists the user and assistant messages to follow-up tables
9. sessions appear in the left history rail

### Deep Dive F: Legacy Feedback-Threshold Auto Analysis

1. feedback enters via manual CRUD, Slack, Gmail, or webhook
2. `feedbackIngestionService.getFeedbackStats()` counts items
3. if total feedback >= 5, `analysisTriggerService` schedules a debounced run
4. after debounce and cooldown checks, feedback text is concatenated
5. `analysisEngineService.analyzeFeedback()` calls the older monolithic engine
6. result is saved to legacy `analyses`

This flow is still functional in code but is not the primary user journey.

## 6. User Flow

### Primary Current User Journey

1. open landing page
2. sign up or log in
3. create a project from the dashboard
4. open the project input page
5. type a brief and optionally import supporting material
6. review and edit extracted import text
7. generate the overview
8. arrive on the output page
9. open deeper sections such as PRD, features, roadmap, cost, and timeline
10. optionally fill cost intake to improve planning realism
11. ask structured follow-up questions
12. export the analysis

### Secondary Current Journey

1. open a project with existing session history
2. land directly on the output page or history page
3. reload a previous session
4. generate only missing/stale sections

### Legacy Continuous Feedback Journey

1. feedback arrives from Slack, Gmail, manual input, or webhook
2. feedback accumulates in `feedbacks`
3. threshold/cooldown logic decides whether to run legacy analysis
4. a blob-style analysis is saved in `analyses`

## 7. Inputs and Outputs (Global View)

### Standard API Success Envelope

Most JSON endpoints return:

```json
{
  "success": true,
  "data": {},
  "message": "Optional human-readable message"
}
```

Most JSON errors return:

```json
{
  "success": false,
  "error": "Human-readable error"
}
```

Some routes also return a richer `data` error object via `handleError()`.

### Major Inputs

#### `/api/analyze` input

```json
{
  "feedback": "full composed prompt",
  "project_id": "project-uuid",
  "detail_level": "long",
  "reuse_cached": true,
  "input_import_ids": ["import-uuid"],
  "input_sources": [
    {
      "source_type": "file",
      "input_method": "file_upload",
      "label": "research-notes.pdf",
      "import_id": "import-uuid"
    }
  ],
  "context": {
    "project_name": "AI Scheduling Assistant",
    "project_context": "Internal meeting automation",
    "user_persona": "Operations manager",
    "industry": "B2B SaaS",
    "product_type": "Web app"
  }
}
```

#### `/api/analyze/[id]/section` input

```json
{
  "section": "cost-estimation",
  "analysis_id": "session-uuid",
  "feedback": "original normalized prompt",
  "force": true,
  "detail_level": "long",
  "context": {
    "project_name": "AI Scheduling Assistant",
    "project_context": "Internal meeting automation"
  },
  "cost_intake": {
    "product_type": {
      "product_type": "SaaS platform"
    }
  }
}
```

#### `/api/imports/process` input

```json
{
  "project_id": "project-uuid",
  "source_type": "image",
  "input_method": "screenshot_upload",
  "file_base64": "data:image/png;base64,...",
  "file_name": "competitor-review.png",
  "mime_type": "image/png",
  "file_size": 232123,
  "storage_bucket": "analysis-imports",
  "storage_path": "user/project/file.png",
  "additional_context": "Competitor App Store review screenshots"
}
```

#### `/api/chat-first` input

```json
{
  "message": "What should we ship first?",
  "depth": "medium",
  "section": "feature-system",
  "projectId": "project-uuid",
  "projectName": "AI Scheduling Assistant",
  "projectIdea": "normalized source input",
  "analysis": {
    "executive_dashboard": {
      "key_insight": "..."
    }
  },
  "history": [
    {
      "role": "user",
      "content": "What is the main risk?"
    }
  ]
}
```

### Major Outputs

#### Overview generation output

- `executive_dashboard`
- `overview_summary`
- `metadata`
- saved ids and generation mode

#### Section generation output

- `analysis_id`
- `section`
- `provider`
- `generated`
- `from_cache`
- `section_data`
- updated aggregate `result`

#### Import processing output

- `import.id`
- normalized/raw text
- source and file metadata
- source hash and parser metadata

#### Chat-first output

- SSE chunks with `content`, `provider`, `progress`
- optional `structured` payload in the final chunk

#### Stored data outputs

- rows in `projects`
- rows in `analysis_sessions`
- rows in `analysis_sections`
- rows in `analysis_input_imports`
- rows in `analysis_followup_sessions` and `analysis_followup_messages`
- rows in `feedbacks`, `profiles`, `user_settings`, and `support_tickets`

## 8. Project Structure

### Root Configuration and Meta Files

- `AGENTS.md`: project-specific execution rules
- `package.json`: dependencies, scripts, Node requirement
- `package-lock.json`: dependency lockfile
- `tsconfig.json`: strict TS config with `@/*` path alias
- `next.config.js`: strict mode and server action body size limit
- `postcss.config.js`: Tailwind/PostCSS setup
- `tailwind.config.ts`: Tailwind theme/content config
- `vercel.json`: deployment commands, region, route max durations, API no-store headers
- `proxy.ts`: route guard and auth refresh middleware replacement
- `.env.example`: public environment contract
- `.eslintrc.json`, `.gitignore`, `.nvmrc`, `next-env.d.ts`

### Root Documentation and Historical Notes

- `README.md`
- `README_AUTOMATED.md`
- `QUICKSTART.md`
- `QUICK_START.md`
- `SETUP.md`
- `START_HERE.md`
- `DATABASE_SETUP.md`
- `SUPABASE_SETUP_STEP_BY_STEP.md`
- `AUTH_IMPLEMENTATION.md`
- `ARCHITECTURE.md`
- `DEPLOYMENT.md`
- `VERCEL_DEPLOYMENT_PLAN.md`
- `COMPREHENSIVE_PRODUCT_ANALYSIS.md`
- `SUMMARY.md`
- `FIX_SUMMARY.md`
- `ENHANCEMENT_SUMMARY.md`
- `ENHANCED_IMPLEMENTATION_GUIDE.md`
- `IMPLEMENTATION_SUMMARY.md`
- `IMPLEMENTATION_STATUS.md`
- `TRANSFORMATION_COMPLETE.md`
- `REALTIME_FEEDBACK_SYSTEM_COMPLETE.md`
- `ANALYSIS_UI_ARCHITECTURE.md`
- `ANALYSIS_UI_BUILD_SUMMARY.md`
- `ANALYSIS_UI_INTEGRATION.md`
- `ANALYSIS_UI_README.md`
- `CLAUDE_SETUP.md`

These files are useful historical context, but several describe older architecture and should not be treated as the single source of truth over the runtime code.

### Root Miscellaneous Files

- `INTEGRATION_EXAMPLE.tsx`: example/integration artifact
- `supabase-chat-history-migration.sql`: historical SQL related to chat history
- `test-gemini.js`
- `test-gemini-models.js`
- `dev.log`

The two Gemini test files are placeholders rather than meaningful automated tests.

### `app/`

- `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- auth pages in `app/(auth)/...`
- callback route in `app/auth/callback/route.ts`
- dashboard, analysis selector, setup, workspace, workspace-demo, ai-workspace, feedback, profile, reports, settings, shortcuts, support pages
- project routes:
  - `app/project/[id]/page.tsx`
  - `ProjectInputClient.tsx`
  - `ProjectClient.tsx`
  - `analysis/*`
  - `history/*`
  - `output/*`
- API routes under `app/api/*`:
  - `analyze/*`
  - `chat/*`
  - `chat-first/*`
  - `projects/*`
  - `feedback/*`
  - `imports/process`
  - `integrations/gmail`
  - `integrations/slack`
  - `webhook/feedback`
  - `reports/summary`
  - `profile`
  - `settings`
  - `support-tickets`
  - `health`
  - `debug-ai`
  - `setup/*`
  - `auth/profile`

### `components/`

- `analysis/*`: legacy and current analysis renderers
- `chat/*`: legacy chat panel
- `chat-first/*`: chat-first layout pieces
- `dashboard/*`: shell, sidebar, cards, creation dialogs, setup warning
- `feedback/*`: feedback and integration panels
- `workspace/*`: canvas/chat workspace surfaces
- `dnd/*`: drag and drop helpers
- `cards/*`: problem/feature/task/prompt cards
- `public/*`: landing and auth-shell primitives
- `shared/AppLogo.tsx`
- `strategy/*`: older comprehensive strategy renderer
- `ui/*`: toast and skeleton loaders
- `AnalysisProgressIndicator.tsx`

### `hooks/`

- `useAuth.tsx`
- `useChatStream.ts`
- `useProjects.ts`
- `useRealtimeFeedback.ts`
- `useUserProfile.ts`
- `index.ts`

### `lib/`

- `config.ts`
- `geminiSectionClient.ts`
- `sectionedStrategyEngine.ts`
- `analysisSessionStore.ts`
- `analyzeSectionRoute.ts`
- `aiEngine.ts`
- `comprehensiveStrategyEngine.ts`
- `fallbackAnalysis.ts`
- `jsonValidator.ts`
- `errorHandler.ts`
- `logger.ts`
- `auth.ts`
- `appUrl.ts`
- `dateFormat.ts`
- `exportUtils.ts`
- `localization.ts`
- `puterClient.ts`
- `supabaseClient.ts`
- `supabase/*`

### `services/`

- `analysis-engine.service.ts`
- `feedback.service.ts`
- `ingestion.service.ts`
- `project.service.ts`
- `trigger.service.ts`

### `stores/`

- `chatFirstStore.ts`
- `workspaceStore.ts`
- `chatStore.ts`
- `canvasStore.ts`

### `types/`

- `analysis.ts`
- `enhanced-analysis.ts`
- `comprehensive-strategy.ts`
- `project.ts`
- `workspace.ts`
- `index.ts`

### `utils/`

- `constants.ts`
- `helpers.ts`
- `avatars.ts`

### `public/`

- `manifest.json`
- `websiteicon.png`

### `scripts/`

- `setup.js`
- `setup-projects-table.sql`
- `migrations/add_chat_support.sql`
- `migrations/004_fix_schema_v3.sql`
- `migrations/005_dashboard_product_upgrade.sql`
- `migrations/006_non_destructive_persistence_upgrade.sql`
- `migrations/007_project_delete_fk_cascade_fix.sql`
- `migrations/008_analysis_sessions_finalize_and_reset.sql`
- `migrations/009_analysis_history_titles_and_actions.sql`
- `migrations/010_analysis_input_imports.sql`
- `migrations/011_analysis_followup_history.sql`

### `lib/supabase/migrations/`

- `003_feedbacks_table.sql`

### Local/Generated Directories Present in the Workspace

- `.git`
- `.next`
- `.vscode`
- `node_modules`

`.next`, `node_modules`, and local `.env.local` are environment-specific artifacts rather than public product source.

## 9. Security and Validation

### Authentication

- server pages use `requireServerAuth()` for protected routes
- `proxy.ts` refreshes auth cookies and redirects based on route type
- older integration routes sometimes use `lib/supabaseClient.ts` instead of the newer SSR helpers

### Authorization

- project ownership is checked in project, feedback, imports, and support flows
- analysis session queries scope by `user_id`
- follow-up history scopes by `project_id` and analysis/session linkage

### Input Validation

- project name length and description length
- feedback content length and allowed enum values
- analysis input min/max length
- UUID validation for project/analysis/import identifiers
- import size capped at 4 MB
- import mime type allowlist
- support-ticket subject/message validation

### Data Protection

- user data is stored in Supabase with RLS migrations
- storage bucket policies are created for import uploads in migration `010_analysis_input_imports.sql`
- auth state is cookie-based through Supabase SSR helpers

### Security Gaps and Caveats

- generic webhook ingestion does not implement signed webhook verification
- Slack POST path accepts `project_id` without proving caller identity
- legacy provider config for Groq/Claude still exists in code, though current runtime blocks paid fallback use
- local `.env.local` should be treated as secret; this document uses `.env.example` as the safe public contract

## 10. Data Handling

### Core Tables and Their Roles

- `projects`: root entity for all product work
- `profiles`: user profile data
- `user_settings`: preferences
- `feedbacks`: ongoing product feedback
- `analyses`: legacy blob-style analysis table
- `analysis_sessions`: normalized analysis root
- `analysis_sections`: per-section persisted output
- `analysis_input_imports`: imported source material and extracted text
- `analysis_followup_sessions`: saved follow-up conversation headers
- `analysis_followup_messages`: saved conversation messages
- `support_tickets`: support submissions
- legacy `chat_sessions` and `analysis_chat_messages`: older chat history schema

### Data Transformations

- binary media -> extracted text -> normalized text -> import record
- final prompt -> overview JSON -> section rows
- analysis section rows -> hydrated result object
- feedback records -> combined feedback text -> legacy blob analysis
- structured Gemini JSON -> markdown stream -> stored structured follow-up payload

### Retrieval Patterns

- normalized history prefers `analysis_sessions + analysis_sections`
- legacy fallbacks use `analyses.result`
- reports load multiple tables in parallel and derive aggregates in memory

### Hashing and Freshness

- source input is SHA-256 hashed
- section rows track `input_hash`
- result metadata tracks:
  - `input_hash`
  - `section_input_hashes`
  - `stale_sections`

This allows the app to know whether a section is outdated relative to the current source input.

## 11. Edge Cases and Error Handling

- invalid JSON bodies return validation errors
- anonymous history access returns an empty history payload with an auth message
- missing tables often return guidance to run migrations rather than hard-crashing silently
- import extraction failure is surfaced as a user-facing validation error
- follow-up chat still works even if follow-up persistence tables are missing
- section generation falls back from `/api/analyze/[id]/section` to `/api/analyze/section` if needed
- delete project logic manually cleans child rows if FK cleanup is incomplete
- overview regeneration is required when source input changed and the user requests non-deferred overview sections
- some older docs, setup scripts, and UI strings are out of sync with the current runtime

## 12. Test Scenarios

There is no automated `test` script in `package.json`. The repo currently relies on typecheck/lint/build plus manual scenario coverage.

### Recommended Manual Test Cases

1. Sign up, log in, and verify `/dashboard` access control.
2. Create, edit, and delete a project.
3. Generate overview from typed text only.
4. Import a WhatsApp paste and confirm normalized transcript formatting.
5. Import an image and confirm Gemini-based text extraction appears in the composer.
6. Generate overview and verify only overview-related sections are initially present.
7. Generate `problem-analysis` and verify 10 or more meaningful items are returned.
8. Generate `feature-system` and verify 10 or more meaningful items are returned.
9. Generate PRD and confirm all 20 PRD sections are present.
10. Submit cost intake and regenerate cost estimation.
11. Ask a follow-up question and verify structured cards plus streamed markdown.
12. Reload the output page and confirm follow-up history persists when migration `011` is applied.
13. Export to Markdown, text, print-PDF, and RTF.
14. Create feedback manually and filter by status/priority/search.
15. Ingest webhook feedback and verify new feedback rows appear.
16. Accumulate 5 feedbacks and verify the legacy trigger path schedules analysis.
17. Open `/api/health` and `/api/setup/verify` on a configured environment.

### Existing Test Artifacts

- `test-gemini.js`: placeholder
- `test-gemini-models.js`: placeholder

These do not currently provide meaningful automated coverage.

## 13. Unique and Advanced Features

- **Section-on-demand AI generation**: the clearest architectural differentiator; the app avoids generating the entire strategy at once.
- **Richness enforcement**: code-level minimum item counts for problems, features, and tasks.
- **Normalized section persistence**: `analysis_sessions` plus `analysis_sections` allows partial regeneration and completion tracking.
- **Input freshness tracking**: hash-based stale section detection.
- **Multimodal import normalization**: text, screenshots, audio, and documents all converge into the same prompt pipeline.
- **Structured follow-up chat**: Gemini is used for JSON-first answers that are also rendered as streamed markdown.
- **Backward-compatible dual data model**: normalized sessions coexist with legacy `analyses` blobs so older data still loads.

## 14. Setup and Installation

### Prerequisites

- Node.js `>=20.19.0`
- Supabase project
- at least one Gemini API key

### Environment

Create `.env.local` using `.env.example` as the public template. Required public/server values from the example:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
```

Optional:

- `NEXT_PUBLIC_IMPORTS_BUCKET`
- `GEMINI_API_KEYS`
- `GEMINI_API_KEY_1..N`
- `SUPABASE_SERVICE_ROLE_KEY`

### Install and Run

```bash
npm install
npm run dev
```

### Database Setup

Apply the relevant SQL migrations in Supabase. At minimum, current product flows depend on:

- projects
- profiles
- user_settings
- analysis_sessions
- analysis_sections
- analysis_input_imports
- analysis_followup_sessions
- analysis_followup_messages

The repo provides:

- `scripts/setup-projects-table.sql`
- `scripts/migrations/*.sql`
- `lib/supabase/migrations/003_feedbacks_table.sql`

### Verification

Useful routes:

- `/api/health`
- `/api/setup/verify`
- `/setup`

## 15. How to Use

### Current Recommended Usage

1. sign in
2. create a project
3. open the project input page
4. add a typed product brief
5. optionally import supporting material
6. review and edit extracted import text
7. choose output depth
8. generate the overview
9. open the output page and generate sections as needed
10. optionally answer the cost intake questions for better planning estimates
11. ask follow-up questions in the side panel
12. export the result

### Example End-to-End Input

```text
We are building an AI scheduling assistant for internal enterprise teams.
Main problems: too many back-and-forth emails, timezone mistakes, repeated rescheduling.
Target users: PMs, recruiters, chiefs of staff.
Must integrate with Google Calendar first.
Need clear MVP scope, cost, and team plan.
```

### Expected High-Level Output

- overview with strategy and market framing
- problem list with 10+ issues
- feature system with 10+ features
- PRD with 20 sections
- system design
- task list
- roadmap
- staffing, resource, cost, timeline, and impact sections
- structured follow-up Q&A

## 16. Future Improvements

- remove or quarantine dormant provider code for Groq/Claude/Puter to reduce confusion
- add signed verification for webhook and Slack-style ingestion
- add real automated tests instead of placeholder scripts
- replace browser-print PDF and RTF pseudo-DOCX with true export libraries
- unify old and new auth/profile APIs
- consolidate legacy chat/workspace surfaces or clearly label them as archived/demo
- formalize schema validation with Zod for request/response boundaries
- improve setup automation so fewer flows depend on manual SQL
- clean mojibake strings across legacy and export-related UI
- migrate or retire the older auto-feedback analysis pipeline so all analysis paths use the normalized sectioned architecture

## Appendix A: Verification Snapshot

Verification run executed on 2026-05-05 from `d:\projects\pmcopilot`.

- `npm run type-check`: passed (`tsc --noEmit`)
- `npm run lint`: passed with warnings only, `462` warnings and `0` errors
- `npm run build`: passed; Next.js production build completed successfully and enumerated all App Router routes
- automated tests: not run because no `test` script is defined in `package.json`

Most lint noise comes from:

- widespread `@typescript-eslint/no-explicit-any`
- unused variables in legacy/demo files
- a few `react-hooks/exhaustive-deps` and `import/no-anonymous-default-export` warnings

## Appendix B: File Change Summary

- Added `description.md`

## Appendix C: Remaining Edge Cases and Technical Debt

- legacy and current analysis systems coexist, increasing cognitive load
- setup docs and setup scripts still contain references from older architecture stages
- generic webhook ingestion lacks a signature/auth mechanism
- some exported/UI strings show mojibake instead of clean symbols
- "Word Document" export currently produces RTF, not DOCX
- This behavior is not स्पष्ट from the code. Some historical markdown docs may no longer accurately describe the active production flow
