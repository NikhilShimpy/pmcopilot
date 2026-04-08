# Deployment Guide (Vercel + Supabase)

This project is configured for Next.js App Router deployment on Vercel.

## 1. Prerequisites

- Node.js 20.9.0 or later
- npm 10+
- A Supabase project
- A Vercel account connected to your Git provider

## 2. Build Commands

Vercel should use the default Next.js settings:

- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `.next` (auto)
- Root Directory: repository root

## 3. Required Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

### Required

- `NEXT_PUBLIC_APP_URL` = your deployed app URL (for example `https://your-app.vercel.app`)
- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key
- One of:
  - `GEMINI_API_KEY`
  - `GEMINI_API_KEYS`
  - `GEMINI_API_KEY_1` (and additional numbered keys)

### Optional

- `NEXT_PUBLIC_IMPORTS_BUCKET` (default: `analysis-imports`)
- `GEMINI_MODEL` (default: `gemini-2.5-flash-lite`)
- `SUPABASE_SERVICE_ROLE_KEY` (for setup/admin flows only)

## 4. Supabase Production Configuration

In Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://your-app-domain`
- Redirect URL: `https://your-app-domain/auth/callback`

Recommended for preview deployments:

- Add additional redirect URLs for preview domains you trust.

## 5. Runtime Notes

- Long-running AI routes are configured for Node.js runtime with explicit function duration limits.
- Upload processing is capped to 4MB payloads for Vercel serverless reliability.
- No local-disk upload storage is required; upload metadata supports Supabase Storage.

## 6. Deploy Steps

1. Push your branch to GitHub/GitLab/Bitbucket.
2. In Vercel, create/import the project from that repository.
3. Add environment variables listed above for `Production` (and `Preview` if desired).
4. Trigger deploy.
5. After deployment, update Supabase auth Site URL + Redirect URL to your deployed domain.
6. Re-deploy once if you changed `NEXT_PUBLIC_APP_URL`.

## 7. Verify Deployment

After first deploy, validate:

- `/` loads correctly
- `/login` and `/signup` complete auth flow
- `/auth/callback` returns users to dashboard
- `/dashboard` route protection works
- `/api/health` returns healthy checks
- `/api/setup/verify` reflects your production callback URL

## 8. Troubleshooting

### Build fails with missing env variables

Ensure all required variables are set in Vercel before building.

### Supabase auth redirect errors

Confirm both Site URL and Redirect URL include your deployed domain exactly.

### API timeout errors on AI routes

Reduce payload size/depth or verify your plan limits. Routes are already capped for serverless compatibility.

### Import/file processing fails

Keep file uploads at 4MB or less per request payload.

## 9. Local Validation Before Deploy

Run:

```bash
npm install
npm run type-check
npm run lint
npm run build
```
