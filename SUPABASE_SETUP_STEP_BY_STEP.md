# Supabase Setup / Upgrade Guide - PMCopilot

This guide is for your current state (existing tables already present).

Use these scripts:

1. `scripts/migrations/006_non_destructive_persistence_upgrade.sql`
2. `scripts/migrations/007_project_delete_fk_cascade_fix.sql`
3. `scripts/migrations/008_analysis_sessions_finalize_and_reset.sql`

## 1) Environment variables

Set `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash-lite
```

Restart the app after editing env.

## 2) SQL run order (exact)

In Supabase -> SQL Editor, run in this order:

1. Run `006_non_destructive_persistence_upgrade.sql`
2. Run `007_project_delete_fk_cascade_fix.sql`
3. Run `008_analysis_sessions_finalize_and_reset.sql`

Important:

- No script drops your database or drops tables.
- Script `008` intentionally clears analysis data rows (`analyses`, `analysis_sessions`, `analysis_sections`) so new analyses start fresh.

## 3) Why you see `analyses` and `analysis_sessions`

This is expected, not a naming conflict:

- `analyses` = legacy storage table.
- `analysis_sessions` + `analysis_sections` = new normalized storage.

Current app flow now saves new analysis data in `analysis_sessions` / `analysis_sections`.

## 4) Quick verification queries

### 4.1 Tables exist

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'projects',
    'analyses',
    'analysis_sessions',
    'analysis_sections',
    'feedbacks',
    'profiles',
    'user_settings',
    'support_tickets'
  )
ORDER BY table_name;
```

### 4.2 RLS enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'analyses',
    'analysis_sessions',
    'analysis_sections',
    'feedbacks',
    'profiles',
    'user_settings',
    'support_tickets'
  )
ORDER BY tablename;
```

### 4.3 Project delete FK status

```sql
SELECT
  c.conname AS constraint_name,
  child.relname AS child_table,
  parent.relname AS parent_table,
  c.confdeltype
FROM pg_constraint c
JOIN pg_class child ON child.oid = c.conrelid
JOIN pg_class parent ON parent.oid = c.confrelid
JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
WHERE c.contype = 'f'
  AND child_ns.nspname = 'public'
  AND child.relname = 'analyses'
  AND parent.relname = 'projects';
```

`confdeltype = 'c'` means `ON DELETE CASCADE`.

## 5) App verification checklist

1. Create project from dashboard.
2. Generate analysis.
3. Reopen same project -> output page should show saved analysis history.
4. Generate additional sections -> completion should increase.
5. Delete project -> should succeed without FK error.
6. Save profile/settings/feedback/support entries -> should persist.
