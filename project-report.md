# PMCopilot - Complete Product Understanding Document

## 1. Project Overview

PMCopilot is a Next.js App Router product planning application that converts messy product input (typed briefs, imported files/media, and ongoing feedback) into structured product strategy outputs. Its **active architecture is overview-first + section-on-demand generation**, with Gemini free-tier models only.

### What problem this product solves

Teams usually have fragmented product context: idea notes, chat snippets, screenshots, docs, and ad-hoc feedback. PMCopilot solves this by:

1. Normalizing mixed inputs into analysis-ready text
2. Generating a high-signal overview first
3. Expanding deeper sections only when requested (token/cost safe)
4. Persisting section-level results for reuse/regeneration
5. Supporting iterative follow-up chat grounded in generated analysis

### Target users

- Product managers
- Founders and early-stage operators
- Product/engineering teams planning roadmap, scope, cost, and execution

### Why this product exists

The codebase is intentionally optimized for:
- **Gemini free-tier constraints**
- **No paid fallback in active runtime flow**
- **Per-section generation instead of one monolithic generation**
- **Hash-based stale detection and selective refresh**

---

## 2. Complete Product Flow

### End-to-end user journey

1. User signs up/logs in (Supabase Auth).
2. User lands on dashboard and creates/selects a project.
3. User opens project input page (`/project/[id]`).
4. User adds manual text and optional imported sources.
5. Imports are processed by `/api/imports/process` into normalized text and stored in `analysis_input_imports`.
6. User edits merged final prompt and selects output length/depth.
7. User triggers generation via `/api/analyze`:
   - overview + executive dashboard generated
   - `analysis_sessions` + `analysis_sections` persisted
8. User is redirected to `/project/[id]/output`.
9. User opens sections (problem analysis, features, PRD, system design, tasks, roadmap, manpower, resources, cost, timeline, impact).
10. Missing/stale section is generated via `/api/analyze/[id]/section`.
11. User can force regeneration (including cost-intake-enhanced regeneration).
12. User asks follow-up questions in chat panel (`/api/chat-first` SSE streaming + optional persistence).
13. User exports current analysis (Markdown, TXT, print-PDF path, RTF).
14. User revisits history/analysis selector and reuses cached sessions.

---

## 3. Complete Feature Breakdown

## Feature 1 - Authentication and route protection
- **Purpose:** User-scoped access to projects/analyses/settings.
- **User interaction:** login/signup, protected route navigation.
- **Core files:** `app/(auth)/*`, `app/auth/callback/route.ts`, `proxy.ts`, `lib/supabase/*`, `hooks/useAuth.tsx`.
- **Input:** email/password or OAuth callback code.
- **Output:** session cookies, redirects, authenticated page access.
- **Storage:** Supabase auth + `profiles`.
- **Edge/error:** unauthenticated access redirects to `/login`; callback failures redirect with error query.

## Feature 2 - Project management
- **Purpose:** Root container for all analysis-related data.
- **User interaction:** create/edit/delete/search projects on dashboard.
- **Core files:** `app/api/projects/*`, `services/project.service.ts`, `app/dashboard/*`, `hooks/useProjects.ts`.
- **Output schema:** project row (`id`, `user_id`, `name`, `description`, timestamps).
- **Storage:** `projects`.
- **Edge/error:** ownership enforced; delete handles dependent data paths.

## Feature 3 - Multi-source input composer
- **Purpose:** Build one final prompt from typed input + imports.
- **User interaction:** edit manual prompt, import snippets, merged prompt.
- **Core files:** `app/project/[id]/ProjectInputClient.tsx`.
- **Output:** final `feedback` string + metadata (`input_import_ids`, `input_sources`, context).
- **Edge/error:** empty/too-short final prompt blocked.

## Feature 4 - Import processing (text/file/image/audio/social)
- **Purpose:** Convert mixed media into normalized analysis text.
- **Core API:** `POST /api/imports/process`.
- **Core files:** `app/api/imports/process/route.ts`, migration `010_analysis_input_imports.sql`.
- **Supported sources:** `text`, `file`, `image`, `audio`, `whatsapp`, `linkedin`, `instagram`.
- **Output:** persisted import object (`normalized_text`, `raw_text`, metadata/hash, file info).
- **Storage:** `analysis_input_imports` (+ optional Storage bucket path).
- **Edge/error:** invalid source, unsupported mime, oversized input, too-short normalized text, missing migration table.

## Feature 5 - Overview generation
- **Purpose:** Generate only overview/executive dashboard first.
- **Core API:** `POST /api/analyze`.
- **Core files:** `app/api/analyze/route.ts`, `lib/sectionedStrategyEngine.ts`, `lib/analysisSessionStore.ts`.
- **Output:** overview result + metadata + `saved_id` + generation mode.
- **Storage:** `analysis_sessions` + `analysis_sections` (`overview`, `executive-dashboard`).
- **Edge/error:** input validation, Gemini pool/config errors, auth-aware persistence behavior.

## Feature 6 - Deferred section generation
- **Purpose:** Generate one deep section at a time.
- **Core API:** `POST /api/analyze/[id]/section` (and `/api/analyze/section` compatibility path).
- **Core files:** `lib/analyzeSectionRoute.ts`, `lib/sectionedStrategyEngine.ts`.
- **Input:** `section`, `analysis_id`, optional `force`, optional `cost_intake`.
- **Output:** `{ analysis_id, section, provider, generated, from_cache, section_data, result }`.
- **Storage:** upsert in `analysis_sections`; session progress sync.
- **Edge/error:** invalid section alias, stale handling, overview re-gen conflict when source input changed.

## Feature 7 - Session history, retrieval, reuse
- **Purpose:** Reopen prior work and reduce duplicate generation.
- **Core API:** `GET /api/analyze`, `GET /api/analyze/[id]`, `DELETE /api/analyze/[id]`.
- **Internal logic:** prompt hash + depth reuse (`cached-overview` mode).
- **Hydration:** `buildResultFromSections(...)` rebuilds result from section rows.
- **Edge/error:** normalized-table fallback to legacy `analyses`.

## Feature 8 - Output UI, freshness, and regeneration controls
- **Purpose:** Display generated sections and freshness state.
- **Core files:** `app/project/[id]/output/page.tsx`, `ProjectOutputClient.tsx`.
- **Behavior:** section loading states, stale checks, per-section generation triggers, force-regenerate path.
- **Edge/error:** section loading collisions prevented; failures surface toast/error state.

## Feature 9 - Cost intake + cost-aware generation
- **Purpose:** Improve realism of cost/manpower/timeline outputs.
- **Input object:** structured `cost_intake` buckets (market, scale, infra, integrations, security, etc.).
- **Core files:** `ProjectOutputClient.tsx`, `lib/analyzeSectionRoute.ts`.
- **Output effect:** cost-related sections generated using intake-enhanced context.
- **Edge/error:** malformed `cost_intake` rejected at API boundary.

## Feature 10 - Structured follow-up chat
- **Purpose:** Ask contextual follow-up questions on generated analysis.
- **Core API:** `POST /api/chat-first` (SSE stream).
- **Structured schema:** `direct_answer`, `key_insights[]`, `recommended_action[]`, `risks_notes[]`, `next_step[]`.
- **Core files:** `app/api/chat-first/route.ts`, `ProjectOutputClient.tsx`.
- **Storage:** `analysis_followup_sessions`, `analysis_followup_messages`.
- **Edge/error:** if persistence tables missing, answer still streams but history save/load fails gracefully.

## Feature 11 - Export system
- **Purpose:** Download/share analysis.
- **Formats:** `.md`, `.txt`, print/PDF workflow, `.rtf` (doc-like).
- **Core files:** `ProjectOutputClient.tsx`, `lib/exportUtils.ts`.
- **Output generation:** `generateComprehensiveContent()` builds unified export content from in-memory result.
- **Edge/error:** no analysis -> export blocked; popup blockers affect print flow.

## Feature 12 - Feedback hub
- **Purpose:** Track and manage ongoing feedback.
- **Core API:** `app/api/feedback/*`.
- **Core files:** `services/feedback.service.ts`, `app/feedback/*`.
- **Output:** feedback CRUD payloads (status/priority/category/source filters).
- **Storage:** `feedbacks`.

## Feature 13 - Integrations/webhook ingestion + legacy trigger path
- **Purpose:** Import Slack/Gmail/webhook feedback; optionally trigger legacy monolithic analysis path.
- **Core files:** `app/api/integrations/*`, `app/api/webhook/feedback/route.ts`, `services/ingestion.service.ts`, `services/trigger.service.ts`, `services/analysis-engine.service.ts`.
- **Output:** ingested feedback rows, optional legacy `analyses` record.
- **Status:** still present, but not the primary active product flow.

## Feature 14 - Reports
- **Purpose:** Portfolio-level metrics and distributions.
- **Core API:** `GET /api/reports/summary`.
- **Core files:** `app/reports/*`, `app/api/reports/summary/route.ts`.
- **Output:** totals, status/priority/source distributions, monthly activity, project summaries.

## Feature 15 - Profile/settings/support/setup/health/debug
- **Purpose:** User-level configuration and operational readiness.
- **Core APIs:** `/api/profile`, `/api/settings`, `/api/support-tickets`, `/api/setup/*`, `/api/health`, `/api/debug-ai`.
- **Storage:** `profiles`, `user_settings`, `support_tickets`.

## Feature 16 - Legacy workspace/chat/demo surfaces
- **Purpose:** Preserve earlier UX paradigms and compatibility.
- **Core areas:** `app/workspace*`, `components/workspace/*`, `app/project/[id]/analysis/*`, legacy `/api/chat`.
- **Status:** secondary/legacy compared to current output-centric flow.

---

## 4. Feature Output Analysis

### A. Overview generation output (`POST /api/analyze`)
```json
{
  "success": true,
  "data": {
    "executive_dashboard": {
      "idea_expansion": "...",
      "key_insight": "...",
      "innovation_score": 8.2,
      "market_opportunity": "...",
      "complexity_level": "Medium",
      "recommended_strategy": "..."
    },
    "overview_summary": {
      "product_name": "...",
      "one_line_summary": "...",
      "core_value_props": ["..."],
      "critical_unknowns": ["..."]
    },
    "metadata": {
      "input_hash": "sha256",
      "generated_sections": ["overview", "executive-dashboard"],
      "saved_analysis_id": "session-uuid",
      "session_id": "session-uuid",
      "session_title": "...",
      "detail_level": "long",
      "provider": "gemini"
    },
    "saved_id": "session-uuid",
    "generation_mode": "section-on-demand-overview"
  }
}
```
- **Generated by:** `generateOverviewAnalysis`.
- **Rendered in:** Output page overview section/cards.
- **Stored in:** `analysis_sessions`, `analysis_sections`.

### B. Deferred section output (`POST /api/analyze/[id]/section`)
```json
{
  "success": true,
  "data": {
    "analysis_id": "session-uuid",
    "section": "problem-analysis",
    "provider": "gemini",
    "generated": true,
    "from_cache": false,
    "section_data": [...],
    "result": { "...full hydrated result..." }
  }
}
```
- **Generation step:** section alias resolve -> stale/cache check -> deferred prompt -> section upsert.
- **Regeneration logic:** `force` and hash freshness (`input_hash`, `section_input_hashes`, `stale_sections`).

### C. PRD output structure
PRD prompt requires **20 sections** (from deferred PRD schema), including:
1. product_overview
2. objectives_goals
3. target_users_personas
4. problem_statement_structured
5. scope
6. features_requirements
7. user_stories
8. user_flow_journey
9. wireframes_mockups
10. acceptance_criteria
11. success_metrics
12. risks_assumptions
13. dependencies
14. timeline_milestones
15. release_plan
16. constraints
17. compliance_legal
18. stakeholders
19. open_questions
20. appendix

### D. Import processing output (`POST /api/imports/process`)
- Returns persisted import metadata and normalized text.
- Fields include: `id`, `source_type`, `import_method`, `title`, `normalized_text`, `raw_text`, `file_name`, `mime_type`, `storage_path`, `storage_bucket`, `metadata`, `created_at`.

### E. Follow-up chat stream output (`POST /api/chat-first`)
SSE chunks:
```json
{ "content": "## Direct Answer\n...", "provider": "gemini", "progress": 34 }
```
Final chunk may include:
```json
{
  "content": "...",
  "provider": "gemini",
  "progress": 100,
  "structured": {
    "direct_answer": "...",
    "key_insights": ["..."],
    "recommended_action": ["..."],
    "risks_notes": ["..."],
    "next_step": ["..."]
  }
}
```
- **Rendered as:** markdown + structured UI blocks.
- **Stored as:** assistant/user messages in follow-up tables.

### F. Export output
- Markdown: full analysis text
- TXT: markdown-stripped plain text
- PDF path: browser print window from generated HTML
- DOC-like: RTF file (`.rtf`)

### G. Reports output
- Aggregates: totals, distributions, monthly activity, per-project summary/completion.

---

## 5. AI System Working

### Model/provider controls
- `lib/config.ts` enforces Gemini free-tier model policy.
- Active runtime uses `lib/geminiSectionClient.ts`.

### Prompt construction
- **Overview prompt:** high-level executive + summary schema.
- **Deferred section prompt:** section-specific schema and depth/richness target.
- **Chat-first prompt:** strict JSON schema with section guidance and depth style.

### Section-on-demand logic
- Overview generated first.
- Deferred sections generated only when requested.
- Non-deferred sections served from existing overview context.

### Token/runtime optimization
- Depth config (`short|medium|long|extra-long`) controls token budgets/timeouts.
- Chat-first and analyze endpoints cap token budgets per depth.

### Context handling
- Context includes project metadata + normalized source input + prior generated result.
- Chat uses compact analysis snapshot + short recent history window.

### Richness enforcement
- Engine targets rich outputs (problems/features/tasks have minimum/target ranges).
- Quality constraints are baked into section prompt behavior and freshness checks.

### Cache reuse
- `/api/analyze` reuses matching `analysis_sessions` by `prompt_hash + detail_level`.
- Returns `generation_mode: cached-overview` when reused.

### Stale detection and regeneration
- Input hash comparison drives stale section detection.
- Metadata fields used: `input_hash`, `section_input_hashes`, `stale_sections`.
- `force` bypasses freshness cache.

---

## 6. Input Processing System

### Supported input paths
- Manual typed text
- File uploads/pastes
- Social text (WhatsApp/LinkedIn/Instagram)
- Binary media (image/audio/PDF/Word)

### Processing pipeline
1. Validate auth + project ownership
2. Validate source type and payload format
3. For binary: extract text (direct decode or Gemini multimodal extraction)
4. Normalize text by source-specific parser
5. Reject low-quality/too-short normalized output
6. Hash normalized content
7. Persist import row
8. Link imports to `analysis_session_id` after overview generation

### Source-specific normalization
- WhatsApp: chat-line normalization
- LinkedIn/Instagram: cleaned content extraction
- Generic text/doc/csv/json: normalized whitespace + parser fallback

### Failure behavior
- Unsupported mime/source -> validation error
- Extraction failure -> surfaced error
- Missing `analysis_input_imports` table -> migration guidance error

---

## 7. Database Architecture

## Core tables and purpose

| Table | Purpose | Key relations |
|---|---|---|
| `projects` | Root project entity | `user_id` owner; parent for analyses/feedback/imports/support |
| `profiles` | User profile | `id` references auth user |
| `user_settings` | User preferences | one row per user |
| `feedbacks` | Product feedback records | `project_id` + user-scoped flows |
| `analyses` | Legacy blob analysis store | compatibility fallback |
| `analysis_sessions` | Normalized analysis root/session | links project/user and optional `legacy_analysis_id` |
| `analysis_sections` | Per-section generated content | FK to `analysis_sessions` |
| `analysis_input_imports` | Imported source material + normalized text | FK to project/user/session |
| `analysis_followup_sessions` | Follow-up chat session headers | FK to project/user/session/legacy |
| `analysis_followup_messages` | Follow-up chat messages | FK to follow-up session/project/user |
| `support_tickets` | User support requests | optional project relation |

### Relationship flow
`projects -> analysis_sessions -> analysis_sections`  
`projects -> analysis_input_imports`  
`projects -> analysis_followup_sessions -> analysis_followup_messages`  
`projects -> feedbacks`  
`projects -> analyses (legacy)`

### Data movement pattern
Input/imports -> normalized prompt -> overview/session -> deferred sections -> chat follow-up -> export/report.

### Security model
- RLS policies on key tables (sessions, sections, imports, follow-up tables).
- User ownership enforced in route logic and DB policies.

---

## 8. API System

## Most important APIs

| Endpoint | Purpose | Request (key fields) | Response (key fields) | DB ops |
|---|---|---|---|---|
| `POST /api/analyze` | Generate overview | `feedback`, `project_id`, `detail_level`, sources | overview + metadata + ids + mode | insert/update session/sections |
| `GET /api/analyze` | History list | `project_id`, pagination | analyses/session summaries | read sessions/sections, fallback legacy |
| `GET /api/analyze/[id]` | Fetch one analysis | id path | hydrated analysis | read session+sections or legacy |
| `DELETE /api/analyze/[id]` | Delete analysis | id path | success envelope | delete session (and related rows) |
| `POST /api/analyze/[id]/section` | Generate one section | `section`, `force`, `cost_intake` | section payload + full result | upsert section + sync session |
| `POST /api/imports/process` | Process import | source + text/file payload | persisted import row | insert import |
| `POST /api/chat-first` | Follow-up answer stream | question + section + analysis snapshot | SSE markdown chunks (+structured final) | none directly; client persists |
| `GET /api/chat-first` | Endpoint health metadata | none | provider/mode/format | none |
| `GET/POST /api/projects` | Project list/create | filters or project payload | projects list / created project | CRUD `projects` |
| `GET/PUT/DELETE /api/projects/[id]` | Single project ops | id + payload | project/success | CRUD `projects` |
| `GET/POST /api/feedback` | Feedback list/create | filters or feedback payload | feedback list/item | CRUD `feedbacks` |
| `GET/PATCH/DELETE /api/feedback/[id]` | Single feedback ops | id + patch | feedback/success | CRUD `feedbacks` |
| `GET /api/reports/summary` | Aggregated reports | optional scope | totals + distributions + project summaries | read multiple tables |
| `GET/PUT /api/profile` | User profile | profile patch | profile row | CRUD `profiles` |
| `GET/PUT /api/settings` | User settings | settings patch | settings row | CRUD `user_settings` |
| `GET/POST /api/support-tickets` | Support tickets | optional project + ticket content | ticket list/item | CRUD `support_tickets` |
| `GET/POST /api/integrations/gmail` | Gmail integration path | project/token params | ingestion summary | feedback ingestion paths |
| `GET/POST /api/integrations/slack` | Slack integration path | project/payload | ingestion summary | feedback ingestion paths |
| `POST /api/webhook/feedback` | Generic webhook ingest | feedback payload | success + feedback id | insert feedback (+legacy trigger path) |
| `GET /api/health` | Runtime health check | none | status/readiness | lightweight checks |
| `GET/POST /api/debug-ai` | AI diagnostics | optional payload | model/provider diagnostics | none |
| `GET /api/setup/verify` | Setup verification | none | checks + next steps | setup checks |
| `GET/POST /api/setup/database` | DB setup helper | setup payload | readiness/setup result | setup ops |
| `GET/POST /api/setup/projects*` | Projects table setup helper | none/payload | setup result | setup ops |

---

## 9. Frontend System

### Main pages
- Landing: `app/page.tsx`
- Auth: `app/(auth)/login`, `signup`
- Dashboard: `app/dashboard/*`
- Project input: `app/project/[id]/page.tsx` + `ProjectInputClient`
- Output: `app/project/[id]/output/page.tsx` + `ProjectOutputClient`
- History: `app/project/[id]/history/*`
- Feedback: `app/feedback/*`
- Reports: `app/reports/*`
- Profile/Settings/Support/Shortcuts/Setup pages

### Rendering and state flow
- Server page checks auth + loads project/session seeds.
- Client component holds interaction state (active section, loading flags, chat panel, export menu, cost intake).
- Section load triggers API call and merges updated result.
- Hydration uses `buildResultFromSections` to reconstruct result from section rows.

### Section loading behavior
- Generated/missing/stale status tracked client-side from metadata + content.
- Per-section request prevents duplicate in-flight loads.
- Force refresh path available.

### Streaming behavior
- Follow-up chat reads SSE chunks from `/api/chat-first`.
- UI appends chunked markdown progressively.
- Final structured payload (if present) is normalized and rendered in structured format.

---

## 10. Complete Tech Stack

| Layer | Technology | Why used |
|---|---|---|
| Frontend framework | Next.js App Router | Server/client split + route handlers in one codebase |
| UI | React + Tailwind + Framer Motion + Lucide | Fast interactive UI and consistent styling/icons |
| State | React hooks + Zustand (legacy/workspace areas) | Local UI flow and specialized legacy state stores |
| Backend | Next.js route handlers (Node runtime where needed) | API logic close to app code |
| Database/Auth | Supabase Postgres + Auth + RLS + Storage | Managed auth/data/storage with policy controls |
| AI | Gemini (`gemini-2.5-flash-lite` / `gemini-2.5-flash`) | Free-tier-compatible structured and multimodal generation |
| Networking | Axios + fetch | API and model HTTP calls |
| Language/tooling | TypeScript, ESLint | Type safety and code quality |

---

## 11. Edge Cases and Failure Handling

- Invalid JSON/input shape -> validation errors.
- Too-short/too-long analysis input -> blocked.
- Invalid UUIDs -> rejected.
- Missing auth for protected data -> denied/redirect.
- Missing migration tables (`analysis_input_imports`, follow-up history) -> actionable error text; core generation can still proceed.
- Gemini pool/config failure -> explicit API error; pool exhaustion returns `429` path.
- Changed source input with non-deferred section request -> conflict requiring overview regeneration.
- Stale deferred sections detected by hash mismatch; regenerated selectively.
- History retrieval supports normalized and legacy storage formats.
- Export failure (popup blocked/unsupported path) -> user-visible error.

---

## 12. Setup and Installation

### Prerequisites
- Node `>=20.19.0`
- Supabase project
- Gemini API key(s)

### Environment (`.env.local` from `.env.example`)
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_IMPORTS_BUCKET=analysis-imports
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash-lite
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_optional
```

### Commands
```bash
npm install
npm run dev
npm run lint
npm run type-check
npm run build
```

### Database setup
Apply SQL migrations in Supabase SQL editor, especially:
- `006_non_destructive_persistence_upgrade.sql`
- `008_analysis_sessions_finalize_and_reset.sql`
- `010_analysis_input_imports.sql`
- `011_analysis_followup_history.sql`

### Setup/verification endpoints
- `/setup`
- `/api/setup/verify`
- `/api/health`
- optional setup helpers under `/api/setup/*`

---

## 13. How To Use Product

1. Sign in and create a project.
2. Open project input page.
3. Enter your idea/problem context in manual input.
4. Import supporting material (text/files/screenshots/audio/social snippets).
5. Review/edit extracted import text and merged final prompt.
6. Choose depth (`short`, `medium`, `long`, `extra-long`).
7. Click generate (overview created first).
8. In output page, open sections you need; generate one-by-one.
9. For planning realism, fill cost intake before generating cost/timeline/manpower sections.
10. Ask follow-up questions in chat for prioritized recommendations.
11. Export analysis in desired format.
12. Reopen old sessions from history/analysis selector and regenerate stale parts only.

### What user should expect
- Fast initial overview, then progressive deep analysis.
- Clear section status (generated/missing/stale/loading).
- Structured follow-up answers with actionable bullets.
- Persisted history when migrations are applied.

---

## 14. Advanced / Unique Features

1. **Section-on-demand AI architecture** (core differentiator): avoids monolithic generation and controls token/runtime cost.
2. **Hash-based freshness model:** stale section detection via `input_hash` + `section_input_hashes`.
3. **Normalized section persistence model:** `analysis_sessions` + `analysis_sections` supports partial regeneration and completion tracking.
4. **Gemini-only free-tier operational guardrails:** active runtime enforces model/provider constraints.
5. **Multimodal import normalization pipeline:** images/audio/docs/social text converge into one analysis-ready prompt path.
6. **Structured JSON-first follow-up chat with markdown streaming:** machine-readable + human-readable answer output in one flow.
7. **Legacy compatibility layer:** normalized and legacy blob analyses coexist so historical data remains usable.
