# PMCopilot Setup Guide

## Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Verify Environment Variables
Your `.env.local` is already configured with:
- Supabase credentials
- OpenRouter API key

### Step 3: Start Development Server
```bash
npm run dev
```

Your app will be running at **http://localhost:3000**

### Step 4: Initialize Database
Open a new terminal and run:
```bash
curl -X POST http://localhost:3000/api/setup-db
```

Or visit in your browser:
```
http://localhost:3000/api/setup-db
```

Expected response:
```json
{
  "success": true,
  "data": {
    "results": {
      "PROJECTS": true,
      "FEEDBACK": true,
      "ANALYSES": true
    },
    "message": "Database setup completed successfully"
  }
}
```

### Step 5: Test the API

Test the AI analysis endpoint:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"feedback": "The app is great but needs dark mode"}'
```

---

## Troubleshooting

### Issue: Port 3000 already in use
```bash
# Kill the process using port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

### Issue: Database tables not creating
1. Check Supabase connection:
```bash
curl https://xzsxqztghqdwqwbiykzj.supabase.co
```

2. Verify environment variables are loaded:
```typescript
// In any API route, check:
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
```

3. Manual table creation (if needed):
   - Go to Supabase Dashboard
   - SQL Editor
   - Copy SQL from `utils/constants.ts` (DB_SCHEMA)
   - Execute

### Issue: TypeScript errors
```bash
npm run type-check
```

Fix any type errors before running the app.

### Issue: AI API not working
1. Verify OpenRouter API key is valid
2. Check network connectivity
3. Fallback to Puter.js will happen automatically

---

## Development Workflow

### 1. Creating a New Service

```typescript
// services/myservice.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export class MyService {
  async myMethod(supabase: SupabaseClient, data: any) {
    logger.info('Method started');
    // Your logic here
  }
}

export const myService = new MyService();
```

### 2. Creating a New API Route

```typescript
// app/api/my-endpoint/route.ts
import { NextRequest } from 'next/server';
import { supabase, requireAuth } from '@/lib/supabaseClient';
import { handleError, successResponse } from '@/lib/errorHandler';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(supabase);
    const body = await request.json();

    // Your logic here

    return successResponse(data);
  } catch (error) {
    return handleError(error);
  }
}
```

### 3. Adding New Types

```typescript
// types/index.ts
export interface MyType {
  id: string;
  name: string;
  created_at: string;
}
```

---

## Environment Variables

### Required Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://xzsxqztghqdwqwbiykzj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_PyDjSmTmRP6nCrCz-JqPqQ_hg6Hyr2O
OPENROUTER_API_KEY=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
```

### Optional Variables
```env
NODE_ENV=development
```

---

## Testing Checklist

- [ ] Dev server starts without errors
- [ ] Database setup endpoint works
- [ ] AI analyze endpoint returns results
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser

---

## Production Deployment

### Vercel (Recommended)

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

2. **Deploy on Vercel**:
   - Connect GitHub repository
   - Vercel auto-detects Next.js
   - Add environment variables
   - Deploy

3. **Environment Variables on Vercel**:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`

### Other Platforms

**AWS Amplify**:
- Connect GitHub
- Configure build settings
- Add environment variables

**Railway**:
- Connect GitHub
- Add environment variables
- Deploy

---

## Database Management

### Backup
```bash
# Using Supabase CLI
supabase db dump --db-url "postgresql://..."
```

### Migrations
```bash
# Create migration
supabase migration new my_migration

# Apply migration
supabase migration up
```

---

## Monitoring & Logs

### Development
Logs are output to console with timestamps and metadata.

### Production
Consider integrating:
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Datadog** - Application monitoring
- **Vercel Analytics** - Performance monitoring

---

## Security Checklist

- [x] Environment variables validated
- [x] Input sanitization implemented
- [x] SQL injection prevention (Supabase)
- [x] Authentication middleware
- [x] User-scoped data access
- [ ] Rate limiting (TODO)
- [ ] CORS configuration (if needed)
- [ ] API key rotation plan

---

## Performance Optimization

### Current Setup
- ✅ Server-side rendering
- ✅ TypeScript for type safety
- ✅ Efficient database queries
- ✅ Error handling & retry logic

### Future Improvements
- [ ] Redis caching
- [ ] CDN for static assets
- [ ] Database indexing optimization
- [ ] API rate limiting
- [ ] Request batching

---

## Support & Resources

### Documentation
- README.md - Full documentation
- inline code comments
- Type definitions

### Community
- GitHub Issues
- Discord Community (TODO)

### Contact
For urgent issues or questions, contact the development team.

---

**You're all set! Start building amazing features on this solid foundation.**
