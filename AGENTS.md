# AGENTS.md

## Project rules
- Gemini free-tier only
- No paid fallback providers
- Section-on-demand generation only
- Keep prompts token-safe per section
- Do not generate all sections at once
- Preserve App Router patterns already used in this repo
- Prefer exact fixes over refactors unless refactor is required

## Quality bar
- PRD must contain all 20 sections
- Problem analysis should target 10+ items for rich input
- Features should target 10+ items for rich input
- Ask Question output must render as structured UI, not plain text dump
- Sidebar icons must render correctly in both active and inactive states

## Before finishing
- Run typecheck/lint/tests/build if available
- Summarize file-by-file changes
- Call out any remaining edge cases