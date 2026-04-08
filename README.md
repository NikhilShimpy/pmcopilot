# PMCopilot - Cursor for Product Managers

> **Production-Grade SaaS Foundation** - AI-powered feedback analysis and product insights platform

🌐 **Live Demo:** [https://pmcopilot-rho.vercel.app/](https://pmcopilot-rho.vercel.app/)

## 🎯 Overview

PMCopilot is a comprehensive SaaS platform designed to help Product Managers analyze user feedback using AI. This is the complete foundational architecture built with scalability, modularity, and production-readiness in mind.

## ✨ What's Built

### Core Infrastructure
- ✅ **Next.js 14 App Router** - Modern React framework with TypeScript
- ✅ **Supabase Integration** - Authentication & PostgreSQL database
- ✅ **AI Layer** - OpenRouter (primary) + Puter.js (fallback)
- ✅ **API Architecture** - RESTful endpoints with proper error handling
- ✅ **Type System** - Complete TypeScript type definitions
- ✅ **Logging System** - Structured logging with metadata
- ✅ **Error Handling** - Centralized error management
- ✅ **Environment Config** - Validated environment variables

### Project Structure

```
pmcopilot/
├── app/
│   ├── (auth)/              # Auth-related pages (placeholder)
│   ├── (dashboard)/         # Dashboard pages (placeholder)
│   ├── api/                 # API routes
│   │   ├── setup-db/        # Database initialization
│   │   ├── analyze/         # AI feedback analysis
│   │   ├── projects/        # Project CRUD
│   │   └── feedback/        # Feedback CRUD
│   ├── globals.css          # Tailwind styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Home page
├── components/
│   ├── ui/                  # UI components (ready for implementation)
│   └── shared/              # Shared components
├── lib/
│   ├── supabaseClient.ts    # Supabase client & auth helpers
│   ├── aiClient.ts          # AI client with fallback
│   ├── logger.ts            # Logging utility
│   ├── errorHandler.ts      # Error handling
│   └── config.ts            # Environment config
├── services/
│   ├── ai.service.ts        # AI operations
│   ├── project.service.ts   # Project operations
│   └── feedback.service.ts  # Feedback operations
├── types/
│   └── index.ts             # TypeScript definitions
└── utils/
    ├── constants.ts         # App constants
    └── helpers.ts           # Helper functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository** (if not already in the directory):
```bash
cd d:\projects\pmcopilot
```

2. **Install dependencies**:
```bash
npm install
```

3. **Environment variables are already configured** in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xzsxqztghqdwqwbiykzj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_PyDjSmTmRP6nCrCz-JqPqQ_hg6Hyr2O
OPENROUTER_API_KEY=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
```

4. **Initialize the database**:
```bash
# Start the dev server
npm run dev

# In another terminal, initialize the database
curl -X POST http://localhost:3000/api/setup-db
```

5. **Open your browser**:
```
http://localhost:3000
```

## 📡 API Endpoints

### Database Setup
```bash
POST /api/setup-db
# Initialize database tables

GET /api/setup-db
# Check database status
```

### AI Analysis
```bash
POST /api/analyze
Body: {
  "feedback": "User feedback text here",
  "context": "Optional context",
  "project_id": "Optional project UUID"
}
# Returns: Analysis with sentiment, themes, and insights

GET /api/analyze?project_id=uuid&limit=20&offset=0
# Get analysis history (requires auth)
```

### Projects
```bash
GET /api/projects?limit=20&offset=0
# Get all user projects (requires auth)

POST /api/projects
Body: {
  "name": "Project Name",
  "description": "Optional description"
}
# Create new project (requires auth)

GET /api/projects/[id]
# Get specific project (requires auth)

PUT /api/projects/[id]
Body: {
  "name": "Updated Name",
  "description": "Updated description"
}
# Update project (requires auth)

DELETE /api/projects/[id]
# Delete project (requires auth)
```

### Feedback
```bash
GET /api/feedback?project_id=uuid&limit=20&offset=0
# Get feedback (requires auth)

POST /api/feedback
Body: {
  "project_id": "uuid",
  "content": "Feedback content",
  "source": "Optional source",
  "metadata": {}
}
# Create feedback (requires auth)

GET /api/feedback/[id]
# Get specific feedback (requires auth)

DELETE /api/feedback/[id]
# Delete feedback (requires auth)
```

## 🧪 Testing the API

### Test AI Analysis (No Auth Required)
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "The new feature is great but the UI is confusing. Users are struggling to find the export button."
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "sentiment": "mixed",
    "themes": ["UI/UX", "Feature Feedback", "Usability"],
    "actionableInsights": [
      {
        "category": "UI/UX",
        "insight": "Export button visibility issue",
        "impact": "high",
        "effort": "low",
        "suggestedAction": "Improve button placement and visibility"
      }
    ],
    "summary": "Users appreciate the feature but face UI challenges...",
    "confidence": 0.85
  },
  "message": "Analysis completed successfully"
}
```

## 🏗️ Architecture Highlights

### AI Client (`lib/aiClient.ts`)
- **Primary**: OpenRouter API with Claude 3.5 Sonnet
- **Fallback**: Puter.js for redundancy
- **Features**: Automatic retry, error handling, response normalization

### Error Handling (`lib/errorHandler.ts`)
- Centralized error management
- Custom error types with status codes
- Consistent API response format
- Error logging and tracking

### Services Layer
- **AI Service**: Feedback analysis, batch processing, aggregation
- **Project Service**: CRUD operations with validation
- **Feedback Service**: Feedback management with project association

### Database Schema
```sql
-- Projects table
projects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Feedbacks table
feedbacks (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  content TEXT NOT NULL,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)

-- Analyses table
analyses (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  feedback_id UUID REFERENCES feedbacks(id),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ
)
```

## 🔒 Security Features

- Environment variable validation
- SQL injection prevention (Supabase parameterized queries)
- Input sanitization
- Authentication middleware
- User-scoped data access

## 📊 Logging

Structured logging with levels:
- **info**: General operations
- **warn**: Non-critical issues
- **error**: Critical failures
- **debug**: Development details

Example:
```typescript
import { logger } from '@/lib/logger';

logger.info('Operation started', { userId: '123' });
logger.error('Operation failed', { error: error.message });
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Adding New Features

1. **Define types** in `types/index.ts`
2. **Create service** in `services/`
3. **Build API route** in `app/api/`
4. **Add constants** in `utils/constants.ts`
5. **Update documentation**

## 📝 Type System

Comprehensive TypeScript types for:
- Database models (Project, Feedback, Analysis)
- API requests/responses
- AI operations
- Error handling
- Authentication

## 🎨 Styling

- **Tailwind CSS** configured with custom theme
- **CSS Variables** for light/dark modes
- **Responsive** design utilities
- **Component** library ready

## 🚦 Next Steps

The foundation is complete. Next phases include:

1. **Authentication UI** - Sign up, login, password reset pages
2. **Dashboard** - Project management interface
3. **Analysis Interface** - Feedback submission and analysis view
4. **Data Visualization** - Charts and insights display
5. **Real-time Features** - Live updates and notifications

## 📚 Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Supabase** - Backend & Auth
- **OpenRouter** - AI API
- **Puter.js** - AI fallback
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Zod** - Runtime validation

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute

1. **Fork the Repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/pmcopilot.git
   cd pmcopilot
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow existing code patterns
   - Maintain type safety (TypeScript)
   - Add tests for new features
   - Update documentation
   - Use structured logging

4. **Test Your Changes**
   ```bash
   npm run type-check  # TypeScript check
   npm run lint        # Code linting
   npm run build       # Production build
   ```

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub with:
   - Clear description of changes
   - Screenshots (if UI changes)
   - Link to any related issues

### Contribution Ideas

- 🐛 **Bug Fixes** - Report or fix bugs
- ✨ **Features** - Implement new features from issues
- 📚 **Documentation** - Improve docs, add examples
- 🎨 **UI/UX** - Enhance user interface
- ⚡ **Performance** - Optimize code
- 🧪 **Tests** - Add test coverage
- 🌍 **Translations** - Add i18n support

### Code Standards

- **TypeScript**: Use strict typing, avoid `any`
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS classes only
- **API Routes**: Follow RESTful conventions
- **Error Handling**: Use centralized error handler
- **Logging**: Use structured logger from `lib/logger.ts`

### Need Help?

- 📖 Check existing issues and discussions
- 💬 Ask questions in GitHub Discussions
- 📧 Reach out to the maintainer (see Author section)

## 🙌 Author

**Nikhil Shimpy**  
- 💼 [LinkedIn](https://www.linkedin.com/in/nikhilshimpy/)  
- 🐙 [GitHub](https://github.com/NikhilShimpy)  
- 📸 [Instagram](https://www.instagram.com/nikhilshimpyy/?hl=en)
- 🔗 [LinkTree](https://linktr.ee/nikhilshimpyy)
- 🖥️ [Portfolio](https://nikhilshimpyyportfolio.vercel.app/)

## 📄 License

MIT License - feel free to use this project for learning and building!

## 🔗 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenRouter API](https://openrouter.ai/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Built with ❤️ for Product Managers**

*This is the foundation of a YC-worthy startup. Code quality and architecture are production-ready.*
