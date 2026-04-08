# Complete Vercel Deployment Plan - PMCopilot

## Project Overview
- **Framework**: Next.js 16.2.1 with Turbopack
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL)
- **AI Provider**: Google Gemini API
- **Node.js**: >= 20.19.0
- **Database**: Supabase PostgreSQL with Auth

---

## Project Structure
```
pmcopilot/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages layout
│   ├── (dashboard)/              # Protected dashboard routes
│   ├── api/                      # API routes
│   │   ├── analyze/              # AI analysis endpoints
│   │   ├── chat/                 # Chat/streaming endpoints
│   │   ├── health/               # Health check endpoint
│   │   ├── imports/              # File import processing
│   │   ├── setup/                # Initial setup endpoints
│   │   └── projects/             # Project management
│   ├── project/                  # Project page
│   ├── workspace/                # Workspace UI
│   └── layout.tsx                # Root layout
├── components/                   # React components
│   ├── workspace/                # Workspace components
│   ├── cards/                    # Draggable cards
│   ├── chat/                     # Chat UI
│   ├── dnd/                      # Drag-drop system
│   └── ui/                       # Base UI components
├── stores/                       # Zustand state management
├── hooks/                        # Custom React hooks
│   └── useChatStream.ts          # Streaming chat hook
├── lib/                          # Utilities & config
│   └── supabase/                 # Supabase client setup
├── public/                       # Static assets
├── scripts/                      # Setup/migration scripts
├── services/                     # Service layer
├── types/                        # TypeScript types
├── utils/                        # Helper functions
├── package.json                  # Dependencies
├── next.config.js                # Next.js config
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind CSS config
└── .env.example                  # Environment template
```

---

## Step-by-Step Deployment Plan

### Phase 1: Pre-Deployment Verification
**Tasks:**
1. ✅ Verify code quality and build locally
2. ✅ Confirm all dependencies are installed
3. ✅ Review environment variables
4. ✅ Ensure git repository is ready

**Commands to Run:**
```bash
# 1. Check Node.js version
node --version  # Should be >= 20.19.0

# 2. Install dependencies (if not done)
npm install

# 3. Run type checking
npm run type-check

# 4. Run linting
npm run lint

# 5. Build locally
npm run build

# 6. Verify git status (clean working directory)
git status
```

### Phase 2: Git Repository Setup
**Tasks:**
1. Ensure repository is pushed to GitHub/GitLab/Bitbucket
2. Clean up untracked/uncommitted files
3. Verify main branch is up-to-date

**Commands:**
```bash
# 1. Add all current changes
git add .

# 2. Create a commit for deployment prep
git commit -m "prep: prepare for Vercel deployment"

# 3. Push to remote
git push origin main

# 4. Verify remote is updated
git log --oneline -5
```

---

### Phase 3: Vercel Account & Project Setup

**A. Create/Access Vercel Account**
- Go to https://vercel.com/
- Sign up or log in (use GitHub/GitLab/Bitbucket account for easier setup)
- Create a new project or import existing one

**B. Import Project to Vercel**
- Click "New Project"
- Connect your Git repository (GitHub/GitLab/Bitbucket)
- Select `pmcopilot` repository
- Configure project settings:
  - **Framework**: Next.js (should auto-detect)
  - **Root Directory**: `.` (use project root)
  - **Build Command**: `npm run build`
  - **Output Directory**: `.next` (auto-detected)
  - **Install Command**: `npm install`
  - **Node.js Version**: 20.x

---

### Phase 4: Environment Variables Setup

**A. Gather Required Variables**

Collect these from your services:

1. **Supabase Variables** (from https://app.supabase.com/):
   ```
   NEXT_PUBLIC_SUPABASE_URL: <your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY: sb_anon_<key>
   SUPABASE_SERVICE_ROLE_KEY: <optional, for setup flows>
   ```

2. **Gemini API Keys** (from https://makersuite.google.com/app/apikey):
   ```
   GEMINI_API_KEY_1: <key>
   GEMINI_API_KEY_2: <key>
   ... (up to 10 keys for round-robin)
   ```
   OR use single key:
   ```
   GEMINI_API_KEY: <key>
   ```

3. **App Configuration**:
   ```
   NEXT_PUBLIC_APP_URL: https://<your-vercel-domain>.vercel.app
   GEMINI_MODEL: gemini-2.5-flash-lite (or gemini-2.5-flash)
   NEXT_PUBLIC_IMPORTS_BUCKET: analysis-imports
   NODE_ENV: production
   ```

**B. Add Variables to Vercel**

1. In Vercel Project Dashboard → Settings → Environment Variables
2. For each variable:
   - **Name**: (exact name from above)
   - **Value**: (the secret/value)
   - **Environments**: Select `Production`, optionally `Preview` and `Development`
   - Click "Add"

3. Add all variables listed below:

| Variable Name | Value | Environments | Secret? |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | All | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | All | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | All | No |
| `GEMINI_API_KEY_1` | Your Gemini Key | All | Yes |
| `GEMINI_API_KEY_2` | (optional) | All | Yes |
| `GEMINI_API_KEY_3` | (optional) | All | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (optional) | All | Yes |
| `GEMINI_MODEL` | `gemini-2.5-flash-lite` | All | No |
| `NEXT_PUBLIC_IMPORTS_BUCKET` | `analysis-imports` | All | No |

---

### Phase 5: Supabase Configuration

**A. Update Authentication URLs**

1. Go to Supabase Dashboard → Project → Authentication → URL Configuration

2. Set **Site URL**:
   ```
   https://<your-vercel-domain>.vercel.app
   ```

3. Add **Redirect URLs**:
   ```
   https://<your-vercel-domain>.vercel.app/auth/callback
   https://<your-vercel-domain>.vercel.app
   https://<your-vercel-domain>.vercel.app/dashboard
   ```

4. For preview deployments (optional):
   ```
   https://your-project-*.vercel.app/auth/callback
   ```

**B. Storage Bucket Setup** (if using file imports)

1. Go to Supabase Dashboard → Storage → Buckets
2. Create bucket: `analysis-imports` (or your configured name)
3. Set bucket policies (allow authenticated users to upload/download)

**C. Run any pending migrations**

If you have database migrations:
```bash
# Check for pending migrations in Supabase
# Usually done through Supabase dashboard or migration scripts
```

---

### Phase 6: Deploy to Vercel

**Option A: Deploy from Vercel Dashboard (Recommended)**

1. In Vercel Dashboard, click "Deploy"
2. Vercel will:
   - Clone your GitHub repository
   - Install dependencies
   - Run `npm run build`
   - Deploy to production
3. Wait for build to complete (usually 2-5 minutes)
4. View live site URL (deployed-url.vercel.app)

**Option B: Deploy using Vercel CLI (Alternative)**

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Follow prompts to link to project
```

---

### Phase 7: Post-Deployment Verification

**A. Test Deployed Application**

```bash
# 1. Check health endpoint
curl https://your-app.vercel.app/api/health

# 2. Verify Supabase connection
curl https://your-app.vercel.app/api/setup/verify
```

**B. Manual Testing in Browser**

| Route | What to Test | Expected |
|---|---|---|
| `https://your-app.vercel.app/` | Home page loads | Page renders correctly |
| `https://your-app.vercel.app/login` | Login page loads | Login form visible |
| `/signup` | Account creation | Signup form visible |
| `/auth/callback` | OAuth redirect | Redirects to dashboard on success |
| `/dashboard` | Protected route | Shows dashboard (redirects to login if not authenticated) |
| `/api/health` | API health check | Returns `{ status: "ok" }` |
| `/project` | Create/list projects | CRUD operations work |
| `/workspace` | Workspace UI loads | Drag-drop, chat functional |

**C. Verify Environment Variables are Working**

- Check Gemini API calls work (ask chat something)
- Check analytics/reporting features
- Check file imports work (if applicable)

**D. Check Vercel Logs**

1. In Vercel Dashboard → Deployments → Select latest deployment
2. View build logs for any warnings/errors
3. View function logs to check API routes

---

### Phase 8: Domain Setup (Optional)

**If using custom domain:**

1. In Vercel Project → Settings → Domains
2. Add your domain name
3. Update DNS records at your domain provider:
   - Point to Vercel nameservers, OR
   - Add CNAME record to `<your-vercel-app>.vercel.app`

4. Update Supabase Auth URLs:
   - Change Site URL to `https://yourdomain.com`
   - Change Redirect URLs to include `https://yourdomain.com/auth/callback`

---

### Phase 9: Continuous Deployment Setup

**Automatic Deploys**

Vercel automatically deploys when:
- Push to `main` branch → Production
- Push to other branches → Preview deployments
- Pull requests → PR preview

**Configure Build Settings (Optional)**

1. In Vercel Projects Settings → Build & Development:
   - Configure build command
   - Configure environment variables per branch
   - Set cron jobs if needed

---

## Troubleshooting Guide

### Build Fails

**Error: "Missing environment variables"**
- ✅ Solution: Verify ALL required env vars in Vercel Settings
- Ensure no typos in variable names
- Re-trigger deployment after adding variables

**Error: "Node version incompatible"**
- ✅ Solution: Set Node.js 20.x in Vercel Settings → Node.js Version

**Error: "TypeScript compilation failed"**
- ✅ Solution: Run locally first: `npm run type-check`

### Runtime Issues

**Error: "Cannot find module '@supabase/supabase-js'"**
- ✅ Solution: Run `npm install` locally, commit package-lock.json

**Gemini API timeout**
- ✅ Solution: Verify `GEMINI_API_KEY` is set and valid
- Check Gemini API quota
- Consider reducing query complexity

**Supabase auth redirect loop**
- ✅ Solution: Verify Supabase Auth URLs match deployed domain exactly
- Re-deploy after updating Supabase URLs
- Clear browser cookies

### Performance Issues

**Slow initial load**
- ✅ Check Vercel analytics at Dashboard → Analytics
- Review API response times
- Consider upgrading Supabase plan if database queries slow

**Function timeouts**
- ✅ AI routes have 60s timeout for Vercel Pro
- Consider: streaming responses, chunking data, pagination

---

## Rollback Plan

**If something goes wrong:**

1. **Revert to previous deployment:**
   - Vercel Dashboard → Deployments
   - Click previous deployment → "...restore"

2. **Revert code change:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Quick disable problematic route:**
   - Edit `.vercel/config.json` or environment
   - Redeploy with fallback

---

## Maintenance Checklist

- [ ] Set up monitoring alerts in Vercel
- [ ] Configure error notification (Slack/email)
- [ ] Schedule regular backups of Supabase
- [ ] Monitor deployment logs weekly
- [ ] Keep dependencies updated (`npm audit`, `npm update`)
- [ ] Review Vercel usage/billing monthly
- [ ] Test disaster recovery quarterly

---

## Quick Reference

### Vercel Dashboard Links
- Project Settings: `https://vercel.com/dashboard/project/[project-id]/settings`
- Environment Variables: `https://vercel.com/dashboard/project/[project-id]/settings/environment-variables`
- Deployments: `https://vercel.com/dashboard/project/[project-id]/deployments`

### Supabase Dashboard Links
- Project Settings: `https://app.supabase.com/project/[project-id]/settings/general`
- Auth Configuration: `https://app.supabase.com/project/[project-id]/auth/url-configuration`
- Database: `https://app.supabase.com/project/[project-id]/editor`

### Useful Commands
```bash
# Local verification before deploy
npm install && npm run type-check && npm run lint && npm run build

# View build in production mode
npm run build && npm start

# Check environment setup
npm run setup:wizard

# Health check (local)
curl http://localhost:3000/api/health
```

---

## Estimated Timeline

| Phase | Time | Notes |
|---|---|---|
| Phase 1: Pre-deployment | 10-15 min | Run checks locally |
| Phase 2: Git setup | 2-3 min | Push to remote |
| Phase 3: Vercel setup | 5 min | Create project |
| Phase 4: Env variables | 10-15 min | Add secrets |
| Phase 5: Supabase config | 5-10 min | Update auth URLs |
| Phase 6: Deploy | 3-5 min | Build + deploy |
| Phase 7: Verify | 10-15 min | Test all features |
| **Total** | **45-65 min** | First-time deploy |

---

## Success Checklist

- [ ] All environment variables added to Vercel
- [ ] Supabase auth URLs updated
- [ ] Project builds successfully on Vercel
- [ ] Homepage loads at deployed URL
- [ ] Login/signup flow works
- [ ] Dashboard is accessible after login
- [ ] Chat/AI features respond correctly
- [ ] File imports work (if applicable)
- [ ] Analytics/reports generate correctly
- [ ] No critical errors in Vercel logs
- [ ] Mobile responsiveness verified
- [ ] API endpoints respond correctly

---

Done! Once all steps are complete, your app will be live on Vercel.
